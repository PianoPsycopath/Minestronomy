import { PLN, COMETS, VIS } from "../../config/index.js";

const FALLBACK_VIS = [-9, -3];

// Returns the planets and the comets to export. Without a catalog, the static configuration applies.
export function exportBodies(catalog) {
  if (catalog) return { planets: catalog.planets(), comets: catalog.comets() };
  return {
    planets: Object.entries(PLN).map(([key, p]) => ({ ...p, key, vis: VIS[key] ?? FALLBACK_VIS })),
    comets: Object.entries(COMETS).map(([key, C]) => ({ ...C, key }))
  };
}