import * as THREE from "three";
import { cos, sin } from "../../core/math.js";

// Converts altitude and azimuth (degrees) to a point at distance r from the observer.
// Three.js axes: +X is east, +Y is up, -Z is north.
export function dir(p, r) {
  return new THREE.Vector3(cos(p.alt) * sin(p.az) * r, sin(p.alt) * r, -cos(p.alt) * cos(p.az) * r);
}
