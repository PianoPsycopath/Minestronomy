import * as THREE from "three";

export function makeLine(count, color, opacity, closed) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  const line = closed ? new THREE.LineLoop(geometry, material) : new THREE.Line(geometry, material);
  // The vertices change after creation, so the first bounding sphere is not valid.
  line.frustumCulled = false;
  return line;
}
