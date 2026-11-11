import { generateUUID } from "./uuid.js";

export function buildManifestJson(packName = "Minestronomy") {
  return {
    format_version: 2,
    header: {
      name: packName,
      description: "Minestronomy Client-Side Astronomical Sky Resource Pack",
      uuid: generateUUID(),
      version: [1, 0, 0],
      min_engine_version: [1, 20, 0]
    },
    modules: [
      {
        type: "resources",
        uuid: generateUUID(),
        version: [1, 0, 0]
      }
    ]
  };
}
