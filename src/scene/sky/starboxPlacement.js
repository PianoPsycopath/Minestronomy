import * as THREE from "three";
import { EMITTER_TO_CATALOGUE, planeAxesOf } from "../../config/index.js";

// Orientation of one face plane inside the particle frame. A plane has image-right along +X and image-up along +Y.
export function faceQuaternion(face) {
  const axes = planeAxesOf(face);
  const right = new THREE.Vector3(...axes.right);
  const up = new THREE.Vector3(...axes.down).negate();
  const basis = new THREE.Matrix4().makeBasis(right, up, new THREE.Vector3().crossVectors(right, up));
  return new THREE.Quaternion().setFromRotationMatrix(basis);
}

// Orientation of the whole starbox. vX, vY, vZ are the view directions of the catalogue axes (RA 0, RA 90, celestial pole).
// Each axis of the particle frame points where EMITTER_TO_CATALOGUE sends it.
export function starboxQuaternion(vX, vY, vZ) {
  const m = EMITTER_TO_CATALOGUE;
  const axis = j => vX.clone().multiplyScalar(m[0][j]).addScaledVector(vY, m[1][j]).addScaledVector(vZ, m[2][j]);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(axis(0), axis(1), axis(2)));
}
