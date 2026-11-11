import { COMETS } from "../config/index.js";
import { COMET_MIN_BRIGHT } from "./settings.js";
import { altaz, cometCalc, cometVisibility, eq, solarTerms, zToLatitude } from "../core/astronomy/index.js";
import { clamp } from "../core/math.js";

// Samples a comet at time t. The score is high when the comet is bright, above the horizon, and the sky is dark.
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

// Finds the best moment to see a comet between days d0 and d1 (inclusive).
// A coarse pass covers the span. Two finer passes follow.
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

// Finds the spans of days on which each comet is bright enough to show.
// For each day, the scan samples the comet at noon.
export function findCometSpans(d0, d1, Z) {
  // Scan past the edges, so a span that crosses an edge keeps its true length.
  const LIM = 900;
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

  // Greedy lane packing: a lane is free when its last span has ended.
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

// Returns the next peak views of the comets after day "from", soonest first.
export function nextCometPeaks(from, count, Z) {
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
