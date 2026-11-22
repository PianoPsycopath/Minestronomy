// Files that the pack needs but the editor does not author. Vite bundles them straight from base/, so there is no second copy to keep in sync.
// Which of them go into an export is decided by STATIC_PACK_FILES and FALLBACK_PACK_FILES in config/pack.js.
// scripts/verify-export.mjs checks that every listed file is covered by one of the patterns below.
const assetUrls = import.meta.glob(
  [
    "../../base/pack_icon.png",
    "../../base/models/entity/calendar.geo.json",
    "../../base/textures/ui/calendar/atlas/master_digits.png",
    "../../base/textures/environment/comet_*.png",
    "../../base/textures/environment/planet_*.png",
    "../../base/textures/environment/sun.png",
    "../../base/textures/environment/sun_vv.png",
    "../../base/textures/environment/moon_phases.png",
    "../../base/textures/environment/end_sky.png",
    "../../base/textures/environment/moon_phasesASTRUM_mer.png",
    "../../base/textures/*_mer.png",
    "../../base/textures/const_??.png"
  ],
  { query: "?url", import: "default", eager: true }
);

export async function readBaseFile(packPath) {
  const url = assetUrls[`../../base/${packPath}`];
  if (!url) throw new Error(`base/${packPath} is not bundled. Add it to the patterns in export/baseAssets.js`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load base/${packPath} (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}
