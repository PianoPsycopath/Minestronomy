import { findLunarEclipses, findMoonPlanetEvents, findOppositions, findPlanetConjunctions, findSolarEclipses } from "./eventFinders.js";
import { nextCometPeaks } from "./cometSpans.js";
import { visibilityOf } from "./visibility.js";
import { COMET_KEYS, keepComets } from "./bodyFilter.js";

const FINDERS = {
  lun: findLunarEclipses,
  sol: findSolarEclipses,
  mm: findMoonPlanetEvents,
  pp: findPlanetConjunctions,
  opp: findOppositions
};

// Search chunk (days) for each kind, used when the search looks for the next events.
const NEXT_CHUNK_DAYS = { lun: 180, sol: 120, mm: 90, pp: 240, opp: 400 };

// Returns every event in the days [d0, d1).
// cats is a Set of kinds ("lun", "sol", "mm", "pp", "opp"). The extra value "vis" removes moon and planet events that nobody can see from the ground.
// bodies is optional: { planets: Set, comets: Set }. A missing value selects all bodies.
export function findEventsInRange({ d0, d1, Z, disc, md, cats, bodies }) {
  // The scan range is one day wider on each side, so a minimum at the edge is still found.
  const range = { a: d0 - 1, b: d1 + 1, Z, disc, md, bodies };
  const want = kind => !cats || cats.has(kind);
  const visibleOnly = !!cats && cats.has("vis");

  const found = Object.entries(FINDERS)
    .filter(([kind]) => want(kind))
    .flatMap(([, find]) => find(range));

  const res = found.filter(e => e.t >= d0 && e.t < d1 && !(visibleOnly && e.visible === false));
  for (const e of res) e.vis = visibilityOf(e, e.t, Z);
  return res.sort((x, y) => x.t - y.t);
}

// Returns the next "count" events of one kind on or after day "from". The search moves forward in chunks.
export function findNextEvents({ kind, from, count, Z, disc, md, visibleOnly, bodies }) {
  if (kind === "com") {
    if (!bodies) return nextCometPeaks(from, count, Z);
    // The filter removes peaks after the search, so the search reads more peaks first.
    return keepComets(nextCometPeaks(from, count * COMET_KEYS.length, Z), bodies).slice(0, count);
  }
  const chunk = NEXT_CHUNK_DAYS[kind] || 120;
  const cats = new Set([kind]);
  if (visibleOnly) cats.add("vis");
  const out = [];
  for (let d = from; out.length < count && d < from + 8000; d += chunk) {
    out.push(...findEventsInRange({ d0: d, d1: d + chunk, Z, disc, md, cats, bodies }));
  }
  return out.slice(0, count);
}