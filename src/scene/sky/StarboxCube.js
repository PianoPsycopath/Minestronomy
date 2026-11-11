import * as THREE from "three";
import { STARBOX_FACES } from "../../config/index.js";
import { altaz } from "../../core/astronomy/index.js";
import { dir } from "./projection.js";

const FALLBACK_STAR_COUNT = 180;
const FACE_TEXTURE_SIZE = 512;

// Six textured planes around the observer. They show the star field and turn with the sky.
export class StarboxCube {
  constructor(scene, particleLoader) {
    this.particleLoader = particleLoader;
    this.group = new THREE.Group();
    this.faces = {};
    scene.add(this.group);

    Object.keys(STARBOX_FACES).forEach((faceKey, idx) => this.createFace(faceKey, idx));
  }

  createFace(faceKey, idx) {
    const fCfg = STARBOX_FACES[faceKey];
    const canvas = document.createElement("canvas");
    canvas.width = FACE_TEXTURE_SIZE;
    canvas.height = FACE_TEXTURE_SIZE;

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;

    const w = (fCfg.size?.[0] || 256) * 2;
    const h = (fCfg.size?.[1] || 256) * 2;
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    const [ox, oy, oz] = fCfg.offset || [0, 0, 256];
    mesh.position.set(ox, oy, oz);
    mesh.lookAt(0, 0, 0);
    mesh.renderOrder = 0;
    this.group.add(mesh);

    this.faces[faceKey] = { faceKey, mesh, mat, tex, canvas, ctx: canvas.getContext("2d"), seed: (idx + 1) * 9173 };
    this.refreshFace(faceKey, this.particleLoader?.starboxConfigs?.[faceKey]?.image || null);
  }

  // Draws the loaded image. Without an image, it draws random stars from a fixed seed.
  refreshFace(faceKey, img) {
    const slot = this.faces[faceKey];
    if (!slot) return;
    const { canvas, ctx, tex, seed } = slot;

    if (img) {
      canvas.width = img.width || FACE_TEXTURE_SIZE;
      canvas.height = img.height || FACE_TEXTURE_SIZE;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    } else {
      canvas.width = FACE_TEXTURE_SIZE;
      canvas.height = FACE_TEXTURE_SIZE;
      ctx.clearRect(0, 0, FACE_TEXTURE_SIZE, FACE_TEXTURE_SIZE);
      let s = seed;
      const rand = () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
      };
      for (let i = 0; i < FALLBACK_STAR_COUNT; i++) {
        const x = rand() * FACE_TEXTURE_SIZE;
        const y = rand() * FACE_TEXTURE_SIZE;
        const r = rand() < 0.12 ? 1.8 : 1.05;
        const a = 0.35 + rand() * 0.65;
        ctx.fillStyle = `rgba(255, 255, 255, ${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    tex.needsUpdate = true;
  }

  syncFromLoader() {
    for (const faceKey of Object.keys(this.faces)) {
      this.refreshFace(faceKey, this.particleLoader?.starboxConfigs?.[faceKey]?.image || null);
    }
  }

  // The cube basis is the equatorial frame: X toward RA 0, Y toward RA 90, Z toward the celestial pole.
  updateOrientation(s, phi, opacity) {
    const vX = dir(altaz({ ra: 0, dec: 0 }, s, phi), 1).normalize();
    const vY = dir(altaz({ ra: 90, dec: 0 }, s, phi), 1).normalize();
    const vZ = dir(altaz({ ra: 0, dec: 90 }, s, phi), 1).normalize();

    const rotMatrix = new THREE.Matrix4().makeBasis(vX, vZ, vY.clone().negate());
    this.group.quaternion.setFromRotationMatrix(rotMatrix);

    for (const face of Object.values(this.faces)) face.mat.opacity = opacity;
  }
}
