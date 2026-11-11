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

// Sun altitude range (degrees) in which each planet fades in. First value: fully visible. Second value: fully hidden.
export const VIS = {
  mercury: [-5, -1],
  venus: [-6, 0],
  mars: [-9, -3],
  jupiter: [-8, -2],
  saturn: [-10, -4]
};
