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
