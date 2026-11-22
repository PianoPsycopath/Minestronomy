import { CELESTIAL_DEFAULTS } from "../../../config/index.js";

// Phase, eclipse and blood moon. Mirrors base/particles/moon.particle.json.
// phase = 0..7, same order as the cells of the moon atlas. eclipse and blood_intensity darken and redden the disc.
const MOON_PHASE_MOLANG = [
  "variable.t = query.day + query.time_of_day;",
  "variable.lm = (variable.t - 80) / 365.25 * 360;",
  "variable.me = (variable.t - 3) / 365.25 * 360;",
  "variable.ls = variable.lm + 1.915 * math.sin(variable.me) + 0.02 * math.sin(2 * variable.me);",
  "variable.lmoon = variable.lm + variable.t / 29.53 * 360 + 180 + 6.29 * math.sin(variable.t / 27.55 * 360);",
  "variable.bmoon = 5.145 * math.sin(variable.lmoon - (101.1 - variable.t / 6793.5 * 360));",
  "variable.d = variable.lmoon - variable.ls;",
  "variable.dwrap = math.atan2(math.sin(variable.d), math.cos(variable.d));",
  "variable.elong = math.mod(variable.dwrap + 360, 360);",
  "variable.raw_idx = math.floor(math.mod(variable.elong + 22.5, 360) / 45);",
  "variable.phase = math.mod(variable.raw_idx + 4, 8);",
  "variable.dl = math.atan2(math.sin(variable.d - 180), math.cos(variable.d - 180));",
  "variable.ecl_d = math.sqrt(math.pow(variable.dl / 3.0, 2) + math.pow(variable.bmoon, 2));",
  "variable.blood_intensity = math.clamp((0.96 - variable.ecl_d) / 0.52, 0, 1);",
  "variable.par = query.position(2) / 63710 * 2.9;",
  "variable.sep = math.sqrt(math.pow(variable.dwrap, 2) + math.pow(variable.bmoon + variable.par, 2));",
  "variable.eclipse = math.clamp((1.2 - variable.sep) / 0.7, 0, 1);",
  "variable.day_alpha = math.lerp(1.0, 0.5, math.clamp(math.sin(query.time_of_day * 360), 0, 1));"
].join(" ");

const MOON_TINT = [
  "(1.0 - variable.eclipse) * (query.graphics_mode_is_any('deferred') ? math.lerp(10.0, 2.0, variable.blood_intensity) : 1.0)",
  "((1.0 - (variable.blood_intensity * 0.8)) * (1.0 - variable.eclipse)) * (query.graphics_mode_is_any('deferred') ? math.lerp(10.0, 1.0, variable.blood_intensity) : 1.0)",
  "((1.0 - (variable.blood_intensity * 0.8)) * (1.0 - variable.eclipse)) * (query.graphics_mode_is_any('deferred') ? math.lerp(10.0, 1.0, variable.blood_intensity) : 1.0)",
  "math.lerp(math.lerp(0.1, 1.0, variable.day_alpha), 0.9, variable.eclipse)"
];

export function buildMoonParticleJson(cfg = CELESTIAL_DEFAULTS.moon) {
  const billboard = {
    size: cfg.size || [80, 80],
    facing_camera_mode: "lookat_xyz",
    uv: cfg.uv || CELESTIAL_DEFAULTS.moon.uv
  };

  return {
    format_version: "1.10.0",
    particle_effect: {
      description: {
        identifier: cfg.identifier || "astrum:moon_particle",
        basic_render_parameters: {
          material: cfg.material || "particles_blend",
          texture: cfg.texture || "textures/environment/moon_phasesASTRUM"
        }
      },
      components: {
        "minecraft:emitter_local_space": { position: true, rotation: false },
        "minecraft:emitter_rate_instant": { num_particles: 1 },
        "minecraft:emitter_lifetime_looping": { active_time: 1 },
        "minecraft:emitter_shape_point": { offset: [0, 250, 0] },
        "minecraft:particle_lifetime_expression": { max_lifetime: 1.0 },
        "minecraft:particle_initialization": { per_update_expression: MOON_PHASE_MOLANG },
        "minecraft:particle_initial_speed": 0,
        "minecraft:particle_appearance_billboard": billboard,
        "minecraft:particle_appearance_lighting": {},
        "minecraft:particle_appearance_tinting": { color: [...MOON_TINT] }
      }
    }
  };
}
