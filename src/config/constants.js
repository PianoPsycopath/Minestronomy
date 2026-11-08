export const E = 23.5;
export const K = 3.0;
export const OM0 = 101.1;
export const EARTH_RADIUS_BLOCKS = 63710;

export const STARBOX_FACES = {
  px: {
    id: "star_field_px_stars",
    identifier: "astrum:star_field_px_stars",
    texture: "textures/normal_px",
    offset: [-256, 0, 0],
    size: [256, 256],
    facing: "emitter_transform_yz",
    active_time: 1,
    sleep_time: 0,
    max_lifetime: 1.1
  },
  nx: {
    id: "star_field_nx_stars",
    identifier: "astrum:star_field_nx_stars",
    texture: "textures/normal_nx",
    offset: [256, 0, 0],
    size: [256, 256],
    facing: "emitter_transform_yz",
    active_time: 1,
    max_lifetime: 1.0
  },
  py: {
    id: "star_field_py_stars",
    identifier: "astrum:star_field_py_stars",
    texture: "textures/normal_py",
    offset: [0, -256, 0],
    size: [256, 256],
    facing: "emitter_transform_xz",
    active_time: 1,
    max_lifetime: 1.0
  },
  ny: {
    id: "star_field_ny_stars",
    identifier: "astrum:star_field_ny_stars",
    texture: "textures/normal_ny",
    offset: [0, 256, 0],
    size: [256, 256],
    facing: "emitter_transform_xz",
    active_time: 1,
    max_lifetime: 1.0
  },
  pz: {
    id: "star_field_pz_stars",
    identifier: "astrum:star_field_pz_stars",
    texture: "textures/normal_pz",
    offset: [0, 0, 256],
    size: [256, 256],
    facing: "emitter_transform_xy",
    active_time: 1,
    max_lifetime: 1.0
  },
  nz: {
    id: "star_field_nz_stars",
    identifier: "astrum:star_field_nz_stars",
    texture: "textures/normal_nz",
    offset: [0, 0, -256],
    size: [256, 256],
    facing: "emitter_transform_xy",
    active_time: 1,
    max_lifetime: 1.0
  }
};

export const CELESTIAL_DEFAULTS = {
  sun: {
    identifier: "astrum:sun_particle",
    material: "particles_alpha",
    texture: "textures/environment/sunAstrum",
    size: [80, 80],
    uv: { texture_width: 32, texture_height: 32, uv: [0, 0], uv_size: [32, 32] },
    tint: [1.0, 1.0, 1.0]
  },
  moon: {
    identifier: "astrum:moon_particle",
    material: "particles_alpha",
    texture: "textures/environment/moon_phases",
    size: [80, 80],
    atlasCols: 4,
    atlasRows: 2,
    uv: null,
    tint: [1.0, 1.0, 1.0]
  }
};

export const PLN = {
  mercury: {
    el: [87.969, 252.25032, 77.4578, 0.20563593, 0.38709927, 7.00497902, 48.33076593],
    peak: 0.55,
    fmax: 6.4068,
    size: 3,
    col: "216,210,198",
    tint: [0.85, 0.82, 0.78],
    texture: "textures/environment/planet",
    material: "particles_add"
  },
  venus: {
    el: [224.701, 181.9791, 131.60247, 0.00677672, 0.72333566, 3.39467605, 76.67984255],
    peak: 1.0,
    fmax: 3.0007,
    size: 5,
    col: "255,247,224",
    tint: [1.0, 0.97, 0.88],
    texture: "textures/environment/planet",
    material: "particles_add"
  },
  mars: {
    el: [686.98, 355.45332, 336.04084, 0.0933941, 1.52371034, 1.84969142, 49.55953891],
    peak: 0.75,
    fmax: 3.7634,
    size: 4,
    col: "255,89,51",
    tint: [1.0, 0.35, 0.2],
    texture: "textures/environment/planet",
    material: "particles_add"
  },
  jupiter: {
    el: [4332.59, 34.39644, 14.72848, 0.04838624, 5.202887, 1.30439695, 100.47390909],
    peak: 0.85,
    fmax: 0.0026,
    size: 4.5,
    col: "255,235,204",
    tint: [1.0, 0.92, 0.8],
    texture: "textures/environment/planet",
    material: "particles_add"
  },
  saturn: {
    el: [10759.22, 49.95424, 92.59888, 0.05386179, 9.53667594, 2.48599187, 113.66242448],
    peak: 0.6,
    fmax: 0.0002,
    size: 4,
    col: "255,224,153",
    tint: [1.0, 0.88, 0.6],
    texture: "textures/environment/planet",
    material: "particles_add"
  }
};

