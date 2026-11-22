import { PACK_LIGHTING as L } from "../../config/index.js";

// lighting/global.json. Turns off the vanilla sun and moon light in deferred lighting (Vibrant Visuals).
export function buildLightingJson() {
  return {
    format_version: "1.21.40",
    "minecraft:lighting_settings": {
      description: { identifier: L.identifier },
      directional_lights: {
        orbital: {
          sun: { ...L.sun },
          moon: { ...L.moon }
        }
      },
      emissive: { desaturation: L.emissiveDesaturation }
    }
  };
}
