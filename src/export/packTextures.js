import { COMETS, FALLBACK_PACK_FILES, STARBOX_FACES, STATIC_PACK_FILES } from "../config/index.js";
import { readBaseFile } from "./baseAssets.js";
import { canvasToPngBytes, createDefaultMoonAtlasCanvas, createDefaultPlanetDotCanvas } from "./defaultTextures.js";

// Uses the loaded PNG when it exists. Otherwise it draws the same default image that the sky view shows.
async function bodyTextureBytes(body, texPath, particleLoader, skyScene) {
  const loaded = particleLoader.textureBytes[texPath];
  if (loaded) return loaded;
  if (body === "sun") return canvasToPngBytes(skyScene.SUN.c);
  if (body === "moon") return canvasToPngBytes(createDefaultMoonAtlasCanvas());
  return canvasToPngBytes(createDefaultPlanetDotCanvas());
}

// Writes every PNG of the pack.
//  1. Textures that the editor owns: the sun, the moon, the planet dot and the starbox faces. The PNG that is loaded in the editor wins.
//  2. The constellation overlays (const_<face>). The editor's PNG when it has one, else the one from base/.
//  3. Everything else (comet textures, high resolution planets, vanilla overrides, MER maps, calendar atlas, pack icon) comes unchanged from base/.
// Several bodies can share one texture file. Each file goes into the archive one time.
export async function addTextureFiles(zip, root, particleLoader, skyScene) {
  const written = new Set();
  const add = (path, bytes) => {
    if (written.has(path)) return;
    written.add(path);
    zip.addBytes(`${root}/${path}`, bytes);
  };

  const staticPaths = new Set(STATIC_PACK_FILES);

  for (const [body, cfg] of Object.entries(particleLoader.configs)) {
    const file = `${cfg.texturePath}.png`;
    // Comets are drawn from the textures of base/. The sky view paints its own comet sprite, which is not a pack texture.
    if (COMETS[body] || staticPaths.has(file)) continue;
    add(file, await bodyTextureBytes(body, cfg.texturePath, particleLoader, skyScene));
  }

  for (const [faceKey, sc] of Object.entries(particleLoader.starboxConfigs)) {
    let bytes = particleLoader.textureBytes[sc.texturePath];
    if (!bytes && skyScene.starboxFaces[faceKey]) {
      bytes = await canvasToPngBytes(skyScene.starboxFaces[faceKey].canvas);
    }
    if (bytes) add(`${sc.texturePath}.png`, bytes);
  }

  for (const [faceKey, face] of Object.entries(STARBOX_FACES)) {
    const path = face.constTexture || `textures/const_${faceKey}`;
    await particleLoader.loadTextureImage(path);
    const bytes = particleLoader.textureBytes[path];
    if (bytes) add(`${path}.png`, bytes);
  }

  for (const path of [...STATIC_PACK_FILES, ...FALLBACK_PACK_FILES]) {
    if (written.has(path)) continue;
    add(path, await readBaseFile(path));
  }
}
