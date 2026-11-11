import { sin, cos } from "../math.js";

export function solarTerms(t) {
  const lm = ((t - 80) / 365.25) * 360;
  const me = ((t - 3) / 365.25) * 360;
  return {
    lm,
    me,
    ls: lm + 1.915 * sin(me) + 0.02 * sin(2 * me),
    er: 1 - 0.0167 * cos(me)
  };
}
