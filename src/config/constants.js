export const E = 23.5;
export const K = 3.0;
export const OM0 = 101.1;
export const EARTH_RADIUS_BLOCKS = 63710;

export const PLN = {
  mercury: {
    el: [87.969, 252.25032, 77.4578, 0.20563593, 0.38709927, 7.00497902, 48.33076593],
    peak: 0.55,
    fmax: 6.4068,
    size: 3,
    col: "216,210,198"
  },
  venus: {
    el: [224.701, 181.9791, 131.60247, 0.00677672, 0.72333566, 3.39467605, 76.67984255],
    peak: 1.0,
    fmax: 3.0007,
    size: 5,
    col: "255,247,224"
  },
  mars: {
    el: [686.98, 355.45332, 336.04084, 0.0933941, 1.52371034, 1.84969142, 49.55953891],
    peak: 0.75,
    fmax: 3.7634,
    size: 4,
    col: "255,89,51"
  },
  jupiter: {
    el: [4332.59, 34.39644, 14.72848, 0.04838624, 5.202887, 1.30439695, 100.47390909],
    peak: 0.85,
    fmax: 0.0026,
    size: 4.5,
    col: "255,235,204"
  },
  saturn: {
    el: [10759.22, 49.95424, 92.59888, 0.05386179, 9.53667594, 2.48599187, 113.66242448],
    peak: 0.6,
    fmax: 0.0002,
    size: 4,
    col: "255,224,153"
  }
};

export const VIS = {
  mercury: [-5, -1],
  venus: [-6, 0],
  mars: [-9, -3],
  jupiter: [-8, -2],
  saturn: [-10, -4]
};

export const PH = [
  "Full",
  "Waning gibbous",
  "Third quarter",
  "Waning crescent",
  "New",
  "Waxing crescent",
  "First quarter",
  "Waxing gibbous"
];

export const DOW_NAMES = [
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
  "Monday"
];

export const DOW_SHORT = ["TUE", "WED", "THU", "FRI", "SAT", "SUN", "MON"];

export const MONTHS = [
  { name: "January", short: "JAN", days: 31 },
  { name: "February", short: "FEB", days: 28 },
  { name: "March", short: "MAR", days: 31 },
  { name: "April", short: "APR", days: 30 },
  { name: "May", short: "MAY", days: 31 },
  { name: "June", short: "JUN", days: 30 },
  { name: "July", short: "JUL", days: 31 },
  { name: "August", short: "AUG", days: 31 },
  { name: "September", short: "SEP", days: 30 },
  { name: "October", short: "OCT", days: 31 },
  { name: "November", short: "NOV", days: 30 },
  { name: "December", short: "DEC", days: 31 }
];