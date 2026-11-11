import { sin, cos, atan2, asin, acos, clamp } from "../math.js";
import { E, EARTH_RADIUS_BLOCKS } from "../../config/index.js";

export function eq(lam, beta) {
  return {
    dec: asin(sin(beta) * cos(E) + cos(beta) * sin(E) * sin(lam)),
    ra: atan2(sin(lam) * cos(E) - (sin(beta) / cos(beta)) * sin(E), cos(lam))
  };
}

export function sepEq(a, b) {
  return acos(sin(a.dec) * sin(b.dec) + cos(a.dec) * cos(b.dec) * cos(a.ra - b.ra));
}

export function altaz(b, s, phi) {
  const H = 360 * s.tod + 180 + s.lm - b.ra;
  return {
    alt: asin(sin(phi) * sin(b.dec) + cos(phi) * cos(b.dec) * cos(H)),
    az: (atan2(-cos(b.dec) * sin(H), sin(b.dec) * cos(phi) - cos(b.dec) * sin(phi) * cos(H)) + 360) % 360
  };
}

export function getTargetAltAz(target, s, phi) {
  if (!target) return null;
  if (target.type === "sun") return altaz(s.sun, s, phi);
  if (target.type === "moon") return altaz(s.moon, s, phi);
  if (target.type === "planet" && target.planet) return altaz(s.pl[target.planet], s, phi);
  if (target.type === "comet") return altaz(s.comets[target.comet || "comet"], s, phi);
  return null;
}

export function zToLatitude(Z) {
  return clamp(-Z / EARTH_RADIUS_BLOCKS, -1, 1) * 90;
}

// Minecraft axes: +X is east, -Z is north, +Y is up.
// Altitude and azimuth are in degrees. Azimuth starts at north and turns toward east.
// R is large, so the 1.62 block difference between feet and eyes is negligible.
export function facingOffset(alt, az, R = 1000) {
  return [cos(alt) * sin(az) * R, sin(alt) * R, -cos(alt) * cos(az) * R];
}

// Turns the player toward the object. The player does not move.
export function facingCommand(pos, R = 1000) {
  const f = v => (Math.abs(v) < 0.005 ? 0 : +v.toFixed(2));
  const [dx, dy, dz] = facingOffset(pos.alt, pos.az, R).map(f);
  return `/tp @s ~ ~ ~ facing ~${dx} ~${dy} ~${dz}`;
}
