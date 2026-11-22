import { COMETS, EARTH_RADIUS_BLOCKS } from "../../../config/index.js";
import { cometOrbitTime, cometPhaseOffset, cometTailIdentifier } from "../molang/comet.js";
import { num } from "../molang/format.js";

const DEFERRED_ALPHA = "query.graphics_mode_is_any('deferred') ? variable.vis * variable.bright";
const v = n => `variable.${n}`;

// Days before aphelion over which a comet without a visibility window fades out.
const ALWAYS_ON_FADE_DAYS = 40;

function cometOf(key) {
  const C = COMETS[key];
  if (!C) throw new Error(`Unknown comet "${key}"`);
  return C;
}

// How much of the tail points away from the viewer. A tail seen end-on is hidden.
function forwardStatement() {
  return `${v("fore")} = math.clamp(math.sqrt(${v("te")} * ${v("te")} + ${v("tn")} * ${v("tn")}) / ${v("r")}, 0, 1);`;
}

// The Molang of the coma particle, as a list of statements. It mirrors base/particles/comet*_particle.json.
// A particle cannot read player variables, so it recomputes the whole orbit on every update.
function headStatements(C) {
  const [P0, P1] = C.P;
  const [Q0, Q1, Q2] = C.Q;
  const windowed = C.window != null;
  const hasElong = Boolean(C.elongFade);
  const halfPeriod = C.period / 2;

  const s = [
    // The same sunrise correction as variable.astrum_t in the player entity.
    `${v("t")} = query.day + query.time_of_day + (query.time_of_day < 0.25 ? 1 : 0);`,
    `${v("dt")} = math.mod(${v("t")} + ${cometPhaseOffset(C)}, ${num(C.period)}) - ${num(halfPeriod)};`
  ];
  if (windowed) {
    s.push(
      `${v("on")} = math.abs(${v("dt")}) < ${num(C.window)};`,
      `${v("fade")} = ${v("on")} ? (math.clamp((${num(C.window)} - math.abs(${v("dt")})) / ${num(C.window / 5)}, 0, 1)) : 0;`
    );
  }

  const orbitTime = cometOrbitTime(C, v("dt"));
  s.push(
    `${v("me")} = (${v("t")} - 3) / 365.25 * 360;`,
    `${v("ls")} = (${v("t")} - 80) / 365.25 * 360 + 1.915 * math.sin(${v("me")}) + 0.02 * math.sin(2 * ${v("me")});`,
    `${v("er")} = 1 - 0.0167 * math.cos(${v("me")});`,
    windowed
      ? `${v("w")} = ${v("on")} ? (${num(C.rate)} * ${orbitTime}) : 0;`
      : `${v("w")} = ${num(C.rate)} * ${orbitTime};`,
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
    `${v("dist")} = math.max(math.sqrt(${v("gx")} * ${v("gx")} + ${v("gy")} * ${v("gy")} + ${v("gz")} * ${v("gz")}), 0.001);`
  );
  if (hasElong) {
    // Angle between the comet and the Sun, seen from the Earth.
    s.push(
      `${v("elong")} = math.acos(math.clamp((${v("gx")} * math.cos(${v("ls")}) + ${v("gy")} * math.sin(${v("ls")})) / ${v("dist")}, -1, 1));`
    );
  }
  s.push(
    `${v("ey")} = ${v("gy")} * math.cos(23.5) - ${v("gz")} * math.sin(23.5);`,
    `${v("ez")} = ${v("gy")} * math.sin(23.5) + ${v("gz")} * math.cos(23.5);`,
    `${v("ra")} = math.atan2(${v("ey")}, ${v("gx")});`,
    `${v("dec")} = math.asin(${v("ez")} / ${v("dist")});`,
    `${v("ty")} = ${v("hy")} * math.cos(23.5) - ${v("hz")} * math.sin(23.5);`,
    `${v("tz")} = ${v("hy")} * math.sin(23.5) + ${v("hz")} * math.cos(23.5);`,
    `${v("te")} = -math.sin(${v("ra")}) * ${v("hx")} + math.cos(${v("ra")}) * ${v("ty")};`,
    `${v("tn")} = -math.sin(${v("dec")}) * (math.cos(${v("ra")}) * ${v("hx")} + math.sin(${v("ra")}) * ${v("ty")}) + math.cos(${v("dec")}) * ${v("tz")};`,
    `${v("rot")} = ${num(C.tailSign)} * math.atan2(${v("te")}, ${v("tn")}) + ${num(C.tailOffset)};`
  );
  if (hasElong) {
    s.push(forwardStatement());
  }

  const rPow = C.fluxRPow === 2 ? `${v("r")} * ${v("r")}` : `math.pow(${v("r")}, ${num(C.fluxRPow)})`;
  s.push(`${v("flux")} = ${num(C.fluxScale)} / (${rPow} * ${v("dist")} * ${v("dist")});`);

  const fluxTerm = `math.clamp(math.pow(${v("flux")} / ${num(C.fluxRef)}, ${num(C.fluxPow)}), 0, 1)`;
  const elongTerm = hasElong ? ` * math.clamp((${v("elong")} - ${num(C.elongFade[0])}) / ${num(C.elongFade[1])}, 0, 1)` : "";
  const distanceTerm = `math.clamp((${num(C.brightFade)} - ${v("r")}) / 2, 0, 1)`;
  if (windowed) {
    s.push(`${v("bright")} = ${v("on")} ? ${fluxTerm}${elongTerm} * ${distanceTerm} * ${v("fade")} : 0;`);
  } else {
    s.push(
      `${v("fade")} = math.clamp((${num(halfPeriod)} - math.abs(${v("dt")})) / ${ALWAYS_ON_FADE_DAYS}, 0, 1);`,
      `${v("bright")} = ${fluxTerm}${elongTerm} * ${distanceTerm} * ${v("fade")};`
    );
  }

  const sizeBy = C.tfBy === "dist" ? v("dist") : v("r");
  const size = `(${num(C.sizeBase)} + ${num(C.sizeGain)} * math.pow(${v("tf")}, 1.5))`;
  s.push(
    `${v("tf")} = math.clamp(${num(C.tfRef)} / ${sizeBy}, 0, 1);`,
    `${v("size")} = ${C.sizeScale === 1 ? size : `${size} * ${num(C.sizeScale)}`};`,
    `${v("lm")} = (${v("t")} - 80) / 365.25 * 360;`,
    `${v("phi")} = math.clamp(-query.position(2) / ${EARTH_RADIUS_BLOCKS}, -1, 1) * 90;`,
    `${v("rs")} = math.atan2(math.cos(23.5) * math.sin(${v("ls")}), math.cos(${v("ls")}));`,
    `${v("ds")} = math.asin(math.sin(23.5) * math.sin(${v("ls")}));`,
    `${v("hs")} = query.time_of_day * 360 + 180 + ${v("lm")} - ${v("rs")};`,
    `${v("salt")} = math.asin(math.sin(${v("phi")}) * math.sin(${v("ds")}) + math.cos(${v("phi")}) * math.cos(${v("ds")}) * math.cos(${v("hs")}));`,
    `${v("vis")} = math.clamp((${num(C.visBase)} + ${num(C.visGain)} * math.pow(${v("bright")}, 3) - ${v("salt")}) / ${num(C.visSpan)}, 0, 1);`
  );
  return s;
}

