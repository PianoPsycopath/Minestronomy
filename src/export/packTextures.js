import { COMETS } from "../config/index.js";
import { canvasToPngBytes, createDefaultMoonAtlasCanvas, createDefaultPlanetDotCanvas } from "./defaultTextures.js";

// Uses the loaded PNG when it exists. Otherwise it draws the same default image that the sky view shows.
async function bodyTextureBytes(body, texPath, particleLoader, skyScene) {
  const loaded = particleLoader.textureBytes[texPath];
  if (loaded) return loaded;
  if (body === "sun") return canvasToPngBytes(skyScene.SUN.c);
  if (COMETS[body]) return canvasToPngBytes(skyScene.CS[body].c);
  if (body === "moon") return canvasToPngBytes(createDefaultMoonAtlasCanvas());
  return canvasToPngBytes(createDefaultPlanetDotCanvas());
}

// Several bodies can share one texture file. Each file goes into the archive one time.
export async function addTextureFiles(zip, root, particleLoader, skyScene) {
  const exported = new Set();

  for (const [body, cfg] of Object.entries(particleLoader.configs)) {
    if (exported.has(cfg.texturePath)) continue;
    exported.add(cfg.texturePath);
    zip.addBytes(`${root}/${cfg.texturePath}.png`, await bodyTextureBytes(body, cfg.texturePath, particleLoader, skyScene));
  }

  for (const [faceKey, sc] of Object.entries(particleLoader.starboxConfigs)) {
    if (exported.has(sc.texturePath)) continue;
    exported.add(sc.texturePath);

    let bytes = particleLoader.textureBytes[sc.texturePath];
    if (!bytes && skyScene.starboxFaces[faceKey]) {
      bytes = await canvasToPngBytes(skyScene.starboxFaces[faceKey].canvas);
    }
    if (bytes) zip.addBytes(`${root}/${sc.texturePath}.png`, bytes);
  }
}
