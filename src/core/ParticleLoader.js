import { PLN, CELESTIAL_DEFAULTS, STARBOX_FACES } from "../config/constants.js";
import {
  buildSunParticleJson,
  buildMoonParticleJson,
  buildPlanetParticleJson,
  buildStarFieldParticleJson
} from "../config/bedrockTemplates.js";

function stripJsonComments(text) {
  let out = "";
  let inString = false;
  let escaped = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];

    if (inString) {
      out += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      i++;
      continue;
    }

    if (ch === '"') {
      inString = true;
      out += ch;
      i++;
      continue;
    }

    if (ch === "/" && next === "/") {
      i += 2;
      while (i < text.length && text[i] !== "\n") i++;
      continue;
    }

    if (ch === "/" && next === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i += 2;
      continue;
    }

    out += ch;
    i++;
  }

  return out.replace(/,\s*([}\]])/g, "$1");
}

function parseTintColor(colorArr, fallback = [1, 1, 1]) {
  if (!Array.isArray(colorArr) || colorArr.length < 3) return fallback;
  return [
    Number.isFinite(+colorArr[0]) ? +colorArr[0] : fallback[0],
    Number.isFinite(+colorArr[1]) ? +colorArr[1] : fallback[1],
    Number.isFinite(+colorArr[2]) ? +colorArr[2] : fallback[2]
  ];
}

export class ParticleLoader {
  constructor() {
    this.configs = {};
    this.starboxConfigs = {};
    this.rawJsons = {};
    this.textures = {};
    this.textureBytes = {};
  }

