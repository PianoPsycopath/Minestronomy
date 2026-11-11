import { PLN, COMETS, CELESTIAL_DEFAULTS, STARBOX_FACES } from "../config/index.js";

// The particle files in public/particles are the source of truth.
// These functions copy their values into the shared configuration, so the sky view, the forecast, and the export agree.
export function applyBodyOverrides(body, { texturePath, material, size, uv, tint }) {
  if (PLN[body]) {
    PLN[body].texture = texturePath;
    PLN[body].material = material;
    PLN[body].billboardSize = size;
    PLN[body].tint = tint;
    PLN[body].col = `${Math.round(tint[0] * 255)},${Math.round(tint[1] * 255)},${Math.round(tint[2] * 255)}`;
  } else if (COMETS[body]) {
    COMETS[body].texture = texturePath;
    COMETS[body].material = material;
    COMETS[body].tint = tint;
  } else if (CELESTIAL_DEFAULTS[body]) {
    CELESTIAL_DEFAULTS[body].texture = texturePath;
    CELESTIAL_DEFAULTS[body].material = material;
    CELESTIAL_DEFAULTS[body].size = size;
    CELESTIAL_DEFAULTS[body].uv = uv;
    CELESTIAL_DEFAULTS[body].tint = tint;
  }
}

export function applyStarboxOverrides(faceKey, { texturePath, material, offset, size, facing, activeTime, sleepTime, maxLifetime }) {
  const face = STARBOX_FACES[faceKey];
  face.texture = texturePath;
  face.material = material;
  face.offset = offset;
  face.size = size;
  face.facing = facing;
  if (activeTime !== undefined) face.active_time = activeTime;
  if (sleepTime !== undefined) face.sleep_time = sleepTime;
  if (maxLifetime !== undefined) face.max_lifetime = maxLifetime;
}
