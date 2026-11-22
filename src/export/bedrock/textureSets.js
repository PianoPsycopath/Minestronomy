import { ENV_TEXTURE_SETS, STARBOX_FACES } from "../../config/index.js";

const textureSet = (color, mer) => ({
  format_version: "1.16.100",
  "minecraft:texture_set": { color, metalness_emissive_roughness: mer }
});

// Returns [{ path, data }] for every *.texture_set.json of the pack.
// A texture set tells deferred lighting which image holds the colour and which one holds the metalness / emissive / roughness data.
export function buildTextureSetFiles() {
  const files = [];

  for (const faceKey of Object.keys(STARBOX_FACES)) {
    for (const kind of ["normal", "const"]) {
      const name = `${kind}_${faceKey}`;
      files.push({ path: `textures/${name}.texture_set.json`, data: textureSet(name, `${name}_mer`) });
    }
  }

  for (const [texPath, { color, mer }] of Object.entries(ENV_TEXTURE_SETS)) {
    files.push({ path: `${texPath}.texture_set.json`, data: textureSet(color, mer) });
  }

  return files;
}
