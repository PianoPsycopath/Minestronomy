import { PLN, COMETS, CELESTIAL_DEFAULTS } from "../config/index.js";
import {

  buildCometParticleJson,
  buildSunParticleJson,
  buildMoonParticleJson,
  buildPlanetParticleJson
} from "../export/bedrock/index.js";

export function defaultParticleJson(body) {
  if (body === "sun") return buildSunParticleJson(CELESTIAL_DEFAULTS.sun);
  if (body === "moon") return buildMoonParticleJson(CELESTIAL_DEFAULTS.moon);
  if (COMETS[body]) return buildCometParticleJson(body);
  return buildPlanetParticleJson(body, PLN[body], false);
}
