import * as THREE from "three";
import { altaz } from "../../core/astronomy/index.js";
import { makeSprite } from "./spriteCanvas.js";
import { dir } from "./projection.js";

const GUIDE_RADIUS = 95;
const GUIDE_BUFFER_POINTS = 722;

export function createReticle(scene) {
  const reticle = makeSprite(scene, 128, 128, 4);
  const g = reticle.g;
  g.strokeStyle = "#5ce1ff";
  g.lineWidth = 3;
  g.setLineDash([10, 8]);
  g.beginPath();
  g.arc(64, 64, 48, 0, Math.PI * 2);
  g.stroke();
  reticle.tex.needsUpdate = true;
  reticle.s.visible = false;
  return reticle;
}

export function createCardinalLabels(scene) {
  ["N", "E", "S", "W"].forEach((name, i) => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    g.fillStyle = "#ffffff";
    g.font = "bold 38px sans-serif";
    g.textAlign = "center";
    g.fillText(name, 32, 46);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false })
    );
    sprite.position.copy(dir({ alt: 4, az: i * 90 }, 90));
    sprite.scale.set(6, 6, 1);
    scene.add(sprite);
  });
}

export function createGuideLine(scene, color) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(GUIDE_BUFFER_POINTS * 3), 3));
  const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 }));
  scene.add(line);
  return line;
}

export function updateGuideLine(line, points, s, phi) {
  const a = line.geometry.attributes.position;
  points.forEach((p, i) => {
    const v = dir(altaz(p, s, phi), GUIDE_RADIUS);
    a.setXYZ(i, v.x, v.y, v.z);
  });
  line.geometry.setDrawRange(0, points.length);
  a.needsUpdate = true;
}
