import { D, RD } from "../core/math.js";
import { PLN, VIS, CELESTIAL_DEFAULTS, STARBOX_FACES, E, EARTH_RADIUS_BLOCKS } from "./constants.js";

function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function buildManifestJson(packName = "Minestronomy") {
  return {
    format_version: 2,
    header: {
      name: packName,
      description: "Minestronomy Client-Side Astronomical Sky Resource Pack",
      uuid: generateUUID(),
      version: [1, 0, 0],
      min_engine_version: [1, 20, 0]
    },
    modules: [
      {
        type: "resources",
        uuid: generateUUID(),
        version: [1, 0, 0]
      }
    ]
  };
}

export function buildEntityMaterialJson() {
  return {
    materials: {
      version: "1.0.0",
      "starfield:stars:particles_add": {
        "+defines": ["ALPHA_TEST", "USE_OVERLAY"],
        "+states": ["Blending"]
      }
    }
  };
}

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

export function buildStarEmitterJson() {
  const starsOnlyEffects = [
    { effect: "star_field_px_stars", locator: "locator" },
    { effect: "star_field_nx_stars", locator: "locator" },
    { effect: "star_field_py_stars", locator: "locator" },
    { effect: "star_field_ny_stars", locator: "locator" },
    { effect: "star_field_pz_stars", locator: "locator" },
    { effect: "star_field_nz_stars", locator: "locator" },
    { effect: "moon_particle", locator: "locator_moon" },
    { effect: "sun_particle", locator: "locator_sun" }
  ];

  const constEffects = [
    { effect: "star_field_px_const", locator: "locator" },
    { effect: "star_field_nx_const", locator: "locator" },
    { effect: "star_field_py_const", locator: "locator" },
    { effect: "star_field_ny_const", locator: "locator" },
    { effect: "star_field_pz_const", locator: "locator" },
    { effect: "star_field_nz_const", locator: "locator" },
    { effect: "moon_particle", locator: "locator_moon" },
    { effect: "sun_particle", locator: "locator_sun" }
  ];

  for (const n of Object.keys(PLN)) {
    starsOnlyEffects.push({ effect: `${n}_particle`, locator: `locator_${n}` });
    constEffects.push({ effect: `${n}_hires_particle`, locator: `locator_${n}` });
  }

  return {
    format_version: "1.10.0",
    animation_controllers: {
      "controller.animation.astrum.stars": {
        initial_state: "stars_only",
        states: {
          stars_only: {
            particle_effects: starsOnlyEffects,
            animations: ["sky_rotation"],
            transitions: [
              { constellations: "query.is_item_name_any('slot.weapon.mainhand', 'minecraft:spyglass')" }
            ]
          },
          constellations: {
            particle_effects: constEffects,
            animations: ["sky_rotation"],
            transitions: [
              { stars_only: "!query.is_item_name_any('slot.weapon.mainhand', 'minecraft:spyglass')" }
            ]
          }
        }
      }
    }
  };
}

export function buildStarRenderControllerJson() {
  return {
    format_version: "1.10.0",
    render_controllers: {
      "controller.render.star_field": {
        geometry: "Geometry.star_field",
        materials: [{ "*": "Material.calendar" }],
        textures: ["Texture.default"]
      }
    }
  };
}

export function buildCalendarRenderControllersJson() {
  const dayFormula =
    "(math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) < 31 ? (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) - 0 + 1) : (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) < 59 ? (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) - 31 + 1) : (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) < 90 ? (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) - 59 + 1) : (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) < 120 ? (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) - 90 + 1) : (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) < 151 ? (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) - 120 + 1) : (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) < 181 ? (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) - 151 + 1) : (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) < 212 ? (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) - 181 + 1) : (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) < 243 ? (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) - 212 + 1) : (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) < 273 ? (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) - 243 + 1) : (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) < 304 ? (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) - 273 + 1) : (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) < 334 ? (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) - 304 + 1) : (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) - 334 + 1))))))))))))";

  return {
    format_version: "1.10.0",
    render_controllers: {
      "controller.render.calendar.day_tens": {
        geometry: "Geometry.calendar_day_tens",
        materials: [{ "*": "Material.calendar" }],
        textures: ["Texture.Master_Digits_Atlas"],
        uv_anim: {
          offset: [0, `math.floor(math.floor(${dayFormula}) / 10) * 0.083333`],
          scale: [1, 1]
        }
      },
      "controller.render.calendar.day_ones": {
        geometry: "Geometry.calendar_day_ones",
        materials: [{ "*": "Material.calendar" }],
        textures: ["Texture.Master_Digits_Atlas"],
        uv_anim: {
          offset: [0, `math.mod(math.floor(${dayFormula}), 10) * 0.083333`],
          scale: [1, 1]
        }
      },
      "controller.render.calendar.month": {
        geometry: "Geometry.calendar_month",
        materials: [{ "*": "Material.calendar" }],
        textures: ["Texture.Master_Digits_Atlas"],
        uv_anim: {
          offset: [
            0.53846,
            "((math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) < 31 ? 0 : (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) < 59 ? 1 : (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) < 90 ? 2 : (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) < 120 ? 3 : (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) < 151 ? 4 : (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) < 181 ? 5 : (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) < 212 ? 6 : (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) < 243 ? 7 : (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) < 273 ? 8 : (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) < 304 ? 9 : (math.mod(query.time_of_day < 0.75 ? query.day : query.day + 1, 365) < 334 ? 10 : 11)))))))))))) * 0.083333"
          ],
          scale: [1, 1]
        }
      },
      "controller.render.calendar.weekday": {
        geometry: "Geometry.calendar_weekday",
        materials: [{ "*": "Material.calendar" }],
        textures: ["Texture.Master_Digits_Atlas"],
        uv_anim: {
          offset: [0.076923, "math.floor(math.mod((query.time_of_day < 0.75 ? query.day : query.day + 1), 7)) * 0.083333"],
          scale: [1, 1]
        }
      },
      "controller.render.clock.minute_tens": {
        geometry: "Geometry.clock_minute_tens",
        materials: [{ "*": "Material.calendar" }],
        textures: ["Texture.Master_Digits_Atlas"],
        uv_anim: {
          offset: [0, "math.mod((math.mod(math.floor(query.time_of_day * 24) + 11, 12)) + 1, 10) * 0.083333"],
          scale: [1, 1]
        }
      },
      "controller.render.clock.minute_ones": {
        geometry: "Geometry.clock_minute_ones",
        materials: [{ "*": "Material.calendar" }],
        textures: ["Texture.Master_Digits_Atlas"],
        uv_anim: {
          offset: [0, "math.floor(((math.mod(math.floor(query.time_of_day * 24) + 11, 12)) + 1) / 10) * 0.083333"],
          scale: [1, 1]
        }
      },
      "controller.render.clock.hour_tens": {
        geometry: "Geometry.clock_hour_tens",
        materials: [{ "*": "Material.calendar" }],
        textures: ["Texture.Master_Digits_Atlas"],
        uv_anim: {
          offset: [0, "math.mod(math.mod(math.floor(query.time_of_day * 288), 12) * 5, 10) * 0.083333"],
          scale: [1, 1]
        }
      },
      "controller.render.clock.hour_ones": {
        geometry: "Geometry.clock_hour_ones",
        materials: [{ "*": "Material.calendar" }],
        textures: ["Texture.Master_Digits_Atlas"],
        uv_anim: {
          offset: [0, "math.floor(math.mod(math.floor(query.time_of_day * 288), 12) * 5 / 10) * 0.083333"],
          scale: [1, 1]
        }
      },
      "controller.render.clock.ampm": {
        geometry: "Geometry.clock_ampm",
        materials: [{ "*": "Material.calendar" }],
        textures: ["Texture.Master_Digits_Atlas"],
        uv_anim: {
          offset: [0.076923, "(math.floor(query.time_of_day * 2) == 0 ? 0.833333 : 0.916667)"],
          scale: [1, 1]
        }
      },
      "controller.render.clock.colon": {
        geometry: "Geometry.clock_colon",
        materials: [{ "*": "Material.calendar" }],
        textures: ["Texture.Master_Digits_Atlas"],
        uv_anim: { offset: [0, 0.916667], scale: [1, 1] }
      },
      "controller.render.calendar.year_thousands": {
        geometry: "Geometry.calendar_year_thousands",
        materials: [{ "*": "Material.calendar" }],
        textures: ["Texture.Master_Digits_Atlas"],
        uv_anim: { offset: [0, "math.floor(math.mod(query.day / 365 / 1000, 10)) * 0.083333"], scale: [1, 1] }
      },
      "controller.render.calendar.year_hundreds": {
        geometry: "Geometry.calendar_year_hundreds",
        materials: [{ "*": "Material.calendar" }],
        textures: ["Texture.Master_Digits_Atlas"],
        uv_anim: { offset: [0, "math.floor(math.mod(query.day / 365 / 100, 10)) * 0.083333"], scale: [1, 1] }
      },
      "controller.render.calendar.year_tens": {
        geometry: "Geometry.calendar_year_tens",
        materials: [{ "*": "Material.calendar" }],
        textures: ["Texture.Master_Digits_Atlas"],
        uv_anim: { offset: [0, "math.floor(math.mod(query.day / 365 / 10, 10)) * 0.083333"], scale: [1, 1] }
      },
      "controller.render.calendar.year_ones": {
        geometry: "Geometry.calendar_year_ones",
        materials: [{ "*": "Material.calendar" }],
        textures: ["Texture.Master_Digits_Atlas"],
        uv_anim: { offset: [0, "math.floor(math.mod(query.day / 365, 10)) * 0.083333"], scale: [1, 1] }
      }
    }
  };
}

