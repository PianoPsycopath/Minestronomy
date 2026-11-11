import { COMETS, PLN } from "../../config/index.js";

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
  for (const key of Object.keys(COMETS)) {
    starsOnlyEffects.push({ effect: `${key}_particle`, locator: `locator_${key}` });
    constEffects.push({ effect: `${key}_particle`, locator: `locator_${key}` });
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
