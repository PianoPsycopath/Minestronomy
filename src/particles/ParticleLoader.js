import { PLN, COMETS, STARBOX_FACES } from "../config/index.js";
import { buildStarFieldParticleJson } from "../export/bedrock/index.js";
import { stripJsonComments } from "./jsonText.js";
import { decodePng } from "./pngImage.js";
import { defaultParticleJson } from "./defaultParticleJson.js";
import { readBodySettings, readStarboxSettings } from "./settings.js";
import { applyBodyOverrides, applyStarboxOverrides } from "./configOverrides.js";

const MOON_ATLAS_FALLBACKS = [
  "textures/environment/moon_phases",
  "textures/environment/moonAstrum",
  "textures/environment/moon"
];

export class ParticleLoader {
  constructor() {
    this.configs = {};
    this.starboxConfigs = {};
    this.rawJsons = {};
    this.textures = {};
    this.textureBytes = {};
  }

  async loadAll() {
    const bodies = ["sun", "moon", ...Object.keys(PLN), ...Object.keys(COMETS)];
    const faces = Object.keys(STARBOX_FACES);
    await Promise.all([
      ...bodies.map(b => this.loadBodyParticle(b)),
      ...faces.map(f => this.loadStarboxFaceParticle(f))
    ]);
    return {
      configs: this.configs,
      starboxConfigs: this.starboxConfigs
    };
  }

  // A dev server can return an HTML page for a missing file. The loader treats this as "not found".
  async fetchBedrockJson(url) {
    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) return null;
      if ((res.headers.get("content-type") || "").includes("text/html")) return null;
      return JSON.parse(stripJsonComments(await res.text()));
    } catch {
      return null;
    }
  }

  async loadBodyParticle(body) {
    let json = await this.fetchBedrockJson(`/particles/${body}.particle.json`);
    const fromPublicJson = Boolean(json?.particle_effect);
    if (!fromPublicJson) json = defaultParticleJson(body);
    this.rawJsons[body] = json;

    const settings = readBodySettings(body, json);
    let { texturePath } = settings;
    let image = await this.loadTextureImage(texturePath);

    if (!image && body === "moon") {
      for (const alt of MOON_ATLAS_FALLBACKS) {
        if (alt === texturePath) continue;
        image = await this.loadTextureImage(alt);
        if (image) {
          texturePath = alt;
          break;
        }
      }
    }

    applyBodyOverrides(body, { ...settings, texturePath });

    this.configs[body] = {
      body,
      isStarbox: false,
      identifier: settings.identifier,
      texturePath,
      material: settings.material,
      size: settings.size,
      uv: settings.uv,
      atlasCols: body === "moon" ? 4 : 1,
      atlasRows: body === "moon" ? 2 : 1,
      tint: settings.tint,
      fromPublicJson,
      hasTextureFile: Boolean(image),
      image
    };
    return this.configs[body];
  }

  async loadStarboxFaceParticle(faceKey) {
    const defaultFace = STARBOX_FACES[faceKey];
    let json = null;
    for (const path of [
      `/particles/star_field_${faceKey}_stars.particle.json`,
      `/particles/star_field_${faceKey}.particle.json`
    ]) {
      json = await this.fetchBedrockJson(path);
      if (json?.particle_effect) break;
    }

    const fromPublicJson = Boolean(json?.particle_effect);
    if (!fromPublicJson) json = buildStarFieldParticleJson(faceKey, defaultFace, false);
    this.rawJsons[`star_field_${faceKey}_stars`] = json;

    const settings = readStarboxSettings(faceKey, json);
    let { texturePath } = settings;
    let image = await this.loadTextureImage(texturePath);

    if (!image) {
      const fallbackPath = `textures/environment/normal_${faceKey}`;
      const fallbackImage = await this.loadTextureImage(fallbackPath);
      if (fallbackImage) {
        image = fallbackImage;
        texturePath = fallbackPath;
      }
    }

    applyStarboxOverrides(faceKey, { ...settings, texturePath });

    this.starboxConfigs[faceKey] = {
      faceKey,
      body: `starbox_${faceKey}`,
      isStarbox: true,
      identifier: settings.identifier,
      texturePath,
      material: settings.material,
      offset: settings.offset,
      size: settings.size,
      facing: settings.facing,
      fromPublicJson,
      hasTextureFile: Boolean(image),
      image
    };
    return this.starboxConfigs[faceKey];
  }

  async loadTextureImage(texturePath) {
    if (this.textures[texturePath]) return this.textures[texturePath];

    try {
      const res = await fetch(`/${texturePath.replace(/^\/+/, "")}.png`, { cache: "no-cache" });
      if (!res.ok) return null;
      if ((res.headers.get("content-type") || "").includes("text/html")) return null;

      const bytes = new Uint8Array(await res.arrayBuffer());
      this.textureBytes[texturePath] = bytes;
      const image = await decodePng(bytes);
      this.textures[texturePath] = image;
      return image;
    } catch {
      return null;
    }
  }

  // Replaces the texture of one body or starbox face. Other entries that share the same file get the new image too.
  async setCustomTextureFile(targetKey, file) {
    const buf = await file.arrayBuffer();
    const cfg = targetKey.startsWith("starbox_")
      ? this.starboxConfigs[targetKey.replace("starbox_", "")]
      : this.configs[targetKey];
    if (!cfg) return;

    const bytes = new Uint8Array(buf);
    this.textureBytes[cfg.texturePath] = bytes;
    const image = await decodePng(bytes);
    this.textures[cfg.texturePath] = image;

    for (const c of [...Object.values(this.configs), ...Object.values(this.starboxConfigs)]) {
      if (c.texturePath === cfg.texturePath) {
        c.image = image;
        c.hasTextureFile = true;
      }
    }
  }
}