// The tail particle repeats the coma Molang and adds the tail direction: away from the Sun, as a position angle.
function tailStatements(C) {
  const s = headStatements(C);
  if (C.elongFade) {
    // This variant already computes "fore" in the coma. The tail drops the coma's rot, because it sets its own below.
    // The slot stays as an empty string, because base/ leaves a double space there. It makes no difference to Molang.
    const i = s.findIndex(x => x.startsWith(`${v("rot")} =`));
    s[i] = "";
  } else {
    s.push(forwardStatement());
  }
  s.push(
    `${v("fl")} = math.clamp(${v("fore")}, 0, 1);`,
    `${v("tv")} = math.clamp((${v("fl")} - 0.05) / 0.25, 0, 1);`,
    `${v("sg")} = ${num(C.tailSign)};`,
    `${v("pa0")} = ${num(C.tailOffset)};`,
    `${v("dbg")} = -1;`,
    `${v("dra")} = ${v("rs")} - ${v("ra")};`,
    `${v("pa_sun")} = math.atan2(math.sin(${v("dra")}) * math.cos(${v("ds")}), math.cos(${v("dec")}) * math.sin(${v("ds")}) - math.sin(${v("dec")}) * math.cos(${v("ds")}) * math.cos(${v("dra")}));`,
    `${v("pa_tail")} = ${v("pa_sun")} + 180;`,
    `${v("rot")} = ${v("dbg")} >= 0 ? ${v("dbg")} : ${v("sg")} * (${v("pa_tail")} - ${v("pa0")});`
  );
  return s;
}

function particleJson({ identifier, material, texture, offsetY, expr, motion, size, alpha, tint }) {
  const components = {
    "minecraft:emitter_local_space": { position: true, rotation: true },
    "minecraft:emitter_rate_instant": { num_particles: 1 },
    "minecraft:emitter_lifetime_looping": { active_time: 1 },
    "minecraft:emitter_shape_point": { offset: [0, offsetY, 0] },
    "minecraft:particle_lifetime_expression": { max_lifetime: 1 },
    "minecraft:particle_initialization": { per_update_expression: expr },
    "minecraft:particle_initial_speed": 0
  };
  if (motion) {
    components["minecraft:particle_motion_parametric"] = { rotation: "variable.rot" };
  }
  components["minecraft:particle_appearance_billboard"] = { size, facing_camera_mode: "emitter_transform_xz" };
  components["minecraft:particle_appearance_tinting"] = { color: [tint[0], tint[1], tint[2], alpha] };

  return {
    format_version: "1.10.0",
    particle_effect: {
      description: { identifier, basic_render_parameters: { material, texture } },
      components
    }
  };
}

// The bright round head of the comet. base/particles/<key>_particle.json
export function buildCometParticleJson(key = "comet") {
  const C = cometOf(key);
  const scaled = `variable.size * ${num(C.comaScale)}`;
  return particleJson({
    identifier: C.identifier,
    material: C.material,
    texture: C.texture,
    offsetY: C.emitterDistance,
    expr: headStatements(C).join(" "),
    motion: false,
    size: [scaled, scaled],
    alpha: `${DEFERRED_ALPHA} : 0.0`,
    tint: C.tint
  });
}

// The tail of the comet. It turns away from the Sun and fades when seen end-on. base/particles/<key>_tail_particle.json
export function buildCometTailParticleJson(key = "comet") {
  const C = cometOf(key);
  const scale = C.tailScale == null ? "" : ` * ${num(C.tailScale)}`;
  return particleJson({
    identifier: cometTailIdentifier(C),
    material: C.material,
    texture: C.tailTexture,
    offsetY: C.emitterDistance,
    expr: tailStatements(C).join(" "),
    motion: true,
    size: [`variable.size${scale}`, `variable.size${scale} * math.max(variable.fl, 0.25)`],
    alpha: `${DEFERRED_ALPHA} * variable.tv : 0.0`,
    tint: C.tint
  });
}
