import { ZipBuilder } from "./zip/ZipBuilder.js";
import { addEntityFiles, addParticleFiles } from "./packJson.js";
import { addTextureFiles } from "./packTextures.js";
import { downloadBlob } from "./downloadBlob.js";

export async function exportBedrockAddon(particleLoader, skyScene, packName = "Minestronomy") {
  const safeName = packName.replace(/\s+/g, "_");
  const root = `${safeName}_RP`;
  const zip = new ZipBuilder();

  addEntityFiles(zip, root, packName);
  addParticleFiles(zip, root, particleLoader);
  await addTextureFiles(zip, root, particleLoader, skyScene);

  downloadBlob(zip.buildBlob("application/octet-stream"), `${safeName}.mcaddon`);
}
