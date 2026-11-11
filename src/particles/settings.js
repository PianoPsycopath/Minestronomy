import { PLN, COMETS, STARBOX_FACES } from "../config/index.js";
import { parseTintColor } from "./tint.js";

// Reads the values that the sky view needs from a Bedrock particle file. Missing values use the defaults of the body.
export function readBodySettings(body, json) {
  const pe = json.particle_effect;
  const renderParams = pe?.description?.basic_render_parameters || {};
  const billboard = pe?.components?.["minecraft:particle_appearance_billboard"] || {};
  const tintComp = pe?.components?.["minecraft:particle_appearance_tinting"] || {};

  const comet = COMETS[body];
  const isLuminary = body === "sun" || body === "moon";
  const defaultTint = isLuminary ? [1, 1, 1] : comet ? comet.tint : PLN[body]?.tint || [1, 1, 1];
  const defaultTexture = comet ? comet.texture : "textures/environment/planet";

  return {
    identifier: pe?.description?.identifier || `astrum:${body}_particle`,
    texturePath: (renderParams.texture || defaultTexture).replace(/\.png$/i, ""),
    material: renderParams.material || (comet ? comet.material : isLuminary ? "particles_alpha" : "particles_add"),
    size: billboard.size || [4, 4],
    uv: billboard.uv || null,
    tint: parseTintColor(tintComp.color, defaultTint)
  };
}

export function readStarboxSettings(faceKey, json) {
  const defaultFace = STARBOX_FACES[faceKey];
  const pe = json.particle_effect;
  const renderParams = pe?.description?.basic_render_parameters || {};
  const shapePoint = pe?.components?.["minecraft:emitter_shape_point"] || {};
  const billboard = pe?.components?.["minecraft:particle_appearance_billboard"] || {};
  const looping = pe?.components?.["minecraft:emitter_lifetime_looping"] || {};
  const lifeExpr = pe?.components?.["minecraft:particle_lifetime_expression"] || {};

  return {
    identifier: pe?.description?.identifier || defaultFace.identifier,
    texturePath: (renderParams.texture || defaultFace.texture).replace(/\.png$/i, ""),
    material: renderParams.material || "starfield:stars",
    offset: shapePoint.offset || defaultFace.offset,
    size: billboard.size || defaultFace.size,
    facing: billboard.facing_camera_mode || defaultFace.facing,
    activeTime: looping.active_time,
    sleepTime: looping.sleep_time,
    maxLifetime: lifeExpr.max_lifetime
  };
}