export function buildPlayerRenderControllersJson() {
  return {
    format_version: "1.8.0",
    render_controllers: {
      "controller.render.player.first_person": {
        rebuild_animation_matrices: true,
        geometry: "Geometry.default",
        materials: [{ "*": "Material.default" }],
        textures: ["Texture.default"],
        part_visibility: [
          { "*": true },
          { head: false },
          { hat: false },
          { helmet: false },
          { rightArm: "query.get_equipped_item_name(0, 1) == '' || query.get_equipped_item_name(0, 1) == 'filled_map'" },
          { rightSleeve: "query.get_equipped_item_name(0, 1) == '' || query.get_equipped_item_name(0, 1) == 'filled_map'" },
          {
            leftArm:
              "(query.get_equipped_item_name(0, 1) == 'filled_map' && query.get_equipped_item_name('off_hand') != 'shield') || (query.get_equipped_item_name('off_hand') == 'filled_map' && !query.item_is_charged) || (!query.item_is_charged && (variable.item_use_normalized > 0 && variable.item_use_normalized < 1.0))"
          },
          {
            leftSleeve:
              "(query.get_equipped_item_name(0, 1) == 'filled_map' && query.get_equipped_item_name('off_hand') != 'shield') || (query.get_equipped_item_name('off_hand') == 'filled_map' && !query.item_is_charged) || (!query.item_is_charged && (variable.item_use_normalized > 0 && variable.item_use_normalized < 1.0))"
          }
        ]
      },
      "controller.render.player.third_person": {
        geometry: "Geometry.default",
        materials: [{ "*": "Material.default" }],
        textures: ["Texture.default"],
        part_visibility: [
          { "*": true },
          { helmet: "variable.helmet_layer_visible" },
          { leftLegging: "variable.leg_layer_visible" },
          { rightLegging: "variable.leg_layer_visible" },
          { leftBoot: "variable.boot_layer_visible" },
          { rightBoot: "variable.boot_layer_visible" },
          { leftSock: "variable.boot_layer_visible && variable.leg_layer_visible" },
          { rightSock: "variable.boot_layer_visible && variable.leg_layer_visible" },
          { bodyArmor: "variable.chest_layer_visible && !query.has_cape" },
          { leftArmArmor: "variable.chest_layer_visible && !query.has_cape" },
          { rightArmArmor: "variable.chest_layer_visible && !query.has_cape" },
          { belt: "variable.chest_layer_visible && variable.leg_layer_visible" }
        ]
      },
      "controller.render.player.first_person_spectator": {
        geometry: "Geometry.default",
        materials: [{ "*": "Material.default" }],
        textures: ["Texture.default"],
        part_visibility: [{ "*": false }]
      },
      "controller.render.player.third_person_spectator": {
        geometry: "Geometry.default",
        materials: [{ "*": "Material.spectator" }],
        textures: ["Texture.default"],
        part_visibility: [
          { "*": false },
          { head: true },
          { hat: true },
          { helmet: "variable.helmet_layer_visible" }
        ],
        color: { r: "1.0f", g: "1.0f", b: "1.0f", a: "0.3f" }
      },
      "controller.render.player.map": {
        geometry: "Geometry.default",
        materials: [{ "*": "Material.default" }],
        textures: ["Texture.default"],
        part_visibility: [{ "*": false }, { head: true }, { hat: true }, { helmet: true }]
      }
    }
  };
}

