import { cos, clamp, lerp } from "../../core/math.js";
import { PLN, VIS } from "../../config/index.js";
import { BODY_SPRITE_HALF_PX } from "../../config/constants.js";
import { applyMaterialBlending } from "./spriteCanvas.js";

const FALLBACK_BODY_RADIUS_PX = BODY_SPRITE_HALF_PX - 1;

// Each function draws one body on the canvas of its sprite and returns or sets the sprite size.
// The cfg argument is the loaded particle configuration of the body, or undefined.

export function drawMoon(moon, cfg, s, disc) {
  const g = moon.g;
  applyMaterialBlending(moon, cfg?.material || "particles_alpha");

  const half = BODY_SPRITE_HALF_PX;
  const r = FALLBACK_BODY_RADIUS_PX;
  const f = 1 - s.eclipse;
  g.setTransform(1, 0, 0, 1, half, half);
  g.clearRect(-half, -half, half * 2, half * 2);
  g.globalAlpha = lerp(s.dayA, 0.95, s.eclipse);

  if (cfg?.image) {
    const img = cfg.image;
    const cols = cfg.atlasCols || 4;
    const rows = cfg.atlasRows || 2;
    const cellW = img.width / cols;
    const cellH = img.height / rows;
    const phaseIndex = ((s.ph % 8) + 8) % 8;
    const sx = (phaseIndex % cols) * cellW;
    const sy = Math.floor(phaseIndex / cols) * cellH;

    g.save();
    g.imageSmoothingEnabled = false;
    g.drawImage(img, sx, sy, cellW, cellH, -half, -half, half * 2, half * 2);

    if (s.blood > 0.01) {
      g.globalCompositeOperation = "source-atop";
      g.fillStyle = `rgba(195, 38, 14, ${(s.blood * 0.68).toFixed(3)})`;
      g.fillRect(-half, -half, half * 2, half * 2);
    }

    if (s.eclipse > 0.01) {
      g.globalCompositeOperation = "source-atop";
      g.fillStyle = `rgba(8, 12, 22, ${(s.eclipse * 0.85).toFixed(3)})`;
      g.fillRect(-half, -half, half * 2, half * 2);
    }
    g.restore();
  } else {
    g.fillStyle = `rgb(${(27 * f) | 0},${(31 * f) | 0},${(42 * f) | 0})`;
    g.beginPath();
    g.arc(0, 0, r, 0, 7);
    g.fill();

    const k = cos(s.elong);
    const wax = s.elong < 180;
    const sg = wax ? 1 : -1;
    g.fillStyle = `rgb(${(235 * f) | 0},${((235 - s.blood * 150) * f) | 0},${((225 - s.blood * 170) * f) | 0})`;
    g.beginPath();
    g.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, !wax);
    g.ellipse(0, 0, Math.abs(k) * r + 0.01, r, 0, Math.PI / 2, -Math.PI / 2, sg * k > 0);
    g.fill();
  }

  moon.tex.needsUpdate = true;
  return disc;
}

export function drawSun(sun, cfg, disc) {
  const g = sun.g;
  const half = BODY_SPRITE_HALF_PX;
  applyMaterialBlending(sun, cfg?.material || "particles_alpha");

  g.setTransform(1, 0, 0, 1, half, half);
  g.clearRect(-half, -half, half * 2, half * 2);

  if (cfg?.image) {
    const img = cfg.image;
    const uv = cfg.uv;
    g.imageSmoothingEnabled = false;
    if (uv && uv.texture_width && uv.texture_height) {
      const sx = ((uv.uv?.[0] || 0) / uv.texture_width) * img.width;
      const sy = ((uv.uv?.[1] || 0) / uv.texture_height) * img.height;
      const sw = ((uv.uv_size?.[0] || uv.texture_width) / uv.texture_width) * img.width;
      const sh = ((uv.uv_size?.[1] || uv.texture_height) / uv.texture_height) * img.height;
      g.drawImage(img, sx, sy, sw, sh, -half, -half, half * 2, half * 2);
    } else {
      g.drawImage(img, -half, -half, half * 2, half * 2);
    }
  } else {
    const fill = g.createRadialGradient(0, 0, 0, 0, 0, FALLBACK_BODY_RADIUS_PX);
    fill.addColorStop(0, "#fff6d0");
    fill.addColorStop(1, "#ffd678");
    g.fillStyle = fill;
    g.beginPath();
    g.arc(0, 0, FALLBACK_BODY_RADIUS_PX, 0, 7);
    g.fill();
  }

  sun.tex.needsUpdate = true;
  return disc;
}

// The opacity of a planet depends on its brightness and on how dark the sky is (sunAlt).
export function drawPlanet(planet, name, cfg, s, sunAlt) {
  const g = planet.g;
  applyMaterialBlending(planet, cfg?.material || PLN[name].material || "particles_add");

  const c = PLN[name].col;
  g.setTransform(1, 0, 0, 1, 32, 32);
  g.clearRect(-32, -32, 64, 64);

  if (cfg?.image) {
    g.globalCompositeOperation = "source-over";
    g.imageSmoothingEnabled = false;
    g.drawImage(cfg.image, -20, -20, 40, 40);
    g.globalCompositeOperation = "source-in";
    g.fillStyle = `rgb(${c})`;
    g.fillRect(-20, -20, 40, 40);
    g.globalCompositeOperation = "source-over";
  } else {
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 16);
    gr.addColorStop(0, `rgba(${c},1)`);
    gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr;
    g.beginPath();
    g.arc(0, 0, 16, 0, 7);
    g.fill();
  }

  const v = VIS[name];
  planet.s.material.opacity = s.pl[name].bright * clamp((v[1] - sunAlt) / (v[1] - v[0]), 0, 1);
  planet.tex.needsUpdate = true;
}