import { PACK_MANIFEST as M } from "../../config/index.js";

export function buildManifestJson(packName = "Minestronomy") {
  return {
    format_version: 2,
    header: {
      description: M.description,
      name: packName,
      uuid: M.headerUuid,
      version: [...M.headerVersion],
      min_engine_version: [...M.minEngineVersion]
    },
    modules: [
      {
        description: M.description,
        type: "resources",
        uuid: M.moduleUuid,
        version: [...M.moduleVersion]
      }
    ]
  };
}
