// Each planet gets a circle of this radius (degrees). Circles that touch form one conjunction group.
export const CONJ_RADIUS = 1;

// The list shows moon-planet passes closer than the larger of this value and (disc limit + 3) degrees.
export const MM_MIN_SEP = 6;

// A comet gets a bar on the days when its rendered brightness is above this value.
export const COMET_MIN_BRIGHT = 0.03;

// Days on each side of an exact event that the scan searches for a time when the event is visible.
export const OBS_HALF_WINDOW = 0.6;

export const EVENT_KINDS = {
  lun: { label: "Lunar Eclipses", color: "#d6453d" },
  sol: { label: "Solar Eclipses", color: "#e69a00" },
  mm: { label: "Moon–Planet", color: "#7a5cff" },
  pp: { label: "Planet–Planet", color: "#00a8a8" },
  opp: { label: "Oppositions & Elongations", color: "#2e9d62" },
  com: { label: "Comets", color: "#3a8dde" }
};
