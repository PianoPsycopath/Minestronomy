import { PLN, COMETS, CELESTIAL_DEFAULTS, STARBOX_FACES } from "../config/index.js";
import {
  buildManifestJson,
  buildParticleMaterialJson,
  buildLightingJson,
  buildTextureSetFiles,
  buildStarGeoJson,
  buildStarAnimationJson,
  buildStarEmitterJson,
  buildStarRenderControllerJson,
  buildCalendarRenderControllersJson,
  buildPlayerEntityJson,
  buildCometParticleJson,
  buildCometTailParticleJson,
  buildSunParticleJson,
  buildMoonParticleJson,
  buildPlanetParticleJson,
  buildStarFieldParticleJson
} from "./bedrock/index.js";

// Every JSON file of the pack, as [{ path, data }]. Paths are relative to the pack root and use the file names of base/.
// rawJsons holds particle files that were loaded from public/particles. They win over the generated ones for the sun, the moon, the comets and the starbox faces.
// This function does not touch the browser, so scripts/verify-export.mjs can run it in Node.
export function buildPackJsonFiles({ packName = "Minestronomy", rawJsons = {} } = {}) {
  const files = [
    { path: "manifest.json", data: buildManifestJson(packName) },
    { path: "materials/particles.material", data: buildParticleMaterialJson() },
    { path: "lighting/global.json", data: buildLightingJson() },
    { path: "models/entity/star.geo.json", data: buildStarGeoJson() },
    { path: "animations/star.animation.json", data: buildStarAnimationJson() },
    { path: "animation_controllers/star_emitter.json", data: buildStarEmitterJson() },
    { path: "render_controllers/star.render_controller.json", data: buildStarRenderControllerJson() },
    { path: "render_controllers/calendar.render_controllers.json", data: buildCalendarRenderControllersJson() },
    { path: "entity/player.entity.json", data: buildPlayerEntityJson() }
  ];

  files.push(
    { path: "particles/sun.particle.json", data: rawJsons.sun || buildSunParticleJson(CELESTIAL_DEFAULTS.sun) },
    { path: "particles/moon.particle.json", data: rawJsons.moon || buildMoonParticleJson(CELESTIAL_DEFAULTS.moon) }
  );

  for (const key of Object.keys(COMETS)) {
    files.push(
      { path: `particles/${key}_particle.json`, data: rawJsons[key] || buildCometParticleJson(key) },
      { path: `particles/${key}_tail_particle.json`, data: buildCometTailParticleJson(key) }
    );
  }

  // Planets: "mars" is the low resolution particle, "zmars" the high resolution one that the spyglass switches to.
  for (const [name, pCfg] of Object.entries(PLN)) {
    files.push(
      { path: `particles/${name}.particle.json`, data: buildPlanetParticleJson(name, pCfg, false) },
      { path: `particles/z${name}.particle.json`, data: buildPlanetParticleJson(name, pCfg, true) }
    );
  }

  // Starbox faces: "star_field_px_stars" is the normal sky, "star_field_px" the constellation overlay.
  for (const [faceKey, fCfg] of Object.entries(STARBOX_FACES)) {
    files.push(
      {
        path: `particles/star_field_${faceKey}_stars.particle.json`,
        data: rawJsons[`star_field_${faceKey}_stars`] || buildStarFieldParticleJson(faceKey, fCfg, false)
      },
      { path: `particles/star_field_${faceKey}.particle.json`, data: buildStarFieldParticleJson(faceKey, fCfg, true) }
    );
  }

  files.push(...buildTextureSetFiles());
  return files;
}

export function addJsonFiles(zip, root, options) {
  for (const { path, data } of buildPackJsonFiles(options)) {
    zip.addJson(`${root}/${path}`, data);
  }
}
