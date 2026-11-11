import { COMETS, EARTH_RADIUS_BLOCKS } from "../../../config/index.js";
import { cometPhaseOffset } from "../molang/comet.js";
import { num } from "../molang/format.js";

// The particle must recompute the orbit on every update, because particles cannot read player variables.
export function buildCometParticleJson(key = "comet") {
  const C = COMETS[key];
  if (!C) throw new Error(`Unknown comet "${key}"`);
  const v = n => `variable.${n}`;
  const [P0, P1] = C.P;
  const [Q0, Q1, Q2] = C.Q;
  const windowed = C.window != null;

  const head = [
    `${v("t")} = query.day + query.time_of_day;`,
    `${v("dt")} = math.mod(${v("t")} + ${cometPhaseOffset(C)}, ${num(C.period)}) - ${num(C.period / 2)};`
  ];
  if (windowed) {
    head.push(
      `${v("on")} = math.abs(${v("dt")}) < ${num(C.window)};`,
      `${v("fade")} = ${v("on")} ? (math.clamp((${num(C.window)} - math.abs(${v("dt")})) / ${num(C.window / 5)}, 0, 1)) : 0;`
    );
  }
  head.push(
    `${v("me")} = (${v("t")} - 3) / 365.25 * 360;`,
    `${v("ls")} = (${v("t")} - 80) / 365.25 * 360 + 1.915 * math.sin(${v("me")}) + 0.02 * math.sin(2 * ${v("me")});`,
    `${v("er")} = 1 - 0.0167 * math.cos(${v("me")});`,
    windowed
      ? `${v("w")} = ${v("on")} ? (${num(C.rate)} * ${v("dt")}) : 0;`
      : `${v("w")} = ${num(C.rate)} * ${v("dt")};`
  );

  const bright = windowed
    ? `${v("bright")} = ${v("on")} ? math.clamp(math.pow(${v("flux")} / ${num(C.fluxRef)}, ${num(C.fluxPow)}), 0, 1) * math.clamp((${num(C.brightFade)} - ${v("r")}) / 2, 0, 1) * ${v("fade")} : 0;`
    : `${v("bright")} = math.clamp(math.pow(${v("flux")} / ${num(C.fluxRef)}, ${num(C.fluxPow)}), 0, 1) * math.clamp((${num(C.brightFade)} - ${v("r")}) / 2, 0, 1);`;

  const sizeExpr =
    C.sizeScale === 1
      ? `(${num(C.sizeBase)} + ${num(C.sizeGain)} * math.pow(${v("tf")}, 1.5))`
      : `(${num(C.sizeBase)} + ${num(C.sizeGain)} * math.pow(${v("tf")}, 1.5)) * ${num(C.sizeScale)}`;

  const expr = [
    ...head,
    `${v("cb")} = math.pow(${v("w")} / 2 + math.sqrt(${v("w")} * ${v("w")} / 4 + 1), 0.333333);`,
    `${v("s")} = ${v("cb")} - 1 / ${v("cb")};`,
    `${v("r")} = math.max(${num(C.q)} * (1 + ${v("s")} * ${v("s")}), 0.001);`,
    `${v("u")} = 2 * math.atan2(${v("s")}, 1) + ${num(C.uOffset)};`,
    `${v("hx")} = ${v("r")} * (${num(P0)} * math.cos(${v("u")}) + ${num(Q0)} * math.sin(${v("u")}));`,
    `${v("hy")} = ${v("r")} * (${num(P1)} * math.cos(${v("u")}) + ${num(Q1)} * math.sin(${v("u")}));`,
    `${v("hz")} = ${v("r")} * math.sin(${v("u")}) * ${num(Q2)};`,
    `${v("gx")} = ${v("hx")} + ${v("er")} * math.cos(${v("ls")});`,
    `${v("gy")} = ${v("hy")} + ${v("er")} * math.sin(${v("ls")});`,
    `${v("gz")} = ${v("hz")};`,
    `${v("dist")} = math.max(math.sqrt(${v("gx")} * ${v("gx")} + ${v("gy")} * ${v("gy")} + ${v("gz")} * ${v("gz")}), 0.001);`,
    `${v("ey")} = ${v("gy")} * math.cos(23.5) - ${v("gz")} * math.sin(23.5);`,
    `${v("ez")} = ${v("gy")} * math.sin(23.5) + ${v("gz")} * math.cos(23.5);`,
    `${v("ra")} = math.atan2(${v("ey")}, ${v("gx")});`,
    `${v("dec")} = math.asin(${v("ez")} / ${v("dist")});`,
    `${v("ty")} = ${v("hy")} * math.cos(23.5) - ${v("hz")} * math.sin(23.5);`,
    `${v("tz")} = ${v("hy")} * math.sin(23.5) + ${v("hz")} * math.cos(23.5);`,
    `${v("te")} = -math.sin(${v("ra")}) * ${v("hx")} + math.cos(${v("ra")}) * ${v("ty")};`,
    `${v("tn")} = -math.sin(${v("dec")}) * (math.cos(${v("ra")}) * ${v("hx")} + math.sin(${v("ra")}) * ${v("ty")}) + math.cos(${v("dec")}) * ${v("tz")};`,
    `${v("rot")} = ${num(C.tailSign)} * math.atan2(${v("te")}, ${v("tn")}) + ${num(C.tailOffset)};`,
    `${v("flux")} = ${num(C.fluxScale)} / (math.pow(${v("r")}, 4) * ${v("dist")} * ${v("dist")});`,
    bright,
    `${v("tf")} = math.clamp(0.3 / ${v("r")}, 0, 1);`,
    `${v("size")} = ${sizeExpr};`,
    `${v("lm")} = (${v("t")} - 80) / 365.25 * 360;`,
    `${v("phi")} = math.clamp(-query.position(2) / ${EARTH_RADIUS_BLOCKS}, -1, 1) * 90;`,
    `${v("rs")} = math.atan2(math.cos(23.5) * math.sin(${v("ls")}), math.cos(${v("ls")}));`,
    `${v("ds")} = math.asin(math.sin(23.5) * math.sin(${v("ls")}));`,
    `${v("hs")} = query.time_of_day * 360 + 180 + ${v("lm")} - ${v("rs")};`,
    `${v("salt")} = math.asin(math.sin(${v("phi")}) * math.sin(${v("ds")}) + math.cos(${v("phi")}) * math.cos(${v("ds")}) * math.cos(${v("hs")}));`,
    `${v("vis")} = math.clamp((${num(C.visBase)} + ${num(C.visGain)} * math.pow(${v("bright")}, 3) - ${v("salt")}) / ${num(C.visSpan)}, 0, 1);`
  ].join(" ");

  const [tr, tg, tb] = C.tint;
  return {
    format_version: "1.10.0",
    particle_effect: {
      description: {
        identifier: C.identifier,
        basic_render_parameters: { material: C.material, texture: C.texture }
      },
      components: {
        "minecraft:emitter_local_space": { position: true, rotation: true },
        "minecraft:emitter_rate_instant": { num_particles: 1 },
        "minecraft:emitter_lifetime_looping": { active_time: 1 },
        "minecraft:emitter_shape_point": { offset: [0, C.emitterDistance, 0] },
        "minecraft:particle_lifetime_expression": { max_lifetime: 1.0 },
        "minecraft:particle_initialization": { per_update_expression: expr },
        "minecraft:particle_initial_speed": 0,
        "minecraft:particle_motion_parametric": { rotation: "variable.rot" },
        "minecraft:particle_appearance_billboard": {
          size: ["variable.size", "variable.size"],
          facing_camera_mode: "emitter_transform_xz"
        },
        "minecraft:particle_appearance_tinting": {
          color: [tr, tg, tb, "query.graphics_mode_is_any('deferred') ? variable.vis * variable.bright : 0.0"]
        }
      }
    }
  };
}
