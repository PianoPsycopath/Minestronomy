export const PACK_MANIFEST = {
  description: "Minestronomy 1.0.0",
  headerUuid: "f0e1c3d2-4b6a-4c5e-9f8a-1b2c3d4e5f6a",
  moduleUuid: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  headerVersion: [1, 2, 2],
  moduleVersion: [1, 2, 1],
  minEngineVersion: [1, 21, 80]
};

export const PACK_MATERIALS = {
  "starfield:sun_moon:particles_add": {
    "+defines": ["ALPHA_TEST"]
  },
  "minestronomy_sky:sun_moon:particles_add": {
    "+states": ["Blending", "DisableDepthWrite"],
    depthFunc: "LessEqual"
  },
  "minestronomy_sky_always:sun_moon:particles_add": {
    "+states": ["Blending", "DisableDepthWrite"],
    depthFunc: "Always"
  },
  "minestronomy_sky_greater:sun_moon:particles_add": {
    "+states": ["Blending"]
  }
};

// Vibrant Visuals / deferred lighting. Written to lighting/global.json.
export const PACK_LIGHTING = {
  identifier: "astrum:global_lighting",
  sun: { illuminance: 0.0, color: "#000000" },
  moon: { illuminance: 0.0, color: "#000000" },
  emissiveDesaturation: 0.1
};

// Texture sets for the environment textures. The starbox faces get theirs from STARBOX_FACES (see textureSets.js).
// "#00FF00" is a flat metalness/emissive/roughness colour (fully emissive).
export const ENV_TEXTURE_SETS = {
  "textures/environment/sunAstrum": { color: "sunAstrum", mer: "#00FF00" },
  "textures/environment/moon_phasesASTRUM": { color: "moon_phasesASTRUM", mer: "moon_phasesASTRUM_mer" },
  // NOTE: base/ has color "sunAstrum" here, not "planet". This looks like a copy-paste slip in the pack.
  // It is mirrored on purpose so the export matches base/. Change both together if it gets fixed.
  "textures/environment/planet": { color: "sunAstrum", mer: "#00FF00" }
};

// Files that the editor does not author. They are copied unchanged from base/ into every export.
// Paths are relative to the pack root and to base/.
const FACE_KEYS = ["px", "nx", "py", "ny", "pz", "nz"];
const HIRES_PLANETS = ["mercury", "venus", "mars", "jupiter", "saturn"];

export const STATIC_PACK_FILES = [
  "pack_icon.png",
  "models/entity/calendar.geo.json",
  "textures/ui/calendar/atlas/master_digits.png",

  // Transparent overrides of the vanilla sun and moon, and the End sky. Without them the vanilla bodies show up next to the custom ones.
  "textures/environment/sun.png",
  "textures/environment/sun_vv.png",
  "textures/environment/moon_phases.png",
  "textures/environment/end_sky.png",

  "textures/environment/comet_coma.png",
  "textures/environment/comet_tail.png",
  ...HIRES_PLANETS.map(n => `textures/environment/planet_${n}.png`),

  // Metalness / emissive / roughness maps, hand-authored in the pack.
  "textures/environment/moon_phasesASTRUM_mer.png",
  ...FACE_KEYS.map(f => `textures/normal_${f}_mer.png`),
  ...FACE_KEYS.map(f => `textures/const_${f}_mer.png`)
];

// Files that are only used when the editor has no texture of its own. The editor wins when it has one.
export const FALLBACK_PACK_FILES = FACE_KEYS.map(f => `textures/const_${f}.png`);

// Materials derive from a parent: "child:parent". Follow the chain to see whether it ends in particles_add.
export function isAdditiveMaterial(name) {
  if (name === "particles_add" || name === "starfield:stars") return true;
  const parents = new Map();
  for (const key of Object.keys(PACK_MATERIALS)) {
    const i = key.lastIndexOf(":");
    parents.set(key.slice(0, i), key.slice(i + 1));
  }
  let cur = name;
  for (let guard = 0; guard < 8 && cur; guard++) {
    if (cur === "particles_add") return true;
    cur = parents.get(cur);
  }
  return false;
}
