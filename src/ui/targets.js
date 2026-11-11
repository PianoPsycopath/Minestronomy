import { cap } from "../core/math.js";
import { COMETS, PH } from "../config/index.js";

export function labelFor(target) {
  if (target.type === "sun") return "Sun";
  if (target.type === "moon") return "Moon";
  if (target.type === "planet") return cap(target.planet);
  return `${COMETS[target.comet || "comet"].label} Comet`;
}

// Short fact lines for the click card.
export function describeTarget(target, s) {
  const f = (x, n = 1) => x.toFixed(n);
  const lines = [];
  if (target.type === "sun") {
    lines.push(`Declination ${f(s.sun.dec)}°`);
    if (s.eclipse > 0.05) lines.push(`Being eclipsed (${Math.round(s.eclipse * 100)}%)`);
  } else if (target.type === "moon") {
    lines.push(`${PH[s.ph]} • elongation ${f(s.elong, 0)}°`);
    if (s.blood > 0.05) lines.push("Lunar eclipse in progress");
    if (s.eclipse > 0.05) lines.push("Passing in front of the Sun");
  } else if (target.type === "planet") {
    const q = s.pl[target.planet];
    lines.push(`${f(q.dist, 2)} AU from Earth • elongation ${f(q.elong, 0)}°`);
    lines.push(`Brightness ${f(q.bright, 2)}`);
  } else {
    const c = s.comets[target.comet];
    lines.push(`${f(c.dist, 2)} AU from Earth • ${f(c.r, 2)} AU from Sun`);
    lines.push(`Brightness ${f(c.bright, 2)}`);
  }
  return lines;
}
