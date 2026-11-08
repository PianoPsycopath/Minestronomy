import { RD, sin, cos, atan2, asin, acos, wrap, clamp, lerp } from "./math.js";
import { E, K, OM0, PLN, COMETS, COMET_BASE, EARTH_RADIUS_BLOCKS } from "../config/constants.js";

export function eq(lam, beta) {
  return {
    dec: asin(sin(beta) * cos(E) + cos(beta) * sin(E) * sin(lam)),
    ra: atan2(sin(lam) * cos(E) - (sin(beta) / cos(beta)) * sin(E), cos(lam))
  };
}

export function planetCalc(p, t, ls, er) {
  const [P, L0, w, e, a, inc, Om] = p.el;
  const M = L0 - w + (t / P) * 360;
  const nu =
    M +
    (2 * e - e ** 3 / 4) * RD * sin(M) +
    1.25 * e * e * RD * sin(2 * M) +
    (13 / 12) * e ** 3 * RD * sin(3 * M);
  const r = (a * (1 - e * e)) / (1 + e * cos(nu));
  const u = nu + w - Om;
  const x = r * (cos(Om) * cos(u) - sin(Om) * sin(u) * cos(inc)) + er * cos(ls);
  const y = r * (sin(Om) * cos(u) + cos(Om) * sin(u) * cos(inc)) + er * sin(ls);
  const z = r * sin(u) * sin(inc);
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

const posMod = (x, m) => ((x % m) + m) % m;

// Signed days from perihelion, wrapped to [-period/2, period/2). Matches
// variable.dt = math.mod(t + A, period) - period / 2 in the particle files.
export function cometDt(C, t) {
  return posMod(t - C.perihelionDay + C.period / 2, C.period) - C.period / 2;
}

// Days until this comet's next perihelion (0 if it is exactly now).
export function cometDaysToPerihelion(C, t) {
  return posMod(C.perihelionDay - t, C.period);
}

// Mirrors the Molang in <key>.particle.json / player.entity.json.
// Angles in degrees (math.js trig is degree-based).
// Windowed comets are only "on" within +/- C.window days of perihelion and fade over the outer window/5.
export function cometCalc(C, t, ls, er) {
  const dt = cometDt(C, t);
  const windowed = C.window != null;
  const on = windowed ? Math.abs(dt) < C.window : true;
  const fade = windowed ? (on ? clamp((C.window - Math.abs(dt)) / (C.window / 5), 0, 1) : 0) : 1;

  const w = on ? C.rate * dt : 0;
  const cb = Math.pow(w / 2 + Math.sqrt((w * w) / 4 + 1), 0.333333);
  const s = cb - 1 / cb;
  const r = Math.max(C.q * (1 + s * s), 0.001);
  const u = 2 * atan2(s, 1) + C.uOffset;

  const hx = r * (C.P[0] * cos(u) + C.Q[0] * sin(u));
  const hy = r * (C.P[1] * cos(u) + C.Q[1] * sin(u));
  const hz = r * sin(u) * C.Q[2];

  const gx = hx + er * cos(ls);
  const gy = hy + er * sin(ls);
  const gz = hz;
  const dist = Math.max(Math.hypot(gx, gy, gz), 0.001);

  const ey = gy * cos(E) - gz * sin(E);
  const ez = gy * sin(E) + gz * cos(E);
  const ra = atan2(ey, gx);
  const dec = asin(ez / dist);

  // Tail points away from the Sun: project the heliocentric vector onto the local sky tangent plane.
  const ty = hy * cos(E) - hz * sin(E);
  const tz = hy * sin(E) + hz * cos(E);
  const te = -sin(ra) * hx + cos(ra) * ty;
  const tn = -sin(dec) * (cos(ra) * hx + sin(ra) * ty) + cos(dec) * tz;
  const pa = atan2(te, tn); // position angle, north -> east
  const rot = C.tailSign * pa + C.tailOffset;

  const flux = C.fluxScale / (Math.pow(r, 4) * dist * dist);
  const bright = on
    ? clamp(Math.pow(flux / C.fluxRef, C.fluxPow), 0, 1) * clamp((C.brightFade - r) / 2, 0, 1) * fade
    : 0;
  const tf = clamp(0.3 / r, 0, 1);
  const size = (C.sizeBase + C.sizeGain * Math.pow(tf, 1.5)) * C.sizeScale;

  return { key: C.key, ra, dec, dist, r, pa, rot, flux, bright, size, dt, on, fade };
}

export function cometVisibility(bright, sunAlt) {
  return clamp(
    (COMET_BASE.visBase + COMET_BASE.visGain * Math.pow(bright, 3) - sunAlt) / COMET_BASE.visSpan,
    0,
    1
  );
}

// Apparent angular diameter (deg) of the comet billboard, as the Bedrock particle would subtend it.
export function cometAngularSize(size) {
  return 2 * atan2(size / 2, COMET_BASE.emitterDistance);
}

export function calc(t, Z) {
  const tod = t - Math.floor(t);
  const lm = ((t - 80) / 365.25) * 360;
  const me = ((t - 3) / 365.25) * 360;
  const ls = lm + 1.915 * sin(me) + 0.02 * sin(2 * me);
  const sun = eq(ls, 0);
  const lmoon = lm + (t / 29.53) * 360 + 180 + 6.29 * sin((t / 27.55) * 360);
  const bmoon = 5.145 * sin(lmoon - (OM0 - (t / 6793.5) * 360));
  const par = (Z / EARTH_RADIUS_BLOCKS) * 2.9;
  const moon = eq(lmoon, bmoon);
  moon.dec += par;

  const er = 1 - 0.0167 * cos(me);
  const pl = {};
  for (const n in PLN) {
    pl[n] = planetCalc(PLN[n], t, ls, er);
  }
  const comets = {};
  for (const k in COMETS) {
    comets[k] = cometCalc(COMETS[k], t, ls, er);
  }

  const d = lmoon - ls;
  const dw = wrap(d);
  const elong = (dw + 360) % 360;
  const dl = wrap(d - 180);
  const ecl_d = Math.hypot(dl / K, bmoon);
  const sep = Math.hypot(dw, bmoon + par);
  const sh = tod >= 0.25 ? tod - 0.25 : tod + 0.75;

  return {
    t,
    tod,
    sh,
    lm,
    sun,
    moon,
    pl,
    comets,
    bmoon,
    elong,
    ph: (Math.floor(((elong + 22.5) % 360) / 45) + 4) % 8,
    ecl_d,
    blood: clamp((0.96 - ecl_d) / 0.52, 0, 1),
    sep,
    eclipse: clamp((1.2 - sep) / 0.7, 0, 1),
    night: Math.min(clamp((sh - 13 / 24) * 24, 0, 1), clamp((23 / 24 - sh) * 24, 0, 1)),
    dayA: lerp(1, 0.5, clamp(sin(tod * 360), 0, 1))
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