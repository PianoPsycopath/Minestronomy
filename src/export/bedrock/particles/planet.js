import { D, RD } from "../../../core/math.js";
import { EARTH_RADIUS_BLOCKS, VIS } from "../../../config/index.js";

export function buildPlanetParticleJson(name, pCfg, isHiRes = false) {
  const [P, L0, w, e, a, inc, Om] = pCfg.el;
  const M0 = +(L0 - w).toFixed(5);
  const c1 = +((2 * e - e ** 3 / 4) * RD).toFixed(6);
  const c2 = +(1.25 * e * e * RD).toFixed(6);
  const c3 = +((13 / 12) * e ** 3 * RD).toFixed(6);
  const pSemi = +(a * (1 - e * e)).toFixed(6);
  const eRound = +e.toFixed(6);
  const wMinusOm = +(w - Om).toFixed(6);
  const cosOm = +Math.cos(Om * D).toFixed(6);
  const sinOm = +Math.sin(Om * D).toFixed(6);
  const cosInc = +Math.cos(inc * D).toFixed(6);
  const sinInc = +Math.sin(inc * D).toFixed(6);
  const [v0, v1] = VIS[name] || [-9, -3];
  const vSpan = v1 - v0;

  const expr = [
    "variable.t = query.day + query.time_of_day;",
    "variable.me = (variable.t - 3) / 365.25 * 360;",
    "variable.ls = (variable.t - 80) / 365.25 * 360 + 1.915 * math.sin(variable.me) + 0.02 * math.sin(2 * variable.me);",
    "variable.er = 1 - 0.0167 * math.cos(variable.me);",
    `variable.p_m = ${M0} + variable.t / ${P} * 360;`,
    `variable.p_nu = variable.p_m + ${c1} * math.sin(variable.p_m) + ${c2} * math.sin(2 * variable.p_m) + ${c3} * math.sin(3 * variable.p_m);`,
    `variable.p_r = ${pSemi} / (1 + ${eRound} * math.cos(variable.p_nu));`,
    `variable.p_u = variable.p_nu + ${wMinusOm};`,
    `variable.p_x = variable.p_r * (${cosOm} * math.cos(variable.p_u) - ${sinOm} * math.sin(variable.p_u) * ${cosInc}) + variable.er * math.cos(variable.ls);`,
    `variable.p_y = variable.p_r * (${sinOm} * math.cos(variable.p_u) + ${cosOm} * math.sin(variable.p_u) * ${cosInc}) + variable.er * math.sin(variable.ls);`,
    `variable.p_z = variable.p_r * math.sin(variable.p_u) * ${sinInc};`,
    "variable.dist = math.sqrt(variable.p_x * variable.p_x + variable.p_y * variable.p_y + variable.p_z * variable.p_z);",
    "variable.cosa = (variable.p_r * variable.p_r + variable.dist * variable.dist - variable.er * variable.er) / (2 * variable.p_r * variable.dist);",
    "variable.f = (1 + variable.cosa) / 2 / (variable.p_r * variable.p_r * variable.dist * variable.dist);",
    `variable.bright = ${pCfg.peak} * math.clamp(math.pow(variable.f / ${pCfg.fmax}, 0.35), 0.12, 1);`,
    "variable.lm = (variable.t - 80) / 365.25 * 360;",
    `variable.phi = math.clamp(-query.position(2) / ${EARTH_RADIUS_BLOCKS}, -1, 1) * 90;`,
    "variable.rs = math.atan2(math.cos(23.5) * math.sin(variable.ls), math.cos(variable.ls));",
    "variable.ds = math.asin(math.sin(23.5) * math.sin(variable.ls));",
    "variable.hs = query.time_of_day * 360 + 180 + variable.lm - variable.rs;",
    "variable.salt = math.asin(math.sin(variable.phi) * math.sin(variable.ds) + math.cos(variable.phi) * math.cos(variable.ds) * math.cos(variable.hs));",
    `variable.vis = math.clamp((${v1} - variable.salt) / ${vSpan}, 0, 1);`
  ].join(" ");

  const bSize = pCfg.billboardSize || [pCfg.size, pCfg.size];
  const finalSize = isHiRes ? [bSize[0] * 2.5, bSize[1] * 2.5] : bSize;
  const tint = pCfg.tint || [1.0, 1.0, 1.0];

  return {
    format_version: "1.10.0",
    particle_effect: {
      description: {
        identifier: isHiRes ? `astrum:${name}_hires_particle` : `astrum:${name}_particle`,
        basic_render_parameters: {
          material: pCfg.material || "particles_add",
          texture: pCfg.texture || "textures/environment/planet"
        }
      },
      components: {
        "minecraft:emitter_local_space": { position: true, rotation: false },
        "minecraft:emitter_rate_instant": { num_particles: 1 },
        "minecraft:emitter_lifetime_looping": { active_time: 1 },
        "minecraft:emitter_shape_point": { offset: [0, 250, 0] },
        "minecraft:particle_lifetime_expression": { max_lifetime: 1.0 },
        "minecraft:particle_initialization": { per_update_expression: expr },
        "minecraft:particle_initial_speed": 0,
        "minecraft:particle_appearance_billboard": {
          size: finalSize,
          facing_camera_mode: "lookat_xyz"
        },
        "minecraft:particle_appearance_tinting": {
          color: [
            tint[0],
            tint[1],
            tint[2],
            "query.graphics_mode_is_any('deferred') ? variable.vis * variable.bright : 0.0"
          ]
        }
      }
    }
  };
}
