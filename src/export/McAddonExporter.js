import { ZipBuilder } from "./ZipBuilder.js";
import { PLN, CELESTIAL_DEFAULTS, STARBOX_FACES } from "../config/constants.js";
import { cos } from "../core/math.js";
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
  buildSunParticleJson,
  buildMoonParticleJson,
  buildPlanetParticleJson,
  buildStarFieldParticleJson
} from "../config/bedrockTemplates.js";

async function canvasToPngBytes(canvas) {
  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
  const buf = await blob.arrayBuffer();
  return new Uint8Array(buf);
}

function createDefaultPlanetDotCanvas() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 28);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.4, "rgba(255,255,255,0.85)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.beginPath();
  g.arc(32, 32, 28, 0, Math.PI * 2);
  g.fill();
  return c;
}

function createDefaultMoonAtlasCanvas() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d");
  const elongs = [180, 225, 270, 315, 0, 45, 90, 135];

  for (let ph = 0; ph < 8; ph++) {
    const col = ph % 4;
    const row = Math.floor(ph / 4);
    const cx = col * 128 + 64;
    const cy = row * 128 + 64;
    const r = 46;
    const elong = elongs[ph];

    g.save();
    g.translate(cx, cy);
    g.fillStyle = "rgb(27, 31, 42)";
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.fill();

    if (ph !== 4) {
      const k = cos(elong);
      const wax = elong < 180;
      const sg = wax ? 1 : -1;
      g.fillStyle = "rgb(235, 235, 225)";
      g.beginPath();
      g.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, !wax);
      g.ellipse(0, 0, Math.abs(k) * r + 0.01, r, 0, Math.PI / 2, -Math.PI / 2, sg * k > 0);
      g.fill();
    }
    g.restore();
  }
  return c;
}

export async function exportBedrockAddon(particleLoader, skyScene, packName = "Minestronomy") {
  const zip = new ZipBuilder();
  const root = `${packName.replace(/\s+/g, "_")}_RP`;

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

  const sunJson = particleLoader.rawJsons.sun || buildSunParticleJson(CELESTIAL_DEFAULTS.sun);
  const moonJson = particleLoader.rawJsons.moon || buildMoonParticleJson(CELESTIAL_DEFAULTS.moon);
  zip.addJson(`${root}/particles/sun.particle.json`, sunJson);
  zip.addJson(`${root}/particles/moon.particle.json`, moonJson);

  for (const [name, pCfg] of Object.entries(PLN)) {
    const pJson = buildPlanetParticleJson(name, pCfg, false);
    const pHiResJson = buildPlanetParticleJson(name, pCfg, true);
    zip.addJson(`${root}/particles/${name}.particle.json`, pJson);
    zip.addJson(`${root}/particles/${name}_hires.particle.json`, pHiResJson);
  }

  for (const [faceKey, fCfg] of Object.entries(STARBOX_FACES)) {
    const starsJson =
      particleLoader.rawJsons[`star_field_${faceKey}_stars`] ||
      buildStarFieldParticleJson(faceKey, fCfg, false);
    const constJson = buildStarFieldParticleJson(faceKey, fCfg, true);
    zip.addJson(`${root}/particles/star_field_${faceKey}_stars.particle.json`, starsJson);
    zip.addJson(`${root}/particles/star_field_${faceKey}_const.particle.json`, constJson);
  }

  const exportedTexPaths = new Set();

  for (const [body, cfg] of Object.entries(particleLoader.configs)) {
    const texPath = cfg.texturePath;
    if (exportedTexPaths.has(texPath)) continue;
    exportedTexPaths.add(texPath);

    let bytes = particleLoader.textureBytes[texPath];
    if (!bytes) {
      if (body === "sun") {
        bytes = await canvasToPngBytes(skyScene.SUN.c);
      } else if (body === "moon") {
        bytes = await canvasToPngBytes(createDefaultMoonAtlasCanvas());
      } else {
        bytes = await canvasToPngBytes(createDefaultPlanetDotCanvas());
      }
    }
    zip.addBytes(`${root}/${texPath}.png`, bytes);
  }

  for (const [faceKey, sc] of Object.entries(particleLoader.starboxConfigs)) {
    const texPath = sc.texturePath;
    if (exportedTexPaths.has(texPath)) continue;
    exportedTexPaths.add(texPath);

    let bytes = particleLoader.textureBytes[texPath];
    if (!bytes && skyScene.starboxFaces[faceKey]) {
      bytes = await canvasToPngBytes(skyScene.starboxFaces[faceKey].canvas);
    }
    if (bytes) {
      zip.addBytes(`${root}/${texPath}.png`, bytes);
    }
  }

  const blob = zip.buildBlob("application/octet-stream");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${packName.replace(/\s+/g, "_")}.mcaddon`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}