  async loadAll() {
    const bodies = ["sun", "moon", ...Object.keys(PLN)];
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

  async fetchBedrockJson(url) {
    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) return null;
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("text/html")) return null;
      const rawText = await res.text();
      return JSON.parse(stripJsonComments(rawText));
    } catch {
      return null;
    }
  }

  getDefaultParticleJson(body) {
    if (body === "sun") return buildSunParticleJson(CELESTIAL_DEFAULTS.sun);
    if (body === "moon") return buildMoonParticleJson(CELESTIAL_DEFAULTS.moon);
    return buildPlanetParticleJson(body, PLN[body], false);
  }

  async loadBodyParticle(body) {
    let json = await this.fetchBedrockJson(`/particles/${body}.particle.json`);
    const fromPublicJson = Boolean(json?.particle_effect);

    if (!json || !json.particle_effect) {
      json = this.getDefaultParticleJson(body);
    }

    this.rawJsons[body] = json;
    const pe = json.particle_effect;
    const renderParams = pe?.description?.basic_render_parameters || {};
    const billboard = pe?.components?.["minecraft:particle_appearance_billboard"] || {};
    const tintComp = pe?.components?.["minecraft:particle_appearance_tinting"] || {};

    const defaultTint =
      body === "sun" || body === "moon" ? [1, 1, 1] : PLN[body]?.tint || [1, 1, 1];

    let texturePath = (renderParams.texture || "textures/environment/planet").replace(/\.png$/i, "");
    const material = renderParams.material || (body === "sun" || body === "moon" ? "particles_alpha" : "particles_add");
    const size = billboard.size || [4, 4];
    const uv = billboard.uv || null;
    const tint = parseTintColor(tintComp.color, defaultTint);

    let imgLoaded = await this.loadTextureImage(texturePath);
    if (!imgLoaded && body === "moon") {
      const altPaths = ["textures/environment/moon_phases", "textures/environment/moonAstrum", "textures/environment/moon"];
      for (const alt of altPaths) {
        if (alt === texturePath) continue;
        imgLoaded = await this.loadTextureImage(alt);
        if (imgLoaded) {
          texturePath = alt;
          break;
        }
      }
    }

    if (PLN[body]) {
      PLN[body].texture = texturePath;
      PLN[body].material = material;
      PLN[body].billboardSize = size;
      PLN[body].tint = tint;
      PLN[body].col = `${Math.round(tint[0] * 255)},${Math.round(tint[1] * 255)},${Math.round(tint[2] * 255)}`;
    } else if (CELESTIAL_DEFAULTS[body]) {
      CELESTIAL_DEFAULTS[body].texture = texturePath;
      CELESTIAL_DEFAULTS[body].material = material;
      CELESTIAL_DEFAULTS[body].size = size;
      CELESTIAL_DEFAULTS[body].uv = uv;
      CELESTIAL_DEFAULTS[body].tint = tint;
    }

    this.configs[body] = {
      body,
      isStarbox: false,
      identifier: pe?.description?.identifier || `astrum:${body}_particle`,
      texturePath,
      material,
      size,
      uv,
      atlasCols: body === "moon" ? 4 : 1,
      atlasRows: body === "moon" ? 2 : 1,
      tint,
      fromPublicJson,
      hasTextureFile: Boolean(imgLoaded),
      image: imgLoaded
    };

    return this.configs[body];
  }

  async loadStarboxFaceParticle(faceKey) {
    const defaultFace = STARBOX_FACES[faceKey];
    const fileNames = [
      `/particles/star_field_${faceKey}_stars.particle.json`,
      `/particles/star_field_${faceKey}.particle.json`
    ];

    let json = null;
    for (const fPath of fileNames) {
      json = await this.fetchBedrockJson(fPath);
      if (json?.particle_effect) break;
    }

    const fromPublicJson = Boolean(json?.particle_effect);
    if (!json || !json.particle_effect) {
      json = buildStarFieldParticleJson(faceKey, defaultFace, false);
    }

    this.rawJsons[`star_field_${faceKey}_stars`] = json;

    const pe = json.particle_effect;
    const renderParams = pe?.description?.basic_render_parameters || {};
    const shapePoint = pe?.components?.["minecraft:emitter_shape_point"] || {};
    const billboard = pe?.components?.["minecraft:particle_appearance_billboard"] || {};
    const looping = pe?.components?.["minecraft:emitter_lifetime_looping"] || {};
    const lifeExpr = pe?.components?.["minecraft:particle_lifetime_expression"] || {};

    let texturePath = (renderParams.texture || defaultFace.texture).replace(/\.png$/i, "");
    const material = renderParams.material || "starfield:stars";
    const offset = shapePoint.offset || defaultFace.offset;
    const size = billboard.size || defaultFace.size;
    const facing = billboard.facing_camera_mode || defaultFace.facing;

    let imgLoaded = await this.loadTextureImage(texturePath);
    if (!imgLoaded) {
      const fallbackPath = `textures/environment/normal_${faceKey}`;
      const altImg = await this.loadTextureImage(fallbackPath);
      if (altImg) {
        imgLoaded = altImg;
        texturePath = fallbackPath;
      }
    }

    STARBOX_FACES[faceKey].texture = texturePath;
    STARBOX_FACES[faceKey].material = material;
    STARBOX_FACES[faceKey].offset = offset;
    STARBOX_FACES[faceKey].size = size;
    STARBOX_FACES[faceKey].facing = facing;
    if (looping.active_time !== undefined) STARBOX_FACES[faceKey].active_time = looping.active_time;
    if (looping.sleep_time !== undefined) STARBOX_FACES[faceKey].sleep_time = looping.sleep_time;
    if (lifeExpr.max_lifetime !== undefined) STARBOX_FACES[faceKey].max_lifetime = lifeExpr.max_lifetime;

    this.starboxConfigs[faceKey] = {
      faceKey,
      body: `starbox_${faceKey}`,
      isStarbox: true,
      identifier: pe?.description?.identifier || defaultFace.identifier,
      texturePath,
      material,
      offset,
      size,
      facing,
      fromPublicJson,
      hasTextureFile: Boolean(imgLoaded),
      image: imgLoaded
    };

    return this.starboxConfigs[faceKey];
  }

  async loadTextureImage(texturePath) {
    if (this.textures[texturePath]) {
      return this.textures[texturePath];
    }

    const url = `/${texturePath.replace(/^\/+/, "")}.png`;
    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) return null;
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("text/html")) return null;

      const buf = await res.arrayBuffer();
      this.textureBytes[texturePath] = new Uint8Array(buf);

      const blob = new Blob([buf], { type: "image/png" });
      const objUrl = URL.createObjectURL(blob);
      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = objUrl;
      });

      this.textures[texturePath] = img;
      return img;
    } catch {
      return null;
    }
  }

  async setCustomTextureFile(targetKey, file) {
    const buf = await file.arrayBuffer();
    const isStarbox = targetKey.startsWith("starbox_");
    const cfg = isStarbox
      ? this.starboxConfigs[targetKey.replace("starbox_", "")]
      : this.configs[targetKey];
    if (!cfg) return;

    this.textureBytes[cfg.texturePath] = new Uint8Array(buf);
    const blob = new Blob([buf], { type: "image/png" });
    const objUrl = URL.createObjectURL(blob);
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = objUrl;
    });

    this.textures[cfg.texturePath] = img;

    for (const c of Object.values(this.configs)) {
      if (c.texturePath === cfg.texturePath) {
        c.image = img;
        c.hasTextureFile = true;
      }
    }
    for (const sc of Object.values(this.starboxConfigs)) {
      if (sc.texturePath === cfg.texturePath) {
        sc.image = img;
        sc.hasTextureFile = true;
      }
    }
  }
}