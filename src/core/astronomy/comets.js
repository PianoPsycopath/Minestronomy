import { sin, cos, atan2, asin, acos, clamp } from "../math.js";
import { E, COMET_BASE } from "../../config/index.js";
import { posMod } from "./posMod.js";

// Signed days from the center of the comet window, wrapped to half a period either side.
// The particle files use the same formula.
export function cometDt(C, t) {
  return posMod(t - C.perihelionDay + C.period / 2, C.period) - C.period / 2;
}

// A comet with orbitOffset reaches true perihelion orbitOffset days before the window center.
export function cometDaysToPerihelion(C, t) {
  return posMod(C.perihelionDay - (C.orbitOffset || 0) - t, C.period);
}

// Mirrors the Molang code in the comet particle files and in player.entity.json.
// A windowed comet is on only inside its window and fades over the outer fifth.
// The comet without a window is always on and fades over the last 40 days before aphelion.
export function cometOrbit(C, t) {
  const dt = cometDt(C, t);
  const windowed = C.window != null;
  const on = windowed ? Math.abs(dt) < C.window : true;
  const fade = windowed
    ? on
      ? clamp((C.window - Math.abs(dt)) / (C.window / 5), 0, 1)
      : 0
    : clamp((C.period / 2 - Math.abs(dt)) / 40, 0, 1);

  const w = on ? C.rate * (dt + (C.orbitOffset || 0)) : 0;
  const cb = Math.pow(w / 2 + Math.sqrt((w * w) / 4 + 1), 0.333333);
  const s = cb - 1 / cb;
  const r = Math.max(C.q * (1 + s * s), 0.001);
  const u = 2 * atan2(s, 1) + C.uOffset;

  return {
    dt,
    on,
    fade,
    r,
    hx: r * (C.P[0] * cos(u) + C.Q[0] * sin(u)),
    hy: r * (C.P[1] * cos(u) + C.Q[1] * sin(u)),
    hz: r * sin(u) * C.Q[2]
  };
}

export function cometCalc(C, t, ls, er) {
  const { dt, on, fade, r, hx, hy, hz } = cometOrbit(C, t);

  const gx = hx + er * cos(ls);
  const gy = hy + er * sin(ls);
  const gz = hz;
  const dist = Math.max(Math.hypot(gx, gy, gz), 0.001);

  const ey = gy * cos(E) - gz * sin(E);
  const ez = gy * sin(E) + gz * cos(E);
  const ra = atan2(ey, gx);
  const dec = asin(ez / dist);

  // The tail points away from the Sun. These lines project the heliocentric vector onto the local sky tangent plane.
  const ty = hy * cos(E) - hz * sin(E);
  const tz = hy * sin(E) + hz * cos(E);
  const te = -sin(ra) * hx + cos(ra) * ty;
  const tn = -sin(dec) * (cos(ra) * hx + sin(ra) * ty) + cos(dec) * tz;
  const pa = atan2(te, tn);
  const rot = C.tailSign * pa + C.tailOffset;

  const elong = acos(clamp((gx * cos(ls) + gy * sin(ls)) / dist, -1, 1));
  const elongFade = C.elongFade ? clamp((elong - C.elongFade[0]) / C.elongFade[1], 0, 1) : 1;

  const flux = C.fluxScale / (Math.pow(r, C.fluxRPow) * dist * dist);
  const bright = on
    ? clamp(Math.pow(flux / C.fluxRef, C.fluxPow), 0, 1) *
      elongFade *
      clamp((C.brightFade - r) / 2, 0, 1) *
      fade
    : 0;
  const tf = clamp(C.tfRef / (C.tfBy === "dist" ? dist : r), 0, 1);
  const size = (C.sizeBase + C.sizeGain * Math.pow(tf, 1.5)) * C.sizeScale;

  return { key: C.key, ra, dec, dist, r, pa, rot, flux, bright, size, dt, on, fade, elong };
}

// Pass the comet configuration as C, so the visibility values of that comet apply.
export function cometVisibility(bright, sunAlt, C = COMET_BASE) {
  return clamp((C.visBase + C.visGain * Math.pow(bright, 3) - sunAlt) / C.visSpan, 0, 1);
}

// Apparent angular diameter (degrees) of the comet billboard, as the Bedrock particle shows it.
export function cometAngularSize(size) {
  return 2 * atan2(size / 2, COMET_BASE.emitterDistance);
}