export const COMET_BASE = {
  material: "starfield:sun_moon",
  texture: "textures/environment/comet",
  fluxRef: 4.2,
  fluxPow: 0.3,
  brightFade: 6,        // clamp((6 - r) / 2, 0, 1)
  visBase: -4,          // vis = clamp((visBase + visGain * bright^3 - sunAlt) / visSpan, 0, 1)
  visGain: 30,
  visSpan: 6,
  sizeBase: 14,         // size = (base + gain * clamp(0.3 / r, 0, 1) ^ 1.5) * sizeScale
  sizeGain: 150,
  emitterDistance: 250, // particle offset used for the angular size
  tailSign: 1,          // Bedrock tuning knobs (kept in sync with the pack)
  tailOffset: 0,
  webTextureRot: 0      // extra rotation (deg) if your comet.png tail doesn't point up
};

export const COMETS = {
  comet: {
    key: "comet",
    label: "Original",
    short: "COM",
    identifier: "astrum:comet_particle",
    ...COMET_BASE,
    perihelionDay: 60,
    period: 365.25,
    window: null,
    rate: 0.17624,        // Barker's equation time scale
    q: 0.35,              // perihelion distance (AU)
    uOffset: 70,          // argument offset (deg)
    P: [0.882947, 0.469472],            // orbit-plane basis (ecliptic x,y)
    Q: [0.160568, -0.301986, 0.939693], // orbit-plane basis (ecliptic x,y,z)
    fluxScale: 1,
    sizeScale: 1,
    tint: [1.0, 1.0, 1.0]
  },
  comet_annual: {
    key: "comet_annual",
    label: "Annual",
    short: "ANN",
    identifier: "astrum:comet_annual_particle",
    ...COMET_BASE,
    perihelionDay: 200,
    period: 365.25,
    window: 90,
    rate: 0.07852,
    q: 0.6,
    uOffset: 130,
    P: [-0.866025, -0.5],
    Q: [0.489073, -0.847101, 0.207912],
    fluxScale: 0.4,
    sizeScale: 0.5,
    tint: [0.55, 1, 0.7]
  },
  comet_medium: {
    key: "comet_medium",
    label: "Medium",
    short: "MED",
    identifier: "astrum:comet_medium_particle",
    ...COMET_BASE,
    perihelionDay: 1500,
    period: 2556.75,      // 7 years: a whole number of years keeps Earth in the same place at every return
    window: 150,
    rate: 0.042741,
    q: 0.9,
    uOffset: 300,
    P: [-0.939693, -0.34202],
    Q: [0.280166, -0.769751, 0.573576],
    fluxScale: 1,
    sizeScale: 0.85,
    tint: [0.65, 0.8, 1]
  },
  comet_great_red: {
    key: "comet_great_red",
    label: "Great Red",
    short: "GRD",
    identifier: "astrum:comet_great_red_particle",
    ...COMET_BASE,
    perihelionDay: 4200,
    period: 9131,
    window: 200,
    rate: 0.291944,
    q: 0.25,
    uOffset: 20,
    P: [-0.788011, 0.615661],
    Q: [0.533179, 0.682437, 0.5],
    fluxScale: 4,
    sizeScale: 1.15,
    tint: [1, 0.45, 0.35]
  },
  comet_great_green: {
    key: "comet_great_green",
    label: "Great Green",
    short: "GGR",
    identifier: "astrum:comet_great_green_particle",
    ...COMET_BASE,
    perihelionDay: 2800,
    period: 7305,
    window: 200,
    rate: 0.144251,
    q: 0.4,
    uOffset: 200,
    P: [-0.258819, 0.965926],
    Q: [-0.167732, -0.044944, 0.984808],
    fluxScale: 6,
    sizeScale: 1.15,
    tint: [0.45, 1, 0.6]
  },
  comet_great_blue: {
    key: "comet_great_blue",
    label: "Great Blue",
    short: "GBL",
    identifier: "astrum:comet_great_blue_particle",
    ...COMET_BASE,
    perihelionDay: 11000,
    period: 18262,
    window: 260,
    rate: 0.628163,
    q: 0.15,
    uOffset: 250,
    P: [-0.848047, -0.52992],
    Q: [0.223953, -0.358401, 0.906308],
    fluxScale: 12,
    sizeScale: 1.15,
    tint: [0.5, 0.7, 1]
  },
  comet_super: {
    key: "comet_super",
    label: "Super",
    short: "SUP",
    identifier: "astrum:comet_super_particle",
    ...COMET_BASE,
    perihelionDay: 0,     // year 0 and every 100 years after (36525 d)
    period: 36525,
    window: 400,
    rate: 3.264033,
    q: 0.05,
    uOffset: 330,
    P: [0.601815, 0.798635],
    Q: [0.069606, -0.052452, 0.996195],
    fluxScale: 100,
    sizeScale: 1.3,
    tint: [1, 0.93, 0.75]
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