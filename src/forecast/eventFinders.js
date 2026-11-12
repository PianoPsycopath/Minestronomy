import { MM_MIN_SEP } from "./settings.js";
import { calc, sepEq } from "../core/astronomy/index.js";
import { cap } from "../core/math.js";
import { minimaOf, scan } from "./scan.js";
import { nameList, offsetsOf, planetComponents, spreadOf } from "./planetGroups.js";
import { selectedPlanets } from "./bodyFilter.js";
import { refineVisible } from "./visibility.js";

export function findLunarEclipses({ a, b, Z }) {
  return scan(x => calc(x, Z).ecl_d, a, b, 0.05, 0.96).map(q => ({
    kind: "lun",
    t: q.t,
    v: q.v,
    bodies: ["moon"],
    title: q.v < 0.44 ? "Total Lunar Eclipse" : "Partial Lunar Eclipse",
    sub: `Umbra dist ${q.v.toFixed(2)}°`,
    target: { type: "moon" }
  }));
}

export function findSolarEclipses({ a, b, Z }) {
  return scan(x => calc(x, Z).sep, a, b, 0.04, 1.2).map(q => ({
    kind: "sol",
    t: q.t,
    v: q.v,
    bodies: ["sun"],
    title: q.v < 0.5 ? "Total / Overlap Eclipse" : "Partial Solar Eclipse",
    sub: `Separation ${q.v.toFixed(2)}°`,
    target: { type: "sun" }
  }));
}

// Each event moves to the best moment when the moon and the planet are visible.
export function findMoonPlanetEvents({ a, b, Z, disc, md, bodies }) {
  const planets = selectedPlanets(bodies);
  if (!planets.length) return [];

  const step = 0.1;
  const n = Math.ceil((b - a) / step) + 2;
  const series = planets.map(() => []);
  for (let k = 0; k < n; k++) {
    const s = calc(a + k * step, Z);
    planets.forEach((p, i) => series[i].push(sepEq(s.moon, s.pl[p])));
  }

  const lim = disc / 2 + md / 2;
  const maxSep = Math.max(MM_MIN_SEP, lim + 3);
  return minimaOf(series, a, step, maxSep).map(q => {
    const p = planets[q.i];
    const bodyList = ["moon", p];
    const r = refineVisible(bodyList, q.t, Z, s => sepEq(s.moon, s.pl[p]));
    const ok = !!r && r.m <= maxSep;
    const v = ok ? r.m : q.v;
    return {
      kind: "mm",
      t: ok ? r.t : q.t,
      v,
      visible: ok,
      planet: p,
      bodies: bodyList,
      title: `Moon & ${cap(p)} ${v < lim ? "Occultation" : "Conjunction"}`,
      sub: `Separation ${v.toFixed(2)}° at best view`,
      target: { type: "planet", planet: p }
    };
  });
}

// A chain links groups of consecutive samples that share a planet. Each chain keeps its closest, largest group.
function buildConjunctionChains(a, b, Z) {
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
  return chains;
}

export function findPlanetConjunctions({ a, b, Z, bodies }) {
  const planets = selectedPlanets(bodies);
  if (!planets.length) return [];

  // The scan keeps all planets. A smaller scan set would split a group and change its size.
  return buildConjunctionChains(a, b, Z)
    .filter(ch => ch.best.members.some(p => planets.includes(p)))
    .map(ch => {
      const { members, t } = ch.best;
      const r = refineVisible(members, t, Z, s => spreadOf(members, s));
      const tt = r ? r.t : t;
      const s = calc(tt, Z);
      const spread = spreadOf(members, s);
      return {
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
      };
    });
}

export function findOppositions({ a, b, Z, bodies }) {
  const out = [];
  for (const pn of selectedPlanets(bodies)) {
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
  return out;
}