function buildPlanetMolangLines(n, p) {
  const [P, L0, w, e, a, inc, Om] = p.el;
  const M0 = +(L0 - w).toFixed(5);
  const c1 = +((2 * e - e ** 3 / 4) * RD).toFixed(6);
  const c2 = +(1.25 * e * e * RD).toFixed(6);
  const c3 = +((13 / 12) * e ** 3 * RD).toFixed(6);
  const pSemi = +(a * (1 - e * e)).toFixed(6);
  const eRound = +e.toFixed(6);
  const wMinusOm = +(w - Om).toFixed(6);
  const cosOm = +Math.cos(Om * D).toFixed(6);
  const sinOm = +Math.sin(Om * D).toFixed(6);
  const cosInc = +Math.cos(inc * D).toFixed(6);
  const sinInc = +Math.sin(inc * D).toFixed(6);

  return [
    `variable.astrum_${n}_m = ${M0} + variable.astrum_t / ${P} * 360;`,
    `variable.astrum_${n}_nu = variable.astrum_${n}_m + ${c1} * math.sin(variable.astrum_${n}_m) + ${c2} * math.sin(2 * variable.astrum_${n}_m) + ${c3} * math.sin(3 * variable.astrum_${n}_m);`,
    `variable.astrum_${n}_r = ${pSemi} / (1 + ${eRound} * math.cos(variable.astrum_${n}_nu));`,
    `variable.astrum_${n}_u = variable.astrum_${n}_nu + ${wMinusOm};`,
    `variable.astrum_${n}_x = variable.astrum_${n}_r * (${cosOm} * math.cos(variable.astrum_${n}_u) - ${sinOm} * math.sin(variable.astrum_${n}_u) * ${cosInc}) + variable.astrum_er * math.cos(variable.astrum_ls);`,
    `variable.astrum_${n}_y = variable.astrum_${n}_r * (${sinOm} * math.cos(variable.astrum_${n}_u) + ${cosOm} * math.sin(variable.astrum_${n}_u) * ${cosInc}) + variable.astrum_er * math.sin(variable.astrum_ls);`,
    `variable.astrum_${n}_z = variable.astrum_${n}_r * math.sin(variable.astrum_${n}_u) * ${sinInc};`,
    `variable.astrum_${n}_lam = math.atan2(variable.astrum_${n}_y, variable.astrum_${n}_x);`,
    `variable.astrum_${n}_beta = math.atan2(variable.astrum_${n}_z, math.sqrt(variable.astrum_${n}_x * variable.astrum_${n}_x + variable.astrum_${n}_y * variable.astrum_${n}_y));`,
    `variable.astrum_${n}_dec = math.asin(math.sin(variable.astrum_${n}_beta) * math.cos(23.5) + math.cos(variable.astrum_${n}_beta) * math.sin(23.5) * math.sin(variable.astrum_${n}_lam));`,
    `variable.astrum_${n}_ra = math.atan2(math.sin(variable.astrum_${n}_lam) * math.cos(23.5) - (math.sin(variable.astrum_${n}_beta) / math.cos(variable.astrum_${n}_beta)) * math.sin(23.5), math.cos(variable.astrum_${n}_lam));`,
    `variable.astrum_${n}_z = query.time_of_day * -360 + math.atan2(math.sin(variable.astrum_${n}_ra - variable.astrum_lm), math.cos(variable.astrum_${n}_ra - variable.astrum_lm));`
  ];
}

