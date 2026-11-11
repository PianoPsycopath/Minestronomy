// Default values for all comets. Each comet in COMETS overrides some of them.
// The resource pack uses the same formulas, so keep the values in sync with the pack.
// flux = fluxScale / (r^fluxRPow * dist^2). r is the distance from the Sun. dist is the distance from the Earth.
// brightness = clamp((flux / fluxRef)^fluxPow, 0, 1) * clamp((brightFade - r) / 2, 0, 1)
// visibility = clamp((visBase + visGain * brightness^3 - sunAlt) / visSpan, 0, 1)
// size = (sizeBase + sizeGain * clamp(tfRef / d, 0, 1)^1.5) * sizeScale. tfBy selects r or dist as d.
// elongFade = [start, span] in degrees. Brightness is multiplied by clamp((elong - start) / span, 0, 1).
// orbitOffset: the orbit time is rate * (dt + orbitOffset). True perihelion is perihelionDay - orbitOffset.
// window = null means the comet is always on. It fades over the last 40 days before aphelion.
export const COMET_BASE = {
  material: "starfield:sun_moon",
  texture: "textures/environment/comet",
  fluxRef: 4.2,
  fluxPow: 0.3,
  fluxRPow: 4,
  brightFade: 6,
  elongFade: null,
  orbitOffset: 0,
  visBase: -4,
  visGain: 30,
  visSpan: 6,
  sizeBase: 14,
  sizeGain: 150,
  tfRef: 0.3,
  tfBy: "r",
  emitterDistance: 250,
  tailSign: 1,
  tailOffset: 0,
  webTextureRot: 0
};

export const COMETS = {
  comet: {
    key: "comet",
    label: "Iron",
    short: "COM",
    identifier: "astrum:comet_particle",
    ...COMET_BASE,
    perihelionDay: 60,
    period: 365.25,
    window: null,
    rate: 0.17624,
    q: 0.35,
    uOffset: 70,
    P: [0.882947, 0.469472],
    Q: [0.160568, -0.301986, 0.939693],
    fluxScale: 1,
    sizeScale: 1,
    tint: [1.0, 1.0, 1.0]
  },
  comet_annual: {
    key: "comet_annual",
    label: "Emerald",
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
  // The period is 7 years. A whole number of years puts the Earth in the same place at each return.
  comet_medium: {
    key: "comet_medium",
    label: "Lapis",
    short: "MED",
    identifier: "astrum:comet_medium_particle",
    ...COMET_BASE,
    perihelionDay: 1500,
    period: 2556.75,
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
    label: "Ruby",
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
    label: "Jade",
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
    label: "Sapphire",
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
  // The visibility window is at year 0 and at every 100th year after (36525 days).
  // True perihelion is 36 days earlier.
  comet_super: {
    key: "comet_super",
    label: "Super",
    short: "SUP",
    identifier: "astrum:comet_super_particle",
    ...COMET_BASE,
    perihelionDay: 0,
    orbitOffset: 36,
    period: 36525,
    window: 400,
    rate: 3.264033,
    q: 0.05,
    uOffset: 24,
    P: [0.173648, -0.984808],
    Q: [-0.085832, -0.015134, 0.996195],
    fluxScale: 1,
    fluxRef: 60,
    fluxRPow: 2,
    elongFade: [12, 30],
    tfRef: 0.12,
    tfBy: "dist",
    visGain: 10,
    sizeScale: 1.3,
    tint: [1, 0.93, 0.75]
  }
};
