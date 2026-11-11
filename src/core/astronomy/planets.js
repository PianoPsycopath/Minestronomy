import { RD, sin, cos, atan2, wrap, clamp } from "../math.js";
import { eq } from "./coordinates.js";

export function planetOrbit(p, t) {
  const [P, L0, w, e, a, inc, Om] = p.el;
  const M = L0 - w + (t / P) * 360;
  const nu =
    M +
    (2 * e - e ** 3 / 4) * RD * sin(M) +
    1.25 * e * e * RD * sin(2 * M) +
    (13 / 12) * e ** 3 * RD * sin(3 * M);
  const r = (a * (1 - e * e)) / (1 + e * cos(nu));
  const u = nu + w - Om;
  return {
    r,
    x: r * (cos(Om) * cos(u) - sin(Om) * sin(u) * cos(inc)),
    y: r * (sin(Om) * cos(u) + cos(Om) * sin(u) * cos(inc)),
    z: r * sin(u) * sin(inc)
  };
}

export function planetCalc(p, t, ls, er) {
  const o = planetOrbit(p, t);
  const r = o.r;
  const x = o.x + er * cos(ls);
  const y = o.y + er * sin(ls);
  const z = o.z;
  const dxy = Math.hypot(x, y);
  const dist = Math.hypot(dxy, z);
  const lam = atan2(y, x);
  const q = eq(lam, atan2(z, dxy));
  const cA = (r * r + dist * dist - er * er) / (2 * r * dist);
  const f = (1 + cA) / 2 / (r * r * dist * dist);
  return {
    ra: q.ra,
    dec: q.dec,
    dist,
    elong: wrap(lam - ls),
    bright: p.peak * clamp(Math.pow(f / p.fmax, 0.35), 0.12, 1)
  };
}