export function buildPlayerEntityJson() {
  const preAnim = [
    "variable.is_blood_moon = variable.is_blood_moon ?? 0;",
    "v.helmet_layer_visible = !query.has_head_gear;",
    "v.leg_layer_visible = 1.0;",
    "v.boot_layer_visible = 1.0;",
    "v.chest_layer_visible = 1.0;",
    "v.attack_body_rot_y = Math.sin(360 * Math.sqrt(v.attack_time)) * 10.0;",
    "v.tcos0 = math.cos(query.modified_distance_moved * 38.17) * query.modified_move_speed / v.gliding_speed_value * 57.3;",
    "v.first_person_item_rotation_factor = math.sin((1 - v.attack_time) * 180.0);",
    "v.hand_bob = query.life_time < 0.01 ? 0.0 : v.hand_bob + ((query.is_on_ground && query.is_alive ? math.clamp(math.sqrt(math.pow(query.position(0), 2.0) + math.pow(query.position(2), 2.0)), 0.0, 0.1) : 0.0) - v.hand_bob) * 0.02;",
    "v.map_angle = math.clamp(1 - v.player_x_rotation / 45.1, 0.0, 1.0);",
    "v.item_use_duration = query.main_hand_item_use_duration > 0.0 ? (query.main_hand_item_max_duration - (query.main_hand_item_use_duration - query.frame_alpha + 1.0)) : 0.0;",
    "v.item_use_normalized = query.main_hand_item_use_duration / query.main_hand_item_max_duration;",
    "v.riding_y_offset = query.is_riding_any_entity_of_type('minecraft:minecart', 'minecraft:boat', 'minecraft:chest_boat', 'minecraft:strider') ? -3.0 : 0.0;",
    "v.melee_spear_equipped = query.equipped_item_any_tag('slot.weapon.mainhand', 'minecraft:is_spear');",
    "v.tp_melee_spear_base_arm_rotation_x = (query.is_swimming || query.is_gliding) ? (-115.0 - query.target_x_rotation) : (query.is_crawling ? -115.0 : -30.0);",
    "t.melee_spear_use_finish_raise_tick = v.melee_spear_equipped ? query.kinetic_weapon_delay : 0.0;",
    "t.melee_spear_use_start_sway_tick = v.melee_spear_equipped ? t.melee_spear_use_finish_raise_tick + query.kinetic_weapon_dismount_duration : 0.0;",
    "t.melee_spear_use_start_lower_tick = v.melee_spear_equipped ? t.melee_spear_use_finish_raise_tick + query.kinetic_weapon_knockback_duration : 0.0;",
    "t.melee_spear_use_finish_lower_tick = v.melee_spear_equipped ? t.melee_spear_use_finish_raise_tick + query.kinetic_weapon_damage_duration : 0.0;",
    "t.melee_spear_use_raise_progress = math.clamp(math.inverse_lerp(0.0, t.melee_spear_use_finish_raise_tick, v.item_use_duration), 0.0, 1.0);",
    "t.melee_spear_use_raise_progress_start = math.clamp(math.inverse_lerp(0.0, 0.5, t.melee_spear_use_raise_progress), 0.0, 1.0);",
    "t.melee_spear_use_raise_progress_middle = math.clamp(math.inverse_lerp(0.5, 0.8, t.melee_spear_use_raise_progress), 0.0, 1.0);",
    "t.melee_spear_use_raise_progress_end = math.clamp(math.inverse_lerp(0.8, 1.0, t.melee_spear_use_raise_progress), 0.0, 1.0);",
    "t.melee_spear_use_sway_progress = math.clamp(math.inverse_lerp(t.melee_spear_use_start_sway_tick, t.melee_spear_use_start_lower_tick, v.item_use_duration), 0.0, 1.0);",
    "t.melee_spear_use_lower_progress = math.ease_out_cubic(0.0, 1.0, math.ease_in_out_elastic(0.0, 1.0, math.clamp(math.inverse_lerp(t.melee_spear_use_start_lower_tick, t.melee_spear_use_finish_lower_tick - 5, v.item_use_duration), 0.0, 1.0)));",
    "t.melee_spear_use_raise_back_progress = math.clamp(math.inverse_lerp(t.melee_spear_use_finish_lower_tick - 5.0, t.melee_spear_use_finish_lower_tick, v.item_use_duration), 0.0, 1.0);",
    "t.melee_spear_use_sway_intensity = math.ease_out_circ(0.0, 2.0, t.melee_spear_use_sway_progress) + math.ease_in_circ(0.0, -2.0, t.melee_spear_use_raise_back_progress);",
    "t.melee_spear_use_sway_scale_slow = math.sin(v.item_use_duration * 19.0) * t.melee_spear_use_sway_intensity;",
    "t.melee_spear_use_sway_scale_fast = math.sin(v.item_use_duration * 30.0) * t.melee_spear_use_sway_intensity;",
    "v.fp_melee_spear_use_item_position_x = (t.melee_spear_use_raise_progress_start * 0.05 + t.melee_spear_use_raise_progress_end * -0.05 + t.melee_spear_use_sway_scale_slow * 0.005) * v.melee_spear_java_to_bedrock_scale;",
    "v.fp_melee_spear_use_item_position_y = (t.melee_spear_use_raise_progress_start * -0.075 + t.melee_spear_use_raise_progress_middle * 0.075 + t.melee_spear_use_sway_scale_fast * 0.01) * v.melee_spear_java_to_bedrock_scale;",
    "v.fp_melee_spear_use_item_position_z = (t.melee_spear_use_raise_progress_start * 0.05 + t.melee_spear_use_raise_progress_end * -0.05 + t.melee_spear_use_sway_scale_slow * 0.005) * v.melee_spear_java_to_bedrock_scale;",
    "v.fp_melee_spear_use_item_rotation_y = t.melee_spear_use_raise_progress * 20.0 + t.melee_spear_use_lower_progress * 20.0 + t.melee_spear_use_sway_scale_slow * 0.5 + t.melee_spear_use_raise_back_progress * -40.0;",
    "v.fp_melee_spear_use_item_rotation_z = math.ease_in_out_back(0.0, -60.0, t.melee_spear_use_raise_progress) + t.melee_spear_use_lower_progress * -25.0 + t.melee_spear_use_raise_back_progress * 85.0 + t.melee_spear_use_sway_scale_fast * 0.5;",
    "v.fp_melee_spear_use_attachable_rotation_z = math.clamp(math.inverse_lerp(0.5, 0.55, t.melee_spear_use_raise_progress), 0.0, 1.0) * -50.0 + t.melee_spear_use_sway_progress * 90.0 + t.melee_spear_use_raise_back_progress * -40.0;",
    "v.tp_melee_spear_use_arm_rotation_x = t.melee_spear_use_raise_progress_start * -40.0 + t.melee_spear_use_raise_progress_middle * 30.0 + t.melee_spear_use_raise_progress_end * -20.0 + t.melee_spear_use_lower_progress * 20.0 + t.melee_spear_use_raise_back_progress * 10.0;",
    "v.tp_melee_spear_use_arm_rotation_x = v.tp_melee_spear_use_arm_rotation_x + t.melee_spear_use_sway_scale_slow * 0.6;",
    "v.tp_melee_spear_use_arm_rotation_y = t.melee_spear_use_sway_scale_fast * 1.0;",
    "v.tp_melee_spear_use_arm_rotation_z = t.melee_spear_use_sway_scale_slow * 0.5;",
    "v.tp_melee_spear_use_item_rotation_x = t.melee_spear_use_raise_progress * 60.0 + t.melee_spear_use_raise_back_progress * -60.0;",
    "v.tp_melee_spear_use_attachable_rotation_z = t.melee_spear_use_raise_progress * 90.0 + t.melee_spear_use_sway_progress * -90.0;",
    "t.melee_spear_attack_duration_ratio = 1.0 / query.base_swing_duration;",
    "t.melee_spear_attack_raise_end = 0.05 * t.melee_spear_attack_duration_ratio;",
    "t.melee_spear_attack_thrust_end = 0.2 * t.melee_spear_attack_duration_ratio;",
    "t.melee_spear_attack_recover_start = 1.0 - (0.6 * t.melee_spear_attack_duration_ratio);",
    "t.melee_spear_attack_raise_progress = math.clamp(math.inverse_lerp(0.0, t.melee_spear_attack_raise_end, v.attack_time), 0.0, 1.0);",
    "t.melee_spear_attack_thrust_progress = math.clamp(math.inverse_lerp(t.melee_spear_attack_raise_end, t.melee_spear_attack_thrust_end, v.attack_time), 0.0, 1.0);",
    "t.melee_spear_attack_recover_progress = math.clamp(math.inverse_lerp(t.melee_spear_attack_recover_start, 1.0, v.attack_time), 0.0, 1.0);",
    "t.melee_spear_attack_raise_scale = math.ease_in_out_sine(0.0, 1.0, t.melee_spear_attack_raise_progress);",
    "t.melee_spear_attack_thrust_scale = math.ease_in_quad(0.0, 1.0, t.melee_spear_attack_thrust_progress);",
    "t.melee_spear_attack_recover_scale = math.ease_in_out_expo(0.0, 1.0, t.melee_spear_attack_recover_progress);",
    "v.fp_melee_spear_attack_item_position_x = (t.melee_spear_attack_raise_scale * 0.1 + t.melee_spear_attack_thrust_scale * -0.1) * v.melee_spear_java_to_bedrock_scale;",
    "v.fp_melee_spear_attack_item_position_y = (t.melee_spear_attack_raise_scale * -0.075 + t.melee_spear_attack_recover_scale * 0.075) * v.melee_spear_java_to_bedrock_scale;",
    "v.fp_melee_spear_attack_item_position_z = (t.melee_spear_attack_raise_scale * 0.65 + t.melee_spear_attack_thrust_scale * -0.65) * v.melee_spear_java_to_bedrock_scale;",
    "v.fp_melee_spear_attack_item_rotation_y = t.melee_spear_attack_raise_scale * 20.0 + t.melee_spear_attack_recover_scale * -20.0;",
    "v.fp_melee_spear_attack_item_rotation_z = t.melee_spear_attack_raise_scale * -60.0 + t.melee_spear_attack_recover_scale * 60.0;",
    "v.fp_melee_spear_attack_attachable_rotation_z = t.melee_spear_attack_raise_scale * 40.0 + t.melee_spear_attack_recover_scale * -40.0;",
    "v.tp_melee_spear_attack_arm_rotation_x = t.melee_spear_attack_raise_scale * 90.0 + t.melee_spear_attack_thrust_scale * -120.0 + t.melee_spear_attack_recover_scale * 30.0;",
    "v.tp_melee_spear_attack_item_rotation_x = t.melee_spear_attack_thrust_scale * 60.0 + t.melee_spear_attack_recover_scale * -60.0;",
    "v.tp_melee_spear_attack_attachable_position_z = (t.melee_spear_attack_thrust_scale * -0.15 + t.melee_spear_attack_recover_scale * 0.15) * v.melee_spear_java_to_bedrock_scale;",
    "variable.astrum_sky_rot = variable.astrum_sky_rot - (query.delta_time * 0.1);",
    "variable.astrum_tilt_pitched = (query.is_swimming || query.is_gliding) ? 1.0 : 0.0;",
    "variable.astrum_tilt_target = (query.is_swimming || query.is_gliding || query.is_crawling) ? 1.0 : 0.0;",
    "variable.astrum_tilt_rate_in = query.is_gliding ? 3.0 : 4.0;",
    "variable.astrum_tilt_rate_out = 4.0;",
    "variable.astrum_tilt_rate = variable.astrum_tilt_target > variable.astrum_tilt_blend ? variable.astrum_tilt_rate_in : variable.astrum_tilt_rate_out;",
    "variable.astrum_tilt_blend = variable.astrum_tilt_blend + math.clamp(variable.astrum_tilt_target - variable.astrum_tilt_blend, -query.delta_time * variable.astrum_tilt_rate, query.delta_time * variable.astrum_tilt_rate);",
    "variable.astrum_tilt_cancel = variable.astrum_tilt_blend * (90.0 + variable.astrum_tilt_pitched * query.target_x_rotation);",
    "variable.astrum_t = query.day + query.time_of_day;",
    "variable.astrum_lm = (variable.astrum_t - 80) / 365.25 * 360;",
    "variable.astrum_me = (variable.astrum_t - 3) / 365.25 * 360;",
    "variable.astrum_ls = variable.astrum_lm + 1.915 * math.sin(variable.astrum_me) + 0.02 * math.sin(2 * variable.astrum_me);",
    "variable.astrum_sun_ra = math.atan2(math.cos(23.5) * math.sin(variable.astrum_ls), math.cos(variable.astrum_ls));",
    "variable.astrum_sun_dec = math.asin(math.sin(23.5) * math.sin(variable.astrum_ls));",
    "variable.astrum_sun_z = query.time_of_day * -360 + math.atan2(math.sin(variable.astrum_sun_ra - variable.astrum_lm), math.cos(variable.astrum_sun_ra - variable.astrum_lm));",
    "variable.astrum_lmoon = variable.astrum_lm + variable.astrum_t / 29.53 * 360 + 180 + 6.29 * math.sin(variable.astrum_t / 27.55 * 360);",
    "variable.astrum_bmoon = 5.145 * math.sin(variable.astrum_lmoon - (101.1 - variable.astrum_t / 6793.5 * 360));",
    `variable.astrum_moon_dec = math.asin(math.sin(variable.astrum_bmoon) * math.cos(23.5) + math.cos(variable.astrum_bmoon) * math.sin(23.5) * math.sin(variable.astrum_lmoon)) + query.position(2) / ${EARTH_RADIUS_BLOCKS} * 2.9;`,
    "variable.astrum_moon_ra = math.atan2(math.sin(variable.astrum_lmoon) * math.cos(23.5) - (math.sin(variable.astrum_bmoon) / math.cos(variable.astrum_bmoon)) * math.sin(23.5), math.cos(variable.astrum_lmoon));",
    "variable.astrum_moon_z = query.time_of_day * -360 + math.atan2(math.sin(variable.astrum_moon_ra - variable.astrum_lm), math.cos(variable.astrum_moon_ra - variable.astrum_lm));",
    "variable.astrum_er = 1 - 0.0167 * math.cos(variable.astrum_me);"
  ];

  for (const [n, p] of Object.entries(PLN)) {
    preAnim.push(...buildPlanetMolangLines(n, p));
  }

  const particleEffects = {
    star_field_px_stars: "astrum:star_field_px_stars",
    star_field_nx_stars: "astrum:star_field_nx_stars",
    star_field_py_stars: "astrum:star_field_py_stars",
    star_field_ny_stars: "astrum:star_field_ny_stars",
    star_field_pz_stars: "astrum:star_field_pz_stars",
    star_field_nz_stars: "astrum:star_field_nz_stars",
    star_field_px_const: "astrum:star_field_px_const",
    star_field_nx_const: "astrum:star_field_nx_const",
    star_field_py_const: "astrum:star_field_py_const",
    star_field_ny_const: "astrum:star_field_ny_const",
    star_field_pz_const: "astrum:star_field_pz_const",
    star_field_nz_const: "astrum:star_field_nz_const",
    moon_particle: "astrum:moon_particle",
    sun_particle: "astrum:sun_particle"
  };

  for (const n of Object.keys(PLN)) {
    particleEffects[`${n}_particle`] = `astrum:${n}_particle`;
    particleEffects[`${n}_hires_particle`] = `astrum:${n}_hires_particle`;
  }

  return {
    format_version: "1.10.0",
    "minecraft:client_entity": {
      description: {
        identifier: "minecraft:player",
        min_engine_version: "1.8.0",
        materials: {
          default: "entity_alphatest",
          cape: "entity_alphatest",
          animated: "player_animated",
          spectator: "player_spectator",
          calendar: "player_animated"
        },
        textures: {
          default: "textures/entity/steve",
          cape: "textures/entity/cape_invisible",
          Master_Digits_Atlas: "textures/ui/calendar/atlas/master_digits"
        },
        geometry: {
          default: "geometry.humanoid.custom",
          cape: "geometry.cape",
          calendar_day_tens: "geometry.calendar.day_tens",
          calendar_day_ones: "geometry.calendar.day_ones",
          calendar_month: "geometry.calendar.month",
          calendar_weekday: "geometry.calendar.weekday",
          calendar_year_thousands: "geometry.calendar.year_thousands",
          calendar_year_hundreds: "geometry.calendar.year_hundreds",
          calendar_year_tens: "geometry.calendar.year_tens",
          calendar_year_ones: "geometry.calendar.year_ones",
          clock_hour_tens: "geometry.clock.hour_tens",
          clock_hour_ones: "geometry.clock.hour_ones",
          clock_colon: "geometry.clock.colon",
          clock_minute_tens: "geometry.clock.minute_tens",
          clock_minute_ones: "geometry.clock.minute_ones",
          clock_ampm: "geometry.clock.ampm",
          star_field: "geometry.star_field"
        },
        scripts: {
          scale: "0.9375",
          variables: {
            "variable.music_lock": "public",
            "variable.music_state": "public",
            "variable.display_speed": "public",
            "variable.fp_melee_spear_use_attachable_rotation_z": "public",
            "variable.tp_melee_spear_use_attachable_rotation_z": "public",
            "variable.fp_melee_spear_attack_attachable_rotation_z": "public",
            "variable.tp_melee_spear_attack_attachable_position_z": "public",
            "variable.attack_time": "public",
            "variable.item_use_normalized": "public",
            "variable.is_blood_moon": "public"
          },
          initialize: [
            "variable.is_holding_right = 0.0;",
            "variable.is_blinking = 0.0;",
            "variable.last_blink_time = 0.0;",
            "variable.hand_bob = 0.0;",
            "v.melee_spear_java_to_bedrock_scale = 40.0;",
            "variable.calendar_enabled = 1.0;",
            "variable.music_lock = 0;",
            "variable.music_state = 0;",
            "variable.astrum_sky_rot = query.time_of_day * -360;",
            "variable.astrum_tilt_blend = 0.0;",
            "variable.astrum_tilt_cancel = 0.0;",
            "variable.is_blood_moon = 1.0;"
          ],
          pre_animation: preAnim,
          animate: ["root", { star_spawn_controller: "query.is_local_player" }]
        },
        animations: {
          root: "controller.animation.player.root",
          base_controller: "controller.animation.player.base",
          humanoid_base_pose: "animation.humanoid.base_pose",
          look_at_target: "controller.animation.humanoid.look_at_target",
          look_at_target_ui: "animation.player.look_at_target.ui",
          look_at_target_default: "animation.humanoid.look_at_target.default",
          look_at_target_gliding: "animation.humanoid.look_at_target.gliding",
          look_at_target_swimming: "animation.humanoid.look_at_target.swimming",
          look_at_target_inverted: "animation.player.look_at_target.inverted",
          cape: "animation.player.cape",
          "move.arms": "animation.player.move.arms",
          "move.legs": "animation.player.move.legs",
          swimming: "animation.player.swim",
          "swimming.no_right_arm": "animation.player.swim.no_right_arm",
          "swimming.legs": "animation.player.swim.legs",
          crawling: "animation.player.crawl",
          "crawling.no_right_arm": "animation.player.crawl.no_right_arm",
          "crawling.legs": "animation.player.crawl.legs",
          "riding.root": "animation.player.riding.root",
          "riding.arms": "animation.player.riding.arms",
          "riding.legs": "animation.player.riding.legs",
          holding: "animation.player.holding",
          holding_heavy_core: "animation.player.holding_heavy_core",
          brandish_spear: "animation.humanoid.brandish_spear",
          holding_spyglass: "animation.humanoid.holding_spyglass",
          charging: "animation.humanoid.charging",
          "attack.positions": "animation.player.attack.positions",
          "attack.rotations": "animation.player.attack.rotations",
          sneaking: "animation.player.sneaking",
          bob: "animation.player.bob",
          damage_nearby_mobs: "animation.humanoid.damage_nearby_mobs",
          bow_and_arrow: "animation.humanoid.bow_and_arrow",
          use_item_progress: "animation.humanoid.use_item_progress",
          skeleton_attack: "animation.skeleton.attack",
          sleeping: "animation.player.sleeping",
          first_person_base_pose: "animation.player.first_person.base_pose",
          first_person_empty_hand: "animation.player.first_person.empty_hand",
          first_person_swap_item: "animation.player.first_person.swap_item",
          first_person_shield_block: "animation.player.first_person.shield_block",
          first_person_attack_controller: "controller.animation.player.first_person_attack",
          first_person_attack_rotation: "animation.player.first_person.attack_rotation",
          first_person_vr_attack_rotation: "animation.player.first_person.vr_attack_rotation",
          first_person_walk: "animation.player.first_person.walk",
          first_person_map_controller: "controller.animation.player.first_person_map",
          first_person_map_hold: "animation.player.first_person.map_hold",
          first_person_map_hold_attack: "animation.player.first_person.map_hold_attack",
          first_person_map_hold_off_hand: "animation.player.first_person.map_hold_off_hand",
          first_person_map_hold_main_hand: "animation.player.first_person.map_hold_main_hand",
          first_person_crossbow_equipped: "animation.player.first_person.crossbow_equipped",
          first_person_breathing_bob: "animation.player.first_person.breathing_bob",
          third_person_crossbow_equipped: "animation.player.crossbow_equipped",
          third_person_bow_equipped: "animation.player.bow_equipped",
          first_person_melee_spear_use: "animation.player.first_person.melee_spear_use",
          first_person_melee_spear_hold: "animation.player.first_person.melee_spear_hold",
          first_person_melee_spear_attack: "animation.player.first_person.melee_spear_attack",
          first_person_melee_spear_controller: "controller.animation.player.first_person_melee_spear",
          third_person_melee_spear_use: "animation.humanoid.melee_spear_use",
          third_person_melee_spear_hold: "animation.humanoid.melee_spear_hold",
          third_person_melee_spear_attack: "animation.player.melee_spear_attack",
          third_person_melee_spear_controller: "controller.animation.player.melee_spear",
          crossbow_hold: "animation.player.crossbow_hold",
          crossbow_controller: "controller.animation.player.crossbow",
          shield_block_main_hand: "animation.player.shield_block_main_hand",
          shield_block_off_hand: "animation.player.shield_block_off_hand",
          blink: "controller.animation.persona.blink",
          tooting_goat_horn: "animation.humanoid.tooting_goat_horn",
          holding_brush: "animation.humanoid.holding_brush",
          brushing: "animation.humanoid.brushing",
          sky_rotation: "animation.astrum.sky_rotation",
          star_spawn_controller: "controller.animation.astrum.stars"
        },
        particle_effects: particleEffects,
        render_controllers: [
          { "controller.render.player.first_person_spectator": "variable.is_first_person && query.is_spectator" },
          {
            "controller.render.player.third_person_spectator":
              "!variable.is_first_person && !variable.map_face_icon && query.is_spectator"
          },
          { "controller.render.player.first_person": "variable.is_first_person && !query.is_spectator" },
          {
            "controller.render.player.third_person":
              "!variable.is_first_person && !variable.map_face_icon && !query.is_spectator"
          },
          { "controller.render.player.map": "variable.map_face_icon" },
          "controller.render.calendar.day_tens",
          "controller.render.calendar.day_ones",
          "controller.render.calendar.month",
          "controller.render.calendar.weekday",
          "controller.render.calendar.year_thousands",
          "controller.render.calendar.year_hundreds",
          "controller.render.calendar.year_tens",
          "controller.render.calendar.year_ones",
          { "controller.render.star_field": "query.is_local_player" },
          "controller.render.clock.hour_tens",
          "controller.render.clock.hour_ones",
          "controller.render.clock.colon",
          "controller.render.clock.minute_tens",
          "controller.render.clock.minute_ones",
          "controller.render.clock.ampm"
        ],
        enable_attachables: true
      }
    }
  };
}

