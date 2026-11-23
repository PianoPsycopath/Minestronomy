import { cap } from "../core/math.js";

export const planetKeys = catalog => catalog.planets().map(p => p.key);

export const cometKeys = catalog => catalog.comets().map(c => c.key);

export const labelOf = (catalog, key) => catalog.get(key)?.label ?? cap(key);

// An orbit inside Earth's orbit has a maximum elongation instead of an opposition.
export const isInnerPlanet = entry => entry.el[4] < 1;

export const allBodies = catalog => ({ planets: new Set(planetKeys(catalog)), comets: new Set(cometKeys(catalog)) });

// Spans and peaks can name the comet key in different fields.
export const cometKeyOf = item => item.comet ?? item.target?.comet ?? item.key;

// A missing filter selects all bodies, so callers that do not filter stay unchanged.
export const selectedPlanets = (bodies, catalog) => {
  const keys = planetKeys(catalog);
  return bodies ? keys.filter(p => bodies.planets.has(p)) : keys;
};

export const keepComets = (items, bodies) => (bodies ? items.filter(i => bodies.comets.has(cometKeyOf(i))) : items);

export function bodiesKey(bodies, catalog) {
  const part = (set, keys) => (set.size === keys.length && keys.every(k => set.has(k)) ? "*" : [...set].sort().join(","));
  return `${part(bodies.planets, planetKeys(catalog))}/${part(bodies.comets, cometKeys(catalog))}`;
}