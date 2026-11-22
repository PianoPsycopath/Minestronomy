// How the six starbox textures are laid out in the game. Mirrors the geometry of the script that draws them (starsVV.py).
// The preview uses it to place the star field, so keep the two in step. Matrices are row-major 3x3, applied to column vectors.

const mul = (A, B) => A.map((_, i) => B[0].map((__, j) => A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j]));
const transpose = A => A[0].map((_, j) => A.map(row => row[j]));
const neg = A => A.map(row => row.map(x => -x));

// Catalogue frame (x = RA 0h, y = RA 6h, z = celestial pole) -> the particle frame that the face offsets are written in.
export const SKY_TO_WORLD = [[-1, 0, 0], [0, -1, 0], [0, 0, 1]];

// The star textures are drawn from a rotated copy of the sky so that the sun, which the animation moves along the ecliptic, sits in the right
// place among them. The rotation takes the sky's own turn angle (day 80 of the year, in degrees) into account.
export const EQUINOX_DAY = 80;
const C = ((EQUINOX_DAY * 360) / 365.25) * (Math.PI / 180);
const S_SYNC = [[Math.sin(C), Math.cos(C), 0], [Math.cos(C), -Math.sin(C), 0], [0, 0, 1]];

// Catalogue direction -> direction that is drawn into the texture. A proper rotation.
export const SKY_PRE = neg(mul(SKY_TO_WORLD, S_SYNC));

// Particle (emitter) frame -> catalogue frame. Both factors are orthogonal, so the inverses are transposes.
export const EMITTER_TO_CATALOGUE = mul(transpose(SKY_PRE), transpose(SKY_TO_WORLD));

// Where the image of a face points inside the emitter frame, per facing mode of the particle.
// "xy" is pz / nz, "xz" is py / ny and "yz" is px / nx.
export const PLANE_AXES = {
  xy: { right: [1, 0, 0], down: [0, -1, 0] },
  xz: { right: [1, 0, 0], down: [0, 0, 1] },
  yz: { right: [0, 0, -1], down: [0, -1, 0] }
};

export function planeAxesOf(face) {
  const mode = String(face.facing || "").replace("emitter_transform_", "");
  return PLANE_AXES[mode] || PLANE_AXES.xy;
}

// The textures are drawn for a cube whose faces end exactly at the cube edges, so a face spans +-distance, not +-size.
// With size 256 and offset 272 the real scale is 272. Measured against real star positions: 0.08 deg off at 272, 1.3 deg off at 256.
export function faceHalfExtent(face) {
  return Math.max(...(face.offset || [0, 0, 256]).map(Math.abs));
}

// A pixel of a face, with u and v in [-1, 1] (u along image-right, v along image-down), as a unit vector in the catalogue frame.
export function texelToCatalogue(face, u, v) {
  const { right, down } = planeAxesOf(face);
  const half = faceHalfExtent(face);
  const p = [0, 1, 2].map(k => face.offset[k] + half * (u * right[k] + v * down[k]));
  const n = Math.hypot(...p);
  return EMITTER_TO_CATALOGUE.map(row => (row[0] * p[0] + row[1] * p[1] + row[2] * p[2]) / n);
}
