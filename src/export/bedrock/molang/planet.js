import { D, RD } from "../../../core/math.js";

export function buildPlanetMolangLines(n, p) {
  const [P, L0, w, e, a, inc, Om] = p.el;
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

  return [
    `variable.astrum_${n}_m = ${M0} + variable.astrum_t / ${P} * 360;`,
    `variable.astrum_${n}_nu = variable.astrum_${n}_m + ${c1} * math.sin(variable.astrum_${n}_m) + ${c2} * math.sin(2 * variable.astrum_${n}_m) + ${c3} * math.sin(3 * variable.astrum_${n}_m);`,
    `variable.astrum_${n}_r = ${pSemi} / (1 + ${eRound} * math.cos(variable.astrum_${n}_nu));`,
    `variable.astrum_${n}_u = variable.astrum_${n}_nu + ${wMinusOm};`,
    `variable.astrum_${n}_x = variable.astrum_${n}_r * (${cosOm} * math.cos(variable.astrum_${n}_u) - ${sinOm} * math.sin(variable.astrum_${n}_u) * ${cosInc}) + variable.astrum_er * math.cos(variable.astrum_ls);`,
    `variable.astrum_${n}_y = variable.astrum_${n}_r * (${sinOm} * math.cos(variable.astrum_${n}_u) + ${cosOm} * math.sin(variable.astrum_${n}_u) * ${cosInc}) + variable.astrum_er * math.sin(variable.astrum_ls);`,
    `variable.astrum_${n}_z = variable.astrum_${n}_r * math.sin(variable.astrum_${n}_u) * ${sinInc};`,
    `variable.astrum_${n}_lam = math.atan2(variable.astrum_${n}_y, variable.astrum_${n}_x);`,
    `variable.astrum_${n}_beta = math.atan2(variable.astrum_${n}_z, math.sqrt(variable.astrum_${n}_x * variable.astrum_${n}_x + variable.astrum_${n}_y * variable.astrum_${n}_y));`,
    `variable.astrum_${n}_dec = math.asin(math.sin(variable.astrum_${n}_beta) * math.cos(23.5) + math.cos(variable.astrum_${n}_beta) * math.sin(23.5) * math.sin(variable.astrum_${n}_lam));`,
    `variable.astrum_${n}_ra = math.atan2(math.sin(variable.astrum_${n}_lam) * math.cos(23.5) - (math.sin(variable.astrum_${n}_beta) / math.cos(variable.astrum_${n}_beta)) * math.sin(23.5), math.cos(variable.astrum_${n}_lam));`,
    `variable.astrum_${n}_z = query.time_of_day * -360 + math.atan2(math.sin(variable.astrum_${n}_ra - variable.astrum_lm), math.cos(variable.astrum_${n}_ra - variable.astrum_lm));`
  ];
}
