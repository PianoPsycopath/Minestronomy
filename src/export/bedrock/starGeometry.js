import { COMETS, E, PLN } from "../../config/index.js";

export function buildStarGeoJson() {
  const bones = [
    { name: "sky_tilt", pivot: [0, 0, 0] },
    { name: "sky_anchor", parent: "sky_tilt", pivot: [0, 0, 0] },
    { name: "latitude_anchor", parent: "sky_anchor", pivot: [0, 0, 0] },
    {
      name: "bone_skybox",
      parent: "latitude_anchor",
      pivot: [0, 0, 0],
      rotation: [90, 0, 0],
      locators: { locator: [0, 0, 0] }
    },
    {
      name: "axial_tilt",
      parent: "bone_skybox",
      pivot: [0, 0, 0],
      rotation: [E, 0, 0]
    },
    { name: "bone_sun_pivot", parent: "latitude_anchor", pivot: [0, 0, 0], rotation: [0, 0, 0] },
    { name: "bone_sun_declination", parent: "bone_sun_pivot", pivot: [0, 0, 0], rotation: [0, 0, 0] },
    {
      name: "bone_sun",
      parent: "bone_sun_declination",
      pivot: [0, 0, 0],
      rotation: [0, 0, 0],
      locators: { locator_sun: [0, 0, 0] }
    },
    { name: "bone_moon_pivot", parent: "latitude_anchor", pivot: [0, 0, 0] },
    { name: "bone_moon_declination", parent: "bone_moon_pivot", pivot: [0, 0, 0] },
    {
      name: "bone_moon",
      parent: "bone_moon_declination",
      pivot: [0, 0, 0],
      locators: { locator_moon: [0, 0, 0] }
    }
  ];

  for (const n of Object.keys(PLN)) {
    bones.push(
      { name: `bone_${n}_pivot`, parent: "latitude_anchor", pivot: [0, 0, 0] },
      { name: `bone_${n}_declination`, parent: `bone_${n}_pivot`, pivot: [0, 0, 0] },
      {
        name: `bone_${n}`,
        parent: `bone_${n}_declination`,
        pivot: [0, 0, 0],
        locators: { [`locator_${n}`]: [0, 0, 0] }
      }
    );
  }

  for (const key of Object.keys(COMETS)) {
    bones.push(
      { name: `bone_${key}_pivot`, parent: "latitude_anchor", pivot: [0, 0, 0] },
      { name: `bone_${key}_declination`, parent: `bone_${key}_pivot`, pivot: [0, 0, 0] },
      {
        name: `bone_${key}`,
        parent: `bone_${key}_declination`,
        pivot: [0, 0, 0],
        locators: { [`locator_${key}`]: [0, 0, 0] }
      }
    );
  }

  return {
    format_version: "1.12.0",
    "minecraft:geometry": [
      {
        description: {
          identifier: "geometry.star_field",
          texture_width: 3072,
          texture_height: 2048,
          visible_bounds_width: 3,
          visible_bounds_height: 3,
          visible_bounds_offset: [0, 0, 0]
        },
        bones
      }
    ]
  };
}
