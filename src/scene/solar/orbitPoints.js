import { cos, sin } from "../../core/math.js";
import { planetOrbit, solarTerms } from "../../core/astronomy/index.js";
import { ORBIT_SAMPLES } from "./solarSettings.js";

export function planetOrbitPoints(planet) {
  return Array.from({ length: ORBIT_SAMPLES }, (_, i) => planetOrbit(planet, (i / ORBIT_SAMPLES) * planet.el[0]));
}

// The model moves the Sun around the Earth. The Earth position is the opposite of the Sun direction.
export function earthOrbitPoints() {
  return Array.from({ length: ORBIT_SAMPLES }, (_, i) => {
    const { ls, er } = solarTerms((i / ORBIT_SAMPLES) * 365.25);
    return { x: -er * cos(ls), y: -er * sin(ls), z: 0 };
  });
}