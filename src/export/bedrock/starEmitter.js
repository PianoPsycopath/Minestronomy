import { STARBOX_FACES } from "../../config/index.js";
import { exportBodies } from "./bodies.js";

const SPYGLASS_HELD = "query.is_item_name_any('slot.weapon.mainhand', 'minecraft:spyglass')";
const SPYGLASS_IN_USE = "query.main_hand_item_use_duration > 0";

// Animation controller with three states. It mirrors base/animation_controllers/star_emitter.json.
//   stars_only     - no spyglass in the main hand: normal star textures and the low-resolution planets.
//   constellations - spyglass held: constellation textures.
//   zoomed         - spyglass in use: constellation textures and the high-resolution planets.
export function buildStarEmitterJson(catalog) {
  const { planets, comets } = exportBodies(catalog);
  const faces = Object.keys(STARBOX_FACES);
  const faceEffects = suffix => faces.map(f => ({ effect: `star_field_${f}_${suffix}`, locator: "locator" }));
  const planetEffects = suffix => planets.map(({ key }) => ({ effect: `${key}${suffix}`, locator: `locator_${key}` }));
  // The tail particle is listed before the coma so that the coma draws on top of it.
  const cometEffects = comets.flatMap(({ key }) => [
    { effect: `${key}_tail_particle`, locator: `locator_${key}` },
    { effect: `${key}_particle`, locator: `locator_${key}` }
  ]);
  const luminaries = [
    { effect: "moon_particle", locator: "locator_moon" },
    { effect: "sun_particle", locator: "locator_sun" }
  ];

  return {
    format_version: "1.10.0",
    animation_controllers: {
      "controller.animation.astrum.stars": {
        initial_state: "stars_only",
        states: {
          stars_only: {
            particle_effects: [...faceEffects("stars"), ...luminaries, ...planetEffects("_particle"), ...cometEffects],
            animations: ["sky_rotation"],
            transitions: [
              { zoomed: `${SPYGLASS_HELD} && ${SPYGLASS_IN_USE}` },
              { constellations: SPYGLASS_HELD }
            ]
          },
          constellations: {
            particle_effects: [...faceEffects("const"), ...luminaries, ...planetEffects("_particle"), ...cometEffects],
            animations: ["sky_rotation"],
            transitions: [{ stars_only: `!${SPYGLASS_HELD}` }, { zoomed: SPYGLASS_IN_USE }]
          },
          zoomed: {
            particle_effects: [...faceEffects("const"), ...luminaries, ...planetEffects("_hires_particle"), ...cometEffects],
            animations: ["sky_rotation"],
            transitions: [{ stars_only: `!${SPYGLASS_HELD}` }, { constellations: `!(${SPYGLASS_IN_USE})` }]
          }
        }
      }
    }
  };
}