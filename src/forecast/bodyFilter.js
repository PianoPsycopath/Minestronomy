import { COMETS } from "../config/index.js";
import { PLANETS } from "./planetGroups.js";

export const COMET_KEYS = Object.values(COMETS).map(c => c.key);

export const allBodies = () => ({ planets: new Set(PLANETS), comets: new Set(COMET_KEYS) });

// Spans and peaks can name the comet key in different fields.
export const cometKeyOf = item => item.comet ?? item.target?.comet ?? item.key;

// A missing filter selects all bodies, so callers that do not filter stay unchanged.
export const selectedPlanets = bodies => (bodies ? PLANETS.filter(p => bodies.planets.has(p)) : PLANETS);

export const keepComets = (items, bodies) => (bodies ? items.filter(i => bodies.comets.has(cometKeyOf(i))) : items);

export function bodiesKey(bodies) {
  const part = (set, total) => (set.size === total ? "*" : [...set].sort().join(","));
  return `${part(bodies.planets, PLANETS.length)}/${part(bodies.comets, COMET_KEYS.length)}`;
}