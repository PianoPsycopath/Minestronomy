import { CELESTIAL_DEFAULTS } from "../../../config/index.js";

export function buildMoonParticleJson(cfg = CELESTIAL_DEFAULTS.moon) {
  const phaseExpr =
    "variable.t = query.day + query.time_of_day; variable.lm = (variable.t - 80) / 365.25 * 360; variable.me = (variable.t - 3) / 365.25 * 360; variable.ls = variable.lm + 1.915 * math.sin(variable.me) + 0.02 * math.sin(2 * variable.me); variable.lmoon = variable.lm + variable.t / 29.53 * 360 + 180 + 6.29 * math.sin(variable.t / 27.55 * 360); variable.d = variable.lmoon - variable.ls; variable.dw = math.atan2(math.sin(variable.d), math.cos(variable.d)); variable.elong = math.mod(variable.dw + 360, 360); variable.ph = math.mod(math.floor(math.mod(variable.elong + 22.5, 360) / 45) + 4, 8);";

  const billboard = {
    size: cfg.size || [80, 80],
    facing_camera_mode: "lookat_xyz",
    uv: cfg.uv || {
      texture_width: 4,
      texture_height: 2,
      uv: ["math.mod(variable.ph, 4)", "math.floor(variable.ph / 4)"],
      uv_size: [1, 1]
    }
  };

  return {
    format_version: "1.10.0",
    particle_effect: {
      description: {
        identifier: cfg.identifier || "astrum:moon_particle",
        basic_render_parameters: {
          material: cfg.material || "particles_alpha",
          texture: cfg.texture || "textures/environment/moon_phases"
        }
      },
      components: {
        "minecraft:emitter_local_space": { position: true, rotation: false },
        "minecraft:emitter_rate_instant": { num_particles: 1 },
        "minecraft:emitter_lifetime_looping": { active_time: 1 },
        "minecraft:emitter_shape_point": { offset: [0, 250, 0] },
        "minecraft:particle_initialization": {
          per_update_expression: phaseExpr
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
