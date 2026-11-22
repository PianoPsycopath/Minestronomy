import { CELESTIAL_DEFAULTS, STARBOX_FACES } from "../config/index.js";
import { exportBodies } from "./bedrock/bodies.js";
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
// The catalog is optional. Without it, the pack contains the stock bodies only.
// A comet that the catalog marks as edited is generated again. Its raw JSON does not apply.
// This function does not touch the browser, so scripts/verify-export.mjs can run it in Node.
// A custom planet has no high-resolution texture. It reuses its low-resolution look.
const withHires = (p) => ({ ...p, hires: p.hires ?? { texture: p.texture, tint: p.tint } });

export function buildPackJsonFiles({ packName = "Minestronomy", rawJsons = {}, catalog } = {}) {
  const { planets, comets } = exportBodies(catalog);
  const files = [
    { path: "manifest.json", data: buildManifestJson(packName) },
    { path: "materials/particles.material", data: buildParticleMaterialJson() },
    { path: "lighting/global.json", data: buildLightingJson() },
    { path: "models/entity/star.geo.json", data: buildStarGeoJson(catalog) },
    { path: "animations/star.animation.json", data: buildStarAnimationJson(catalog) },
    { path: "animation_controllers/star_emitter.json", data: buildStarEmitterJson(catalog) },
    { path: "render_controllers/star.render_controller.json", data: buildStarRenderControllerJson() },
    { path: "render_controllers/calendar.render_controllers.json", data: buildCalendarRenderControllersJson() },
    { path: "entity/player.entity.json", data: buildPlayerEntityJson(catalog) }
  ];

  files.push(
    { path: "particles/sun.particle.json", data: rawJsons.sun || buildSunParticleJson(CELESTIAL_DEFAULTS.sun) },
    { path: "particles/moon.particle.json", data: rawJsons.moon || buildMoonParticleJson(CELESTIAL_DEFAULTS.moon) }
  );

  for (const C of comets) {
    const raw = catalog?.isModified(C.key) ? null : rawJsons[C.key];
    files.push(
      { path: `particles/${C.key}_particle.json`, data: raw || buildCometParticleJson(C) },
      { path: `particles/${C.key}_tail_particle.json`, data: buildCometTailParticleJson(C) }
    );
  }

  // Planets: "mars" is the low resolution particle, "zmars" the high resolution one that the spyglass switches to.
  for (const planet of planets) {
    const { key } = planet;
    const pCfg = catalog?.isCustom(key) ? withHires(planet) : planet;
    files.push(
      { path: `particles/${key}.particle.json`, data: buildPlanetParticleJson(key, pCfg, false) },
      { path: `particles/z${key}.particle.json`, data: buildPlanetParticleJson(key, pCfg, true) }
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