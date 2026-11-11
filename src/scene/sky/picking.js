import * as THREE from "three";
import { D, clamp } from "../../core/math.js";
import { PLN, COMETS } from "../../config/index.js";
import { cometAngularSize } from "../../core/astronomy/index.js";
import { dir } from "./projection.js";

const PICK_TOLERANCE_PX = 18;

// Finds the nearest visible body within a small screen distance of the click.
// "pos" holds the altitude and azimuth of each body (the result of SkyScene.render). "s" is the sky state.
export function pickSky({ canvas, camera, planetSprites, cometSprites }, clientX, clientY, pos, s, { disc, md, xray }) {
  const rect = canvas.getBoundingClientRect();
  const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);
  camera.updateMatrixWorld(true);
  const ray = new THREE.Vector3(nx, ny, 0.5).unproject(camera).normalize();
  const tol = (PICK_TOLERANCE_PX / rect.height) * camera.fov;

  const cands = [];
  const test = (target, p, radius) => {
    if (!p || (p.alt < 0 && !xray)) return;
    const sep = Math.acos(clamp(ray.dot(dir(p, 1)), -1, 1)) / D;
    if (sep <= Math.max(tol, radius)) cands.push({ target, sep });
  };

  test({ type: "sun" }, pos.su, disc * 0.5);
  test({ type: "moon" }, pos.mo, disc * 0.55);
  for (const n in PLN) {
    if (planetSprites[n].s.material.opacity < 0.03) continue;
    const bScale = (PLN[n].billboardSize?.[0] || PLN[n].size) / 4;
    test({ type: "planet", planet: n }, pos.pa[n], Math.max(md * bScale * 2, 0.4) / 2);
  }
  for (const key in COMETS) {
    if (!cometSprites[key].s.visible) continue;
    test({ type: "comet", comet: key }, pos.pa.comets[key], cometAngularSize(s.comets[key].size) * 0.3);
  }

  cands.sort((a, b) => a.sep - b.sep);
  return {
    hit: cands[0]?.target || null,
    alt: Math.asin(clamp(ray.y, -1, 1)) / D,
    az: (Math.atan2(ray.x, -ray.z) / D + 360) % 360
  };
}
