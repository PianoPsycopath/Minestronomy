import { clamp, cap, cos } from "../core/math.js";
import { PLN, COMETS, VIS } from "../config/constants.js";
import {
  calc,
  sepEq,
  eq,
  altaz,
  zToLatitude,
  cometCalc,
  cometVisibility,
  solarTerms
} from "../core/astronomy.js";

const PLANETS = Object.keys(PLN);

// Tunables
export const CONJ_RADIUS = 1;   // deg: every planet gets a circle this big; touching circles (sep <= 2x) = one conjunction group
const MM_MIN_SEP = 6;           // deg: moon-planet passes closer than max(this, disc limit + 3) are listed
const COMET_MIN_BRIGHT = 0.03;  // a comet gets a bar on days its rendered brightness exceeds this
const OBS_HALF_WINDOW = 0.6;    // days either side of the exact event searched for a time you can actually see it

export const EVENT_KINDS = {
  lun: { label: "Lunar Eclipses", color: "#d6453d" },
  sol: { label: "Solar Eclipses", color: "#e69a00" },
  mm: { label: "Moon–Planet", color: "#7a5cff" },
  pp: { label: "Planet–Planet", color: "#00a8a8" },
  opp: { label: "Oppositions & Elongations", color: "#2e9d62" },
  com: { label: "Comets", color: "#3a8dde" }
};

export function scan(fn, t0, t1, step, thr) {
  const out = [];
  let a = fn(t0);
  let b = fn(t0 + step);
  for (let x = t0 + step; x < t1; x += step) {
    const c = fn(x + step);
    if (b < a && b <= c && b < thr) out.push({ t: x, v: b });
    a = b;
    b = c;
  }
  return out;
}

