import { sin, wrap, clamp, lerp } from "../math.js";
import { K, OM0, PLN, COMETS, EARTH_RADIUS_BLOCKS } from "../../config/index.js";
import { eq } from "./coordinates.js";
import { solarTerms } from "./solar.js";
import { planetCalc } from "./planets.js";
import { cometCalc } from "./comets.js";

// Computes the full sky state at world time t for an observer at block coordinate Z.
export function calc(t, Z) {
  const tod = t - Math.floor(t);
  const { lm, ls, er } = solarTerms(t);
  const sun = eq(ls, 0);
  const lmoon = lm + (t / 29.53) * 360 + 180 + 6.29 * sin((t / 27.55) * 360);
  const bmoon = 5.145 * sin(lmoon - (OM0 - (t / 6793.5) * 360));
  const par = (Z / EARTH_RADIUS_BLOCKS) * 2.9;
  const moon = eq(lmoon, bmoon);
  moon.dec += par;

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
    ls,
    er,
    lmoon,
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
