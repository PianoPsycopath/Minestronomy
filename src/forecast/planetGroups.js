import { CONJ_RADIUS } from "./settings.js";
import { PLN } from "../config/index.js";
import { cap, cos } from "../core/math.js";
import { sepEq } from "../core/astronomy/index.js";

export const PLANETS = Object.keys(PLN);

// Chains planets with touching circles into groups. A group has at least two planets.
export function planetComponents(s) {
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

export function spreadOf(members, s) {
  let m = 0;
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) m = Math.max(m, sepEq(s.pl[members[i]], s.pl[members[j]]));
  }
  return m;
}

// Sky-plane offsets in degrees. East is to the left, as when you look up. The group center is the origin.
export function offsetsOf(members, s) {
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

export const nameList = ms => (ms.length === 2 ? `${cap(ms[0])} & ${cap(ms[1])}` : `${ms.slice(0, -1).map(cap).join(", ")} & ${cap(ms[ms.length - 1])}`);