export function buildSunParticleJson(cfg = CELESTIAL_DEFAULTS.sun) {
  const billboard = {
    size: cfg.size || [80, 80],
    facing_camera_mode: "lookat_xyz"
  };
  if (cfg.uv) {
    billboard.uv = cfg.uv;
  }

  return {
    format_version: "1.10.0",
    particle_effect: {
      description: {
        identifier: cfg.identifier || "astrum:sun_particle",
        basic_render_parameters: {
          material: cfg.material || "particles_alpha",
          texture: cfg.texture || "textures/environment/sunAstrum"
        }
      },
      components: {
        "minecraft:emitter_local_space": { position: true, rotation: false },
        "minecraft:emitter_rate_instant": { num_particles: 1 },
        "minecraft:emitter_lifetime_looping": { active_time: 1 },
        "minecraft:emitter_shape_point": { offset: [0, 250, 0] },
        "minecraft:particle_initialization": {
          per_update_expression: "variable.lunar_az=0; variable.lunar_alt=0; variable.solar_az=0; variable.solar_alt=0;"
        },
        "minecraft:particle_lifetime_expression": { max_lifetime: 1.0 },
        "minecraft:particle_initial_speed": 0,
        "minecraft:particle_appearance_billboard": billboard,
        "minecraft:particle_appearance_tinting": {
          color: [
            String(cfg.tint?.[0] ?? "1.0"),
            String(cfg.tint?.[1] ?? "1.0"),
            String(cfg.tint?.[2] ?? "1.0"),
            "1.0"
          ]
        }
      }
    }
  };
}

