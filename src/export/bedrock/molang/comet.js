import { COMETS } from "../../../config/index.js";
import { num } from "./format.js";

// Constant A in dt = math.mod(t + A, period) - period / 2. Keeps the value positive, so math.mod never gets a negative number.
export function cometPhaseOffset(C) {
  const m = (C.period / 2 - C.perihelionDay) % C.period;
  return num((m + C.period) % C.period);
}

// Player entity Molang. Drives bone_<key>_pivot and bone_<key>_declination.
export function buildCometMolangLines(key) {
  const C = COMETS[key];
  const v = n => `variable.astrum_${key}_${n}`;
  const [P0, P1] = C.P;
  const [Q0, Q1, Q2] = C.Q;
  const windowed = C.window != null;
  const lines = [
    `${v("dt")} = math.mod(variable.astrum_t + ${cometPhaseOffset(C)}, ${num(C.period)}) - ${num(C.period / 2)};`
  ];
  if (windowed) {
    lines.push(`${v("on")} = math.abs(${v("dt")}) < ${num(C.window)};`);
    lines.push(`${v("w")} = ${v("on")} ? (${num(C.rate)} * ${v("dt")}) : 0;`);
  } else {
    lines.push(`${v("w")} = ${num(C.rate)} * ${v("dt")};`);
  }
  lines.push(
    `${v("cb")} = math.pow(${v("w")} / 2 + math.sqrt(${v("w")} * ${v("w")} / 4 + 1), 0.333333);`,
    `${v("s")} = ${v("cb")} - 1 / ${v("cb")};`,
    `${v("r")} = math.max(${num(C.q)} * (1 + ${v("s")} * ${v("s")}), 0.001);`,
    `${v("u")} = 2 * math.atan2(${v("s")}, 1) + ${num(C.uOffset)};`,
    `${v("gx")} = ${v("r")} * (${num(P0)} * math.cos(${v("u")}) + ${num(Q0)} * math.sin(${v("u")})) + variable.astrum_er * math.cos(variable.astrum_ls);`,
    `${v("gy")} = ${v("r")} * (${num(P1)} * math.cos(${v("u")}) + ${num(Q1)} * math.sin(${v("u")})) + variable.astrum_er * math.sin(variable.astrum_ls);`,
    `${v("gz")} = ${v("r")} * math.sin(${v("u")}) * ${num(Q2)};`,
    `${v("d")} = math.max(math.sqrt(${v("gx")} * ${v("gx")} + ${v("gy")} * ${v("gy")} + ${v("gz")} * ${v("gz")}), 0.001);`,
    `${v("ey")} = ${v("gy")} * math.cos(23.5) - ${v("gz")} * math.sin(23.5);`,
    `${v("ez")} = ${v("gy")} * math.sin(23.5) + ${v("gz")} * math.cos(23.5);`,
    `${v("ra")} = math.atan2(${v("ey")}, ${v("gx")});`,
    `${v("dec")} = math.asin(${v("ez")} / ${v("d")});`,
    `${v("zrot")} = query.time_of_day * -360 + math.atan2(math.sin(${v("ra")} - variable.astrum_lm), math.cos(${v("ra")} - variable.astrum_lm));`
  );
  return lines;
}
