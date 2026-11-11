import { PLN, COMETS, CELESTIAL_DEFAULTS, STARBOX_FACES } from "../config/index.js";
import {

  buildManifestJson,
  buildEntityMaterialJson,
  buildStarGeoJson,
  buildStarAnimationJson,
  buildStarEmitterJson,
  buildStarRenderControllerJson,
  buildCalendarRenderControllersJson,
  buildPlayerRenderControllersJson,
  buildPlayerEntityJson,
  buildCometParticleJson,
  buildSunParticleJson,
  buildMoonParticleJson,
  buildPlanetParticleJson,
  buildStarFieldParticleJson
} from "./bedrock/index.js";

export function addEntityFiles(zip, root, packName) {
  zip.addJson(`${root}/manifest.json`, buildManifestJson(packName));
  zip.addJson(`${root}/materials/entity.material`, buildEntityMaterialJson());
  zip.addJson(`${root}/materials/particles.material`, buildEntityMaterialJson());
  zip.addJson(`${root}/models/entity/star.geo.json`, buildStarGeoJson());
  zip.addJson(`${root}/animations/star.animation.json`, buildStarAnimationJson());
  zip.addJson(`${root}/animation_controllers/star_emitter.json`, buildStarEmitterJson());
  zip.addJson(`${root}/render_controllers/star.render_controller.json`, buildStarRenderControllerJson());
  zip.addJson(`${root}/render_controllers/calendar.render_controllers.json`, buildCalendarRenderControllersJson());
  zip.addJson(`${root}/render_controllers/player.render_controllers.json`, buildPlayerRenderControllersJson());
  zip.addJson(`${root}/entity/player.entity.json`, buildPlayerEntityJson());
}

export function addParticleFiles(zip, root, particleLoader) {
  const raw = particleLoader.rawJsons;
  zip.addJson(`${root}/particles/sun.particle.json`, raw.sun || buildSunParticleJson(CELESTIAL_DEFAULTS.sun));
  zip.addJson(`${root}/particles/moon.particle.json`, raw.moon || buildMoonParticleJson(CELESTIAL_DEFAULTS.moon));

  for (const key of Object.keys(COMETS)) {
    zip.addJson(`${root}/particles/${key}.particle.json`, raw[key] || buildCometParticleJson(key));
  }

  for (const [name, pCfg] of Object.entries(PLN)) {
    zip.addJson(`${root}/particles/${name}.particle.json`, buildPlanetParticleJson(name, pCfg, false));
    zip.addJson(`${root}/particles/${name}_hires.particle.json`, buildPlanetParticleJson(name, pCfg, true));
  }

  for (const [faceKey, fCfg] of Object.entries(STARBOX_FACES)) {
    const starsJson = raw[`star_field_${faceKey}_stars`] || buildStarFieldParticleJson(faceKey, fCfg, false);
    zip.addJson(`${root}/particles/star_field_${faceKey}_stars.particle.json`, starsJson);
    zip.addJson(`${root}/particles/star_field_${faceKey}_const.particle.json`, buildStarFieldParticleJson(faceKey, fCfg, true));
  }
}
