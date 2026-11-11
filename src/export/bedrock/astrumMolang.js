import { EARTH_RADIUS_BLOCKS } from "../../config/index.js";

// Sky pre-animation code. Runs on the local player each frame.
export const ASTRUM_PRE_ANIMATION = [
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