// Local minima of several pre-sampled series at once (one calc() per sample instead of one per series).
function minimaOf(series, t0, step, thr) {
  const out = [];
  for (let i = 0; i < series.length; i++) {
    const v = series[i];
    for (let k = 1; k < v.length - 1; k++) {
      if (v[k] < v[k - 1] && v[k] <= v[k + 1] && v[k] < (Array.isArray(thr) ? thr[i] : thr)) {
        out.push({ i, t: t0 + k * step, v: v[k] });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------
// Visibility helpers. A body is "vis" when above the horizon and the sky is dark enough for it (planets use
// the pack's own VIS sun-altitude window, 50% point), "day" when above the horizon but washed out, "down"
// when below the horizon.
// ---------------------------------------------------------------------------------------------------------
const RANK = { vis: 0, day: 1, down: 2 };
const posOf = (s, b) => (b === "sun" ? s.sun : b === "moon" ? s.moon : s.pl[b]);

function bodyState(s, phi, sunAlt, b) {
  const a = altaz(posOf(s, b), s, phi);
  let st;
  if (a.alt < 0) st = "down";
  else if (b === "sun") st = "vis";
  else if (b === "moon") st = sunAlt > -3 ? "day" : "vis";
  else {
    const v = VIS[b];
    st = clamp((v[1] - sunAlt) / (v[1] - v[0]), 0, 1) >= 0.5 ? "vis" : "day";
  }
  return { st, alt: a.alt, az: a.az };
}

function evalBodies(s, phi, sunAlt, bodies) {
  let state = "vis";
  let minAlt = 90;
  let first = null;
  for (const b of bodies) {
    const r = bodyState(s, phi, sunAlt, b);
    if (!first) first = r;
    if (RANK[r.st] > RANK[state]) state = r.st;
    minAlt = Math.min(minAlt, r.alt);
  }
  return { state, alt: first.alt, az: first.az, minAlt, sunAlt };
}

export function visibilityOf(ev, t, Z) {
  const s = calc(t, Z);
  const phi = zToLatitude(Z);
  const sunAlt = altaz(s.sun, s, phi).alt;
  return evalBodies(s, phi, sunAlt, ev.bodies);
}

// Look around the exact event time for the moment you can really see all the bodies (dark enough sky, all
// above 3 deg) that minimises metric(s, t). Returns null when there is no such moment.
function refineVisible(bodies, tc, Z, metric) {
  const phi = zToLatitude(Z);
  let best = null;
  for (let t = tc - OBS_HALF_WINDOW; t <= tc + OBS_HALF_WINDOW + 1e-9; t += 1 / 144) {
    const s = calc(t, Z);
    const r = evalBodies(s, phi, altaz(s.sun, s, phi).alt, bodies);
    if (r.state !== "vis" || r.minAlt < 3) continue;
    const m = metric(s, t);
    if (!best || m < best.m) best = { t, m };
  }
  return best;
}

// ---------------------------------------------------------------------------------------------------------
// Comets
//
// Forecast bars: for every day we sample the comet at noon and mark it present when its rendered brightness is
// above COMET_MIN_BRIGHT. Consecutive days merge into a span; spans are packed into lanes so overlapping comets
// stack under the day cells. Each span also gets its peak: the best moment to actually see it (brightness only
// counts while above the horizon, with a strong preference for a dark sky).
// ---------------------------------------------------------------------------------------------------------
function cometSky(C, t, phi) {
  const { lm, ls, er } = solarTerms(t);
  const s = { tod: t - Math.floor(t), lm };
  const c = cometCalc(C, t, ls, er);
  const sunAlt = altaz(eq(ls, 0), s, phi).alt;
  const { alt, az } = altaz(c, s, phi);
  const vis = cometVisibility(c.bright, sunAlt, C);
  const dark = 0.25 + 0.75 * clamp(-sunAlt / 12, 0, 1);
  const score = alt > 0 ? c.bright * vis * clamp(alt / 15, 0, 1) * dark : 0;
  return { t, alt, az, sunAlt, elong: c.elong, bright: c.bright, score };
}

const peakCache = new Map();

// Best moment to see a comet inside [d0, d1] (inclusive days). Coarse pass over the span, then refine.
export function cometBestView(key, d0, d1, Z) {
  const ck = `${key}|${d0}|${d1}|${Z}`;
  const hit = peakCache.get(ck);
  if (hit) return hit;

  const C = COMETS[key];
  const phi = zToLatitude(Z);
  let best = null;
  let brightest = null;
  const consider = r => {
    if (!best || r.score > best.score) best = r;
    if (!brightest || r.bright > brightest.bright) brightest = r;
  };

  const step = Math.max(1, Math.ceil((d1 - d0) / 200));
  for (let d = d0; d <= d1; d += step) {
    for (let h = 0; h < 24; h += 6) consider(cometSky(C, d + h / 24, phi));
  }
  if (best.score > 0) {
    const c0 = best.t;
    for (let x = c0 - step; x <= c0 + step; x += 1 / 24) consider(cometSky(C, x, phi));
    const c1 = best.t;
    for (let m = -90; m <= 90; m += 10) consider(cometSky(C, c1 + m / 1440, phi));
  }
  const out = best.score > 0 ? { ...best, visible: true } : { ...brightest, visible: false };
  peakCache.set(ck, out);
  return out;
}

export function findCometSpans(d0, d1, Z) {
  const LIM = 900; // scan past the edges so a span that crosses them keeps its true extent
  const spans = [];
  for (const key of Object.keys(COMETS)) {
    const C = COMETS[key];
    let seg = null;
    const push = () => {
      if (seg && seg.d1 >= d0 && seg.d0 < d1) spans.push(seg);
      seg = null;
    };
    for (let d = d0 - LIM; d < d1 + LIM; d++) {
      const { ls, er } = solarTerms(d + 0.5);
      const b = cometCalc(C, d + 0.5, ls, er).bright;
      if (b > COMET_MIN_BRIGHT) {
        if (!seg) seg = { key, d0: d, d1: d, bright: b };
        else {
          seg.d1 = d;
          seg.bright = Math.max(seg.bright, b);
        }
      } else push();
    }
    push();
  }

  // Greedy lane packing: a lane is free once its last span has ended.
  spans.sort((a, b) => a.d0 - b.d0 || a.key.localeCompare(b.key));
  const laneEnd = [];
  for (const sp of spans) {
    let lane = laneEnd.findIndex(end => end < sp.d0);
    if (lane < 0) lane = laneEnd.length;
    laneEnd[lane] = sp.d1;
    sp.lane = lane;
    const pk = cometBestView(sp.key, sp.d0, sp.d1, Z);
    sp.peakT = pk.t;
    sp.peakVisible = pk.visible;
  }
  return spans;
}

// Next peak views of the comets after day `from`, soonest first.
function nextCometPeaks(from, count, Z) {
  const out = [];
  for (const key of Object.keys(COMETS)) {
    const C = COMETS[key];
    const w = C.window != null ? C.window : C.period / 2 - 3;
    let n = Math.ceil((from - w - C.perihelionDay) / C.period);
    const returns = C.period < 800 ? 3 : 1;
    for (let i = 0; i < returns; i++, n++) {
      const c = C.perihelionDay + n * C.period;
      let first = null;
      let last = null;
      for (let d = Math.max(from, Math.floor(c - w)); d <= Math.ceil(c + w); d++) {
        const { ls, er } = solarTerms(d + 0.5);
        if (cometCalc(C, d + 0.5, ls, er).bright > COMET_MIN_BRIGHT) {
          if (first === null) first = d;
          last = d;
        }
      }
      if (first === null) continue;
      const pk = cometBestView(key, first, last, Z);
      out.push({
        kind: "com",
        t: pk.t,
        key,
        d0: first,
        d1: last,
        title: key === "comet" ? "Comet Peak View" : `${C.label} Comet Peak View`,
        sub: pk.visible ? `Alt ${pk.alt.toFixed(0)}° • Elong ${pk.elong.toFixed(0)}°` : "Never above horizon here",
        target: { type: "comet", comet: key },
        visible: pk.visible
      });
    }
  }
  return out.sort((a, b) => a.t - b.t).slice(0, count);
}

// ---------------------------------------------------------------------------------------------------------
// Planet groups. Every planet is a CONJ_RADIUS circle; circles that touch are chained into one group, so four
// planets bunched together become a single "Venus, Mars, Jupiter & Saturn" event instead of several pairs.
// ---------------------------------------------------------------------------------------------------------
function planetComponents(s) {
  const n = PLANETS.length;
  const parent = PLANETS.map((_, i) => i);
  const find = i => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (sepEq(s.pl[PLANETS[i]], s.pl[PLANETS[j]]) <= 2 * CONJ_RADIUS) parent[find(i)] = find(j);
    }
  }
  const groups = new Map();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(PLANETS[i]);
  }
  return [...groups.values()].filter(g => g.length >= 2);
}

function spreadOf(members, s) {
  let m = 0;
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) m = Math.max(m, sepEq(s.pl[members[i]], s.pl[members[j]]));
  }
  return m;
}

