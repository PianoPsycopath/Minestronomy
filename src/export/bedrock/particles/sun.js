import { CELESTIAL_DEFAULTS } from "../../../config/index.js";

const f1 = x => (Number.isInteger(x) ? x.toFixed(1) : String(x));

// One colour channel. In deferred lighting the channel is boosted, so that the sun blooms. Everywhere else it is the plain tint.
function sunChannel(tint, boost) {
  if (!boost) return f1(tint);
  return `query.graphics_mode_is_any('deferred') ? ${f1(boost * tint)} : ${f1(tint)}`;
}

export function buildSunParticleJson(cfg = CELESTIAL_DEFAULTS.sun) {
  const billboard = {
    size: cfg.size || [80, 80],
    facing_camera_mode: "lookat_xyz"
  };
  if (cfg.uv) {
    billboard.uv = cfg.uv;
  }
  const tint = cfg.tint || [1, 1, 1];
  const boost = cfg.deferredBoost || [];

  return {
    format_version: "1.10.0",
    particle_effect: {
      description: {
        identifier: cfg.identifier || "astrum:sun_particle",
        basic_render_parameters: {
          material: cfg.material || "starfield:sun_moon",
          texture: cfg.texture || "textures/environment/sunAstrum"
        }
      },
      components: {
        "minecraft:emitter_local_space": { position: true, rotation: false },
        "minecraft:emitter_rate_instant": { num_particles: 1 },
        "minecraft:emitter_lifetime_looping": { active_time: 1 },
        "minecraft:emitter_shape_point": { offset: [0, 250, 0] },
        "minecraft:particle_initialization": {
          per_update_expression: "variable.lunar_az=0; variable.lunar_alt=0; variable.solar_az=0; variable.solar_alt=0;"
        },
        "minecraft:particle_lifetime_expression": { max_lifetime: 1.0 },
        "minecraft:particle_initial_speed": 0,
        "minecraft:particle_appearance_billboard": billboard,
        "minecraft:particle_appearance_lighting": {},
        "minecraft:particle_appearance_tinting": {
          color: [sunChannel(tint[0], boost[0]), sunChannel(tint[1], boost[1]), sunChannel(tint[2], boost[2]), "1.0"]
        }
      }
    }
  };
}
