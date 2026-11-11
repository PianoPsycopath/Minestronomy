import { COMETS, EARTH_RADIUS_BLOCKS, PLN } from "../../config/index.js";

export function buildStarAnimationJson() {
  const bones = {
    sky_tilt: { rotation: ["-variable.astrum_tilt_cancel", 0, 0] },
    sky_anchor: { rotation: ["-this", "-this - query.body_y_rotation", "-this"] },
    latitude_anchor: {
      rotation: [`(math.clamp(query.position(2) / ${EARTH_RADIUS_BLOCKS}, -1, 1) * -90)`, 0, 0]
    },
    bone_skybox: {
      rotation: [90, 0, "(query.time_of_day * -360) - ((query.day + query.time_of_day) / 365.25 * 360)"]
    },
    bone_sun_pivot: { rotation: [0, 0, "variable.astrum_sun_z"] },
    bone_sun_declination: { rotation: ["variable.astrum_sun_dec", 0, 0] },
    bone_moon_pivot: { rotation: [0, 0, "variable.astrum_moon_z"] },
    bone_moon_declination: { rotation: ["variable.astrum_moon_dec", 0, 0] }
  };

  for (const n of Object.keys(PLN)) {
    bones[`bone_${n}_pivot`] = { rotation: [0, 0, `variable.astrum_${n}_z`] };
    bones[`bone_${n}_declination`] = { rotation: [`variable.astrum_${n}_dec`, 0, 0] };
  }

  for (const key of Object.keys(COMETS)) {
    bones[`bone_${key}_pivot`] = { rotation: [0, 0, `variable.astrum_${key}_zrot`] };
    bones[`bone_${key}_declination`] = { rotation: [`variable.astrum_${key}_dec`, 0, 0] };
  }

  return {
    format_version: "1.8.0",
    animations: {
      "animation.astrum.sky_rotation": {
        loop: true,
        bones
      }
    }
  };
}