// Sky-plane offsets in degrees (east to the left, like looking up), centred on the group.
function offsetsOf(members, s) {
  const ref = s.pl[members[0]];
  const pts = members.map(p => {
    const q = s.pl[p];
    const dra = ((q.ra - ref.ra + 540) % 360) - 180;
    return { planet: p, x: -dra * cos(ref.dec), y: q.dec - ref.dec };
  });
  const mx = pts.reduce((a, o) => a + o.x, 0) / pts.length;
  const my = pts.reduce((a, o) => a + o.y, 0) / pts.length;
  return pts.map(o => ({ planet: o.planet, x: o.x - mx, y: o.y - my }));
}

const nameList = ms => (ms.length === 2 ? `${cap(ms[0])} & ${cap(ms[1])}` : `${ms.slice(0, -1).map(cap).join(", ")} & ${cap(ms[ms.length - 1])}`);

// ---------------------------------------------------------------------------------------------------------
// Every event whose time falls in days [d0, d1). `cats` is a Set of kinds ("lun","sol","mm","pp","opp") plus
// optionally "vis" (drop moon/planet events that can't be seen from the ground at any point near the event).
// Moon/planet events are moved to the best moment you can actually see them.
// ---------------------------------------------------------------------------------------------------------
export function findEventsInRange({ d0, d1, Z, disc, md, cats }) {
  const a = d0 - 1; // pad so extrema at the very edge of the range are still bracketed
  const b = d1 + 1;
  const want = k => !cats || cats.has(k);
  const visibleOnly = !!cats && cats.has("vis");
  const out = [];

  if (want("lun")) {
    for (const q of scan(x => calc(x, Z).ecl_d, a, b, 0.05, 0.96)) {
      out.push({
        kind: "lun",
        t: q.t,
        v: q.v,
        bodies: ["moon"],
        title: q.v < 0.44 ? "Total Lunar Eclipse" : "Partial Lunar Eclipse",
        sub: `Umbra dist ${q.v.toFixed(2)}°`,
        target: { type: "moon" }
      });
    }
  }

  if (want("sol")) {
    for (const q of scan(x => calc(x, Z).sep, a, b, 0.04, 1.2)) {
      out.push({
        kind: "sol",
        t: q.t,
        v: q.v,
        bodies: ["sun"],
        title: q.v < 0.5 ? "Total / Overlap Eclipse" : "Partial Solar Eclipse",
        sub: `Separation ${q.v.toFixed(2)}°`,
        target: { type: "sun" }
      });
    }
  }

  if (want("mm")) {
    const step = 0.1;
    const n = Math.ceil((b - a) / step) + 2;
    const series = PLANETS.map(() => []);
    for (let k = 0; k < n; k++) {
      const s = calc(a + k * step, Z);
      PLANETS.forEach((p, i) => series[i].push(sepEq(s.moon, s.pl[p])));
    }
    const lim = disc / 2 + md / 2;
    const maxSep = Math.max(MM_MIN_SEP, lim + 3);
    for (const q of minimaOf(series, a, step, maxSep)) {
      const p = PLANETS[q.i];
      const bodies = ["moon", p];
      const r = refineVisible(bodies, q.t, Z, s => sepEq(s.moon, s.pl[p]));
      const ok = !!r && r.m <= maxSep;
      const v = ok ? r.m : q.v;
      out.push({
        kind: "mm",
        t: ok ? r.t : q.t,
        v,
        visible: ok,
        planet: p,
        bodies,
        title: `Moon & ${cap(p)} ${v < lim ? "Occultation" : "Conjunction"}`,
        sub: `Separation ${v.toFixed(2)}° at best view`,
        target: { type: "planet", planet: p }
      });
    }
  }

  if (want("pp")) {
    const step = 0.25;
    const n = Math.ceil((b - a) / step) + 2;
    const chains = [];
    for (let k = 0; k < n; k++) {
      const t = a + k * step;
      const s = calc(t, Z);
      for (const comp of planetComponents(s)) {
        const sp = spreadOf(comp, s);
        let ch = chains.find(c => k - c.lastK <= 2 && comp.some(p => c.set.has(p)));
        if (!ch) {
          ch = { set: new Set(), best: null, lastK: k };
          chains.push(ch);
        }
        comp.forEach(p => ch.set.add(p));
        ch.lastK = k;
        const bst = ch.best;
        if (!bst || comp.length > bst.members.length || (comp.length === bst.members.length && sp < bst.spread)) {
          ch.best = { t, members: comp, spread: sp };
        }
      }
    }
    for (const ch of chains) {
      const { members, t } = ch.best;
      const r = refineVisible(members, t, Z, s => spreadOf(members, s));
      const tt = r ? r.t : t;
      const s = calc(tt, Z);
      const spread = spreadOf(members, s);
      out.push({
        kind: "pp",
        t: tt,
        v: spread,
        visible: !!r,
        members,
        planets: members,
        bodies: members,
        offsets: offsetsOf(members, s),
        title: `${nameList(members)} Conjunction`,
        sub: members.length === 2 ? `Separation ${spread.toFixed(2)}°` : `${members.length} planets within ${spread.toFixed(1)}°`,
        target: { type: "planet", planet: members[0] }
      });
    }
  }

  if (want("opp")) {
    for (const pn of PLANETS) {
      const inner = pn === "mercury" || pn === "venus";
      const hits = inner
        ? scan(x => -Math.abs(calc(x, Z).pl[pn].elong), a, b, 0.5, -10)
        : scan(x => 180 - Math.abs(calc(x, Z).pl[pn].elong), a, b, 0.5, 3);
      for (const q of hits) {
        const r = refineVisible([pn], q.t, Z, (s, t) => Math.abs(t - q.t));
        out.push({
          kind: "opp",
          t: r ? r.t : q.t,
          v: q.v,
          visible: !!r,
          planet: pn,
          bodies: [pn],
          title: inner ? `${cap(pn)} Max Elongation` : `${cap(pn)} Opposition`,
          sub: inner ? `Elongation ${(-q.v).toFixed(1)}°` : `Opposition delta ${q.v.toFixed(1)}°`,
          target: { type: "planet", planet: pn }
        });
      }
    }
  }

  const res = out.filter(e => e.t >= d0 && e.t < d1 && !(visibleOnly && e.visible === false));
  for (const e of res) e.vis = visibilityOf(e, e.t, Z);
  return res.sort((x, y) => x.t - y.t);
}

