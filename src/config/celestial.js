// Sun and moon defaults. Values mirror base/particles/sun.particle.json and moon.particle.json.
export const CELESTIAL_DEFAULTS = {
  sun: {
    identifier: "astrum:sun_particle",
    material: "starfield:sun_moon",
    texture: "textures/environment/sunAstrum",
    size: [80, 80],
    uv: { texture_width: 32, texture_height: 32, uv: [0, 0], uv_size: [32, 32] },
    tint: [1.0, 1.0, 1.0],
    // In deferred lighting (Vibrant Visuals) each colour channel is multiplied up to this value. Outside of it the channel is 1.
    deferredBoost: [20.0, 18.0, 15.0]
  },
  moon: {
    identifier: "astrum:moon_particle",
    material: "particles_blend",
    texture: "textures/environment/moon_phasesASTRUM",
    size: [80, 80],
    atlasCols: 4,
    atlasRows: 2,
    // The phase atlas is 4 x 2 cells of 32 px. The phase index comes from the Molang in particles/moon.js.
    uv: {
      texture_width: 128,
      texture_height: 64,
      uv: ["math.mod(variable.phase, 4) * 32", "math.floor(variable.phase / 4) * 32"],
      uv_size: [32, 32]
    },
    tint: [1.0, 1.0, 1.0]
  }
};
