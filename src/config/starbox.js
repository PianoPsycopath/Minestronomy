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
