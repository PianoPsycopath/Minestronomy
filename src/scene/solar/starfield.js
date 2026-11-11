import * as THREE from "three";
import { STAR_COUNT, STAR_RADIUS } from "./solarSettings.js";

// Random stars on a large sphere. A fixed seed gives the same stars at every start.
export function createStarfield() {
  const positions = new Float32Array(STAR_COUNT * 3);
  let seed = 7919;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < STAR_COUNT; i++) {
    const z = rand() * 2 - 1;
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    positions.set([r * Math.cos(a) * STAR_RADIUS, z * STAR_RADIUS, r * Math.sin(a) * STAR_RADIUS], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: 0x9fb4d6, size: 1.6, sizeAttenuation: false, depthWrite: false })
  );
  stars.frustumCulled = false;
  return stars;
}