export function buildMoonParticleJson(cfg = CELESTIAL_DEFAULTS.moon) {
  const phaseExpr =
    "variable.t = query.day + query.time_of_day; variable.lm = (variable.t - 80) / 365.25 * 360; variable.me = (variable.t - 3) / 365.25 * 360; variable.ls = variable.lm + 1.915 * math.sin(variable.me) + 0.02 * math.sin(2 * variable.me); variable.lmoon = variable.lm + variable.t / 29.53 * 360 + 180 + 6.29 * math.sin(variable.t / 27.55 * 360); variable.d = variable.lmoon - variable.ls; variable.dw = math.atan2(math.sin(variable.d), math.cos(variable.d)); variable.elong = math.mod(variable.dw + 360, 360); variable.ph = math.mod(math.floor(math.mod(variable.elong + 22.5, 360) / 45) + 4, 8);";

  const billboard = {
    size: cfg.size || [80, 80],
    facing_camera_mode: "lookat_xyz",
    uv: cfg.uv || {
      texture_width: 4,
      texture_height: 2,
      uv: ["math.mod(variable.ph, 4)", "math.floor(variable.ph / 4)"],
      uv_size: [1, 1]
    }
  };

  return {
    format_version: "1.10.0",
    particle_effect: {
      description: {
        identifier: cfg.identifier || "astrum:moon_particle",
        basic_render_parameters: {
          material: cfg.material || "particles_alpha",
          texture: cfg.texture || "textures/environment/moon_phases"
        }
      },
      components: {
        "minecraft:emitter_local_space": { position: true, rotation: false },
        "minecraft:emitter_rate_instant": { num_particles: 1 },
        "minecraft:emitter_lifetime_looping": { active_time: 1 },
        "minecraft:emitter_shape_point": { offset: [0, 250, 0] },
        "minecraft:particle_initialization": {
          per_update_expression: phaseExpr
        },
        "minecraft:particle_lifetime_expression": { max_lifetime: 1.0 },
        "minecraft:particle_initial_speed": 0,
        "minecraft:particle_appearance_billboard": billboard,
        "minecraft:particle_appearance_tinting": {
          color: [
            String(cfg.tint?.[0] ?? "1.0"),
            String(cfg.tint?.[1] ?? "1.0"),
            String(cfg.tint?.[2] ?? "1.0"),
            "1.0"
          ]
        }
      }
    }
  };
}