// The next `count` events of one kind on or after day `from`, searched forward in chunks.
export function findNextEvents({ kind, from, count, Z, disc, md, visibleOnly }) {
  if (kind === "com") return nextCometPeaks(from, count, Z);
  const chunk = { lun: 180, sol: 120, mm: 90, pp: 240, opp: 400 }[kind] || 120;
  const cats = new Set([kind]);
  if (visibleOnly) cats.add("vis");
  const out = [];
  for (let d = from; out.length < count && d < from + 8000; d += chunk) {
    out.push(...findEventsInRange({ d0: d, d1: d + chunk, Z, disc, md, cats }));
  }
  return out.slice(0, count);
}

// Small 96x96 icon for an event card.
export function paintForecastGraphic(canvas, ev) {
  const g = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const val = ev.v;
  g.clearRect(0, 0, w, h);

  const glowDot = (x, y, col, r, core) => {
    const gl = g.createRadialGradient(x, y, 2, x, y, r);
    gl.addColorStop(0, `rgba(${col}, 1)`);
    gl.addColorStop(1, `rgba(${col}, 0)`);
    g.fillStyle = gl;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = `rgb(${col})`;
    g.beginPath();
    g.arc(x, y, core, 0, Math.PI * 2);
    g.fill();
  };

  if (ev.kind === "lun") {
    const total = val < 0.44;
    const glow = g.createRadialGradient(cx, cy, 8, cx, cy, 42);
    glow.addColorStop(0, total ? "rgba(255, 80, 40, 0.45)" : "rgba(210, 225, 255, 0.25)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = glow;
    g.beginPath();
    g.arc(cx, cy, 42, 0, Math.PI * 2);
    g.fill();

    const gr = g.createRadialGradient(cx - 8, cy - 8, 4, cx, cy, 28);
    gr.addColorStop(0, total ? "#ff6442" : "#f2ece1");
    gr.addColorStop(1, total ? "#6b1207" : "#565e72");
    g.fillStyle = gr;
    g.beginPath();
    g.arc(cx, cy, 26, 0, Math.PI * 2);
    g.fill();
  } else if (ev.kind === "sol") {
    const gr = g.createRadialGradient(cx, cy, 14, cx, cy, 42);
    gr.addColorStop(0, "rgba(255, 244, 185, 0.98)");
    gr.addColorStop(0.5, "rgba(255, 185, 70, 0.45)");
    gr.addColorStop(1, "rgba(255, 140, 30, 0)");
    g.fillStyle = gr;
    g.beginPath();
    g.arc(cx, cy, 42, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = "#060d1c";
    const offset = clamp(val * 10, 0, 14);
    g.beginPath();
    g.arc(cx + offset, cy - offset * 0.35, 19, 0, Math.PI * 2);
    g.fill();
  } else if (ev.kind === "mm") {
    g.fillStyle = "#e8e4d8";
    g.beginPath();
    g.arc(cx - 10, cy + 8, 18, 0, Math.PI * 2);
    g.fill();
    glowDot(cx + 16, cy - 14, PLN[ev.planet]?.col || "255,120,80", 16, 7);
  } else if (ev.kind === "pp") {
    // Each planet with its CONJ_RADIUS circle, at true relative sky positions.
    const offs = ev.offsets || [];
    const ext = Math.max(1, ...offs.map(o => Math.hypot(o.x, o.y)));
    const ppd = clamp(34 / ext, 5, 26);
    const rr = CONJ_RADIUS * ppd;
    for (const o of offs) {
      const x = cx + o.x * ppd;
      const y = cy - o.y * ppd;
      g.strokeStyle = "rgba(255,255,255,0.55)";
      g.lineWidth = 1;
      g.setLineDash([3, 3]);
      g.beginPath();
      g.arc(x, y, rr, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
      glowDot(x, y, PLN[o.planet]?.col || "255,220,150", Math.max(rr * 1.1, 6), Math.max(2.5, rr * 0.35));
    }
  } else {
    const col = PLN[ev.planet]?.col || "255,220,150";
    g.strokeStyle = "rgba(255,255,255,0.35)";
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(cx, cy, 34, 13, -0.3, 0, Math.PI * 2);
    g.stroke();

    g.fillStyle = `rgb(${col})`;
    g.beginPath();
    g.arc(cx, cy, 16, 0, Math.PI * 2);
    g.fill();
  }
}