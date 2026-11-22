import { PACK_MATERIALS } from "../../config/index.js";

// materials/particles.material
export function buildParticleMaterialJson() {
  return {
    materials: {
      version: "1.0.0",
      ...structuredClone(PACK_MATERIALS)
    }
  };
}