export function buildPlanetParticleJson(name, pCfg, isHiRes = false) {
  const [P, L0, w, e, a, inc, Om] = pCfg.el;
  const M0 = +(L0 - w).toFixed(5);
  const c1 = +((2 * e - e ** 3 / 4) * RD).toFixed(6);
  const c2 = +(1.25 * e * e * RD).toFixed(6);
  const c3 = +((13 / 12) * e ** 3 * RD).toFixed(6);
  const pSemi = +(a * (1 - e * e)).toFixed(6);
  const eRound = +e.toFixed(6);
  const wMinusOm = +(w - Om).toFixed(6);
  const cosOm = +Math.cos(Om * D).toFixed(6);
  const sinOm = +Math.sin(Om * D).toFixed(6);
  const cosInc = +Math.cos(inc * D).toFixed(6);
  const sinInc = +Math.sin(inc * D).toFixed(6);
  const [v0, v1] = VIS[name] || [-9, -3];
  const vSpan = v1 - v0;

  const expr = [
    "variable.t = query.day + query.time_of_day;",
    "variable.me = (variable.t - 3) / 365.25 * 360;",
    "variable.ls = (variable.t - 80) / 365.25 * 360 + 1.915 * math.sin(variable.me) + 0.02 * math.sin(2 * variable.me);",
    "variable.er = 1 - 0.0167 * math.cos(variable.me);",
    `variable.p_m = ${M0} + variable.t / ${P} * 360;`,
    `variable.p_nu = variable.p_m + ${c1} * math.sin(variable.p_m) + ${c2} * math.sin(2 * variable.p_m) + ${c3} * math.sin(3 * variable.p_m);`,
    `variable.p_r = ${pSemi} / (1 + ${eRound} * math.cos(variable.p_nu));`,
    `variable.p_u = variable.p_nu + ${wMinusOm};`,
    `variable.p_x = variable.p_r * (${cosOm} * math.cos(variable.p_u) - ${sinOm} * math.sin(variable.p_u) * ${cosInc}) + variable.er * math.cos(variable.ls);`,
    `variable.p_y = variable.p_r * (${sinOm} * math.cos(variable.p_u) + ${cosOm} * math.sin(variable.p_u) * ${cosInc}) + variable.er * math.sin(variable.ls);`,
    `variable.p_z = variable.p_r * math.sin(variable.p_u) * ${sinInc};`,
    "variable.dist = math.sqrt(variable.p_x * variable.p_x + variable.p_y * variable.p_y + variable.p_z * variable.p_z);",
    "variable.cosa = (variable.p_r * variable.p_r + variable.dist * variable.dist - variable.er * variable.er) / (2 * variable.p_r * variable.dist);",
    "variable.f = (1 + variable.cosa) / 2 / (variable.p_r * variable.p_r * variable.dist * variable.dist);",
    `variable.bright = ${pCfg.peak} * math.clamp(math.pow(variable.f / ${pCfg.fmax}, 0.35), 0.12, 1);`,
    "variable.lm = (variable.t - 80) / 365.25 * 360;",
    `variable.phi = math.clamp(-query.position(2) / ${EARTH_RADIUS_BLOCKS}, -1, 1) * 90;`,
    "variable.rs = math.atan2(math.cos(23.5) * math.sin(variable.ls), math.cos(variable.ls));",
    "variable.ds = math.asin(math.sin(23.5) * math.sin(variable.ls));",
    "variable.hs = query.time_of_day * 360 + 180 + variable.lm - variable.rs;",
    "variable.salt = math.asin(math.sin(variable.phi) * math.sin(variable.ds) + math.cos(variable.phi) * math.cos(variable.ds) * math.cos(variable.hs));",
    `variable.vis = math.clamp((${v1} - variable.salt) / ${vSpan}, 0, 1);`
  ].join(" ");

  const bSize = pCfg.billboardSize || [pCfg.size, pCfg.size];
  const finalSize = isHiRes ? [bSize[0] * 2.5, bSize[1] * 2.5] : bSize;
  const tint = pCfg.tint || [1.0, 1.0, 1.0];

  return {
    format_version: "1.10.0",
    particle_effect: {
      description: {
        identifier: isHiRes ? `astrum:${name}_hires_particle` : `astrum:${name}_particle`,
        basic_render_parameters: {
          material: pCfg.material || "particles_add",
          texture: pCfg.texture || "textures/environment/planet"
        }
      },
      components: {
        "minecraft:emitter_local_space": { position: true, rotation: false },
        "minecraft:emitter_rate_instant": { num_particles: 1 },
        "minecraft:emitter_lifetime_looping": { active_time: 1 },
        "minecraft:emitter_shape_point": { offset: [0, 250, 0] },
        "minecraft:particle_lifetime_expression": { max_lifetime: 1.0 },
        "minecraft:particle_initialization": { per_update_expression: expr },
        "minecraft:particle_initial_speed": 0,
        "minecraft:particle_appearance_billboard": {
          size: finalSize,
          facing_camera_mode: "lookat_xyz"
        },
        "minecraft:particle_appearance_tinting": {
          color: [
            tint[0],
            tint[1],
            tint[2],
            "query.graphics_mode_is_any('deferred') ? variable.vis * variable.bright : 0.0"
          ]
        }
      }
    }
  };
}

