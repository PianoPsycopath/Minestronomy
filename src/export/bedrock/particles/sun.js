import { CELESTIAL_DEFAULTS } from "../../../config/index.js";

export function buildSunParticleJson(cfg = CELESTIAL_DEFAULTS.sun) {
  const billboard = {
    size: cfg.size || [80, 80],
    facing_camera_mode: "lookat_xyz"
  };
  if (cfg.uv) {
    billboard.uv = cfg.uv;
  }

  return {
    format_version: "1.10.0",
    particle_effect: {
      description: {
        identifier: cfg.identifier || "astrum:sun_particle",
        basic_render_parameters: {
          material: cfg.material || "particles_alpha",
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
        "minecraft:particle_appearance_tinting": {
          color: [
            String(cfg.tint?.[0] ?? "1.0"),
            String(cfg.tint?.[1] ?? "1.0"),
            String(cfg.tint?.[2] ?? "1.0"),
            "1.0"
          ]
        }
      }
    }
  };
}
