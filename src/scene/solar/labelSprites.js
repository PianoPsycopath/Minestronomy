import * as THREE from "three";

export function makeLabel(text, color) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const g = c.getContext("2d");
  g.font = "700 28px 'M PLUS Rounded 1c', sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineWidth = 5;
  g.lineJoin = "round";
  g.strokeStyle = "rgba(4, 10, 22, 0.85)";
  g.strokeText(text, 128, 32);
  g.fillStyle = color;
  g.fillText(text, 128, 32);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, sizeAttenuation: false })
  );
  sprite.center.set(0.5, -0.1);
  sprite.scale.set(0.16, 0.04, 1);
  sprite.renderOrder = 10;
  return sprite;
}

export function makeGlowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255, 236, 170, 0.95)");
  gr.addColorStop(0.25, "rgba(255, 190, 80, 0.45)");
  gr.addColorStop(1, "rgba(255, 150, 40, 0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
