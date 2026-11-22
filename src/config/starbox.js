// Starbox faces. Values mirror base/particles/star_field_<face>_stars.particle.json and star_field_<face>.particle.json.
// At startup the particle files in public/particles overwrite these values (see particles/configOverrides.js).
export const STARBOX_FACES = {
  px: {
    id: "star_field_px_stars",
    identifier: "astrum:star_field_px_stars",
    material: "starfield:sun_moon",
    texture: "textures/normal_px",
    constTexture: "textures/const_px",
    offset: [-272, 0, 0],
    size: [256, 256],
    facing: "emitter_transform_yz",
    active_time: 1,
    max_lifetime: 1
  },
  nx: {
    id: "star_field_nx_stars",
    identifier: "astrum:star_field_nx_stars",
    material: "starfield:sun_moon",
    texture: "textures/normal_nx",
    constTexture: "textures/const_nx",
    offset: [272, 0, 0],
    size: [256, 256],
    facing: "emitter_transform_yz",
    active_time: 1,
    max_lifetime: 1
  },
  py: {
    id: "star_field_py_stars",
    identifier: "astrum:star_field_py_stars",
    material: "starfield:sun_moon",
    texture: "textures/normal_py",
    constTexture: "textures/const_py",
    offset: [0, -272, 0],
    size: [256, 256],
    facing: "emitter_transform_xz",
    active_time: 1,
    max_lifetime: 1
  },
  ny: {
    id: "star_field_ny_stars",
    identifier: "astrum:star_field_ny_stars",
    material: "starfield:sun_moon",
    texture: "textures/normal_ny",
    constTexture: "textures/const_ny",
    offset: [0, 272, 0],
    size: [256, 256],
    facing: "emitter_transform_xz",
    active_time: 1,
    max_lifetime: 1
  },
  pz: {
    id: "star_field_pz_stars",
    identifier: "astrum:star_field_pz_stars",
    material: "starfield:sun_moon",
    texture: "textures/normal_pz",
    constTexture: "textures/const_pz",
    offset: [0, 0, 272],
    size: [256, 256],
    facing: "emitter_transform_xy",
    active_time: 1,
    max_lifetime: 1
  },
  nz: {
    id: "star_field_nz_stars",
    identifier: "astrum:star_field_nz_stars",
    material: "starfield:sun_moon",
    texture: "textures/normal_nz",
    constTexture: "textures/const_nz",
    offset: [0, 0, -272],
    size: [256, 256],
    facing: "emitter_transform_xy",
    active_time: 1,
    max_lifetime: 1
  }
};
