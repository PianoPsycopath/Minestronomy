import { OBS_HALF_WINDOW } from "./settings.js";
import { VIS } from "../config/index.js";
import { altaz, calc, zToLatitude } from "../core/astronomy/index.js";
import { clamp } from "../core/math.js";

// Visibility states:
// "vis": the body is above the horizon and the sky is dark enough for it.
// "day": the body is above the horizon but the sky is too bright.
// "down": the body is below the horizon.
// Planets use the VIS sun-altitude window of the pack. The 50% point is the limit.
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

// Searches around the exact event time for the moment when all bodies are visible and above 3 degrees.
// Returns the moment with the lowest metric(s, t), or null if no such moment exists.
export function refineVisible(bodies, tc, Z, metric) {
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
