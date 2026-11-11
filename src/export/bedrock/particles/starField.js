import { STARBOX_FACES } from "../../../config/index.js";

export function buildStarFieldParticleJson(faceKey, faceCfg = STARBOX_FACES[faceKey], isConst = false) {
  const looping = { active_time: faceCfg.active_time ?? 1 };
  if (faceCfg.sleep_time !== undefined) {
    looping.sleep_time = faceCfg.sleep_time;
  }

  const identifier = isConst
    ? `astrum:star_field_${faceKey}_const`
    : faceCfg.identifier || `astrum:star_field_${faceKey}_stars`;

  const texturePath = isConst
    ? faceCfg.constTexture || faceCfg.texture || `textures/normal_${faceKey}`
    : faceCfg.texture || `textures/normal_${faceKey}`;

  return {
    format_version: "1.10.0",
    particle_effect: {
      description: {
        identifier,
        basic_render_parameters: {
          material: faceCfg.material || "starfield:stars",
          texture: texturePath
        }
      },
      components: {
        "minecraft:emitter_local_space": {
          position: true,
          rotation: true
        },
        "minecraft:emitter_rate_instant": {
          num_particles: 1
        },
        "minecraft:emitter_lifetime_looping": looping,
        "minecraft:emitter_shape_point": {
          offset: faceCfg.offset || [0, 0, 256]
        },
        "minecraft:particle_lifetime_expression": {
          max_lifetime: faceCfg.max_lifetime ?? 1.0
        },
        "minecraft:particle_initial_speed": 0,
        "minecraft:particle_motion_dynamic": {},
        "minecraft:particle_appearance_billboard": {
          size: faceCfg.size || [256, 256],
          facing_camera_mode: faceCfg.facing || "emitter_transform_xy"
        },
        "minecraft:particle_appearance_tinting": {
          color: [
            1.0,
            1.0,
            1.0,
            "query.graphics_mode_is_any('deferred') ? math.min(math.clamp(((query.time_of_day >= 0.25 ? query.time_of_day - 0.25 : query.time_of_day + 0.75) - 13.0/24.0) / (1.0/24.0), 0.0, 1.0), math.clamp((23.0/24.0 - (query.time_of_day >= 0.25 ? query.time_of_day - 0.25 : query.time_of_day + 0.75)) / (1.0/24.0), 0.0, 1.0)) : 0.0"
          ]
        }
      }
    }
  };
}
