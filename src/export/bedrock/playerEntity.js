import { COMETS, PLN } from "../../config/index.js";
import { buildCometMolangLines } from "./molang/comet.js";
import { buildPlanetMolangLines } from "./molang/planet.js";
import { VANILLA_PRE_ANIMATION, PLAYER_ANIMATIONS } from "./playerVanillaMolang.js";
import { ASTRUM_PRE_ANIMATION } from "./astrumMolang.js";

export function buildPlayerEntityJson() {
  const preAnim = [...VANILLA_PRE_ANIMATION, ...ASTRUM_PRE_ANIMATION];

  for (const [n, p] of Object.entries(PLN)) {
    preAnim.push(...buildPlanetMolangLines(n, p));
  }
  for (const key of Object.keys(COMETS)) {
    preAnim.push(...buildCometMolangLines(key));
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
  for (const [key, C] of Object.entries(COMETS)) {
    particleEffects[`${key}_particle`] = C.identifier;
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
        animations: PLAYER_ANIMATIONS,
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
