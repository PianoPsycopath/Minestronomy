import * as THREE from "three";
import { isAdditiveMaterial } from "../../config/index.js";

// Creates a sprite whose texture comes from a canvas. Draw on g, then set tex.needsUpdate.
export function makeSprite(scene, w, h, order) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const s = new THREE.Sprite(mat);
  s.renderOrder = order;
  scene.add(s);
  return { s, c, tex, g: c.getContext("2d") };
}

export function applyMaterialBlending(spriteObj, materialType) {
  // Custom pack materials such as starfield:sun_moon derive from particles_add, so they blend additively too.
  const desired = isAdditiveMaterial(materialType) ? THREE.AdditiveBlending : THREE.NormalBlending;
  if (spriteObj.s.material.blending !== desired) {
    spriteObj.s.material.blending = desired;
    spriteObj.s.material.needsUpdate = true;
  }
}