export function buildStarFieldParticleJson(faceKey, faceCfg = STARBOX_FACES[faceKey], isConst = false) {
  const looping = { active_time: faceCfg.active_time ?? 1 };
  if (faceCfg.sleep_time !== undefined) {
    looping.sleep_time = faceCfg.sleep_time;
  }

  const identifier = isConst
    ? `astrum:star_field_${faceKey}_const`
    : faceCfg.identifier || `astrum:star_field_${faceKey}_stars`;

  const texturePath = isConst
    ? faceCfg.constTexture || faceCfg.texture || `textures/normal_${faceKey}`
    : faceCfg.texture || `textures/normal_${faceKey}`;

  return {
    format_version: "1.10.0",
    particle_effect: {
      description: {
        identifier,
        basic_render_parameters: {
          material: faceCfg.material || "starfield:stars",
          texture: texturePath
        }
      },
      components: {
        "minecraft:emitter_local_space": {
          position: true,
          rotation: true
        },
        "minecraft:emitter_rate_instant": {
          num_particles: 1
        },
        "minecraft:emitter_lifetime_looping": looping,
        "minecraft:emitter_shape_point": {
          offset: faceCfg.offset || [0, 0, 256]
        },
        "minecraft:particle_lifetime_expression": {
          max_lifetime: faceCfg.max_lifetime ?? 1.0
        },
        "minecraft:particle_initial_speed": 0,
        "minecraft:particle_motion_dynamic": {},
        "minecraft:particle_appearance_billboard": {
          size: faceCfg.size || [256, 256],
          facing_camera_mode: faceCfg.facing || "emitter_transform_xy"
        },
        "minecraft:particle_appearance_tinting": {
          color: [
            1.0,
            1.0,
            1.0,
            "query.graphics_mode_is_any('deferred') ? math.min(math.clamp(((query.time_of_day >= 0.25 ? query.time_of_day - 0.25 : query.time_of_day + 0.75) - 13.0/24.0) / (1.0/24.0), 0.0, 1.0), math.clamp((23.0/24.0 - (query.time_of_day >= 0.25 ? query.time_of_day - 0.25 : query.time_of_day + 0.75)) / (1.0/24.0), 0.0, 1.0)) : 0.0"
          ]
        }
      }
    }
  };
}