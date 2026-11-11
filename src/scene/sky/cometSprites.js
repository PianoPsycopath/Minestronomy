import { D, cos, sin, clamp, ang } from "../../core/math.js";
import { COMETS, COMET_BASE } from "../../config/index.js";
import { altaz, cometVisibility, cometAngularSize } from "../../core/astronomy/index.js";
import { applyMaterialBlending } from "./spriteCanvas.js";
import { dir } from "./projection.js";

const COMET_RADIUS = 97;

// All comets share one texture file. This function repaints the canvas only when the texture source changes.
function paintCometTexture(sprite, key, cfg) {
  const C = COMETS[key];
  const img = cfg?.image || null;
  applyMaterialBlending(sprite, cfg?.material || C.material);

  const [tr, tg, tb] = cfg?.tint || C.tint;
  sprite.s.material.color.setRGB(tr, tg, tb);

  if (sprite.paintedImg === img) return;
  sprite.paintedImg = img;

  const g = sprite.g;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, 256, 256);

  if (img) {
    g.imageSmoothingEnabled = false;
    g.drawImage(img, 0, 0, 256, 256);
  } else {
    // Default image: coma at the center and tail upward. The sprite rotation turns the tail later.
    const tail = g.createLinearGradient(128, 128, 128, 0);
    tail.addColorStop(0, "rgba(190, 225, 255, 0.85)");
    tail.addColorStop(1, "rgba(190, 225, 255, 0)");
    g.fillStyle = tail;
    g.beginPath();
    g.moveTo(112, 128);
    g.lineTo(144, 128);
    g.lineTo(158, 0);
    g.lineTo(98, 0);
    g.closePath();
    g.fill();

    const coma = g.createRadialGradient(128, 128, 0, 128, 128, 34);
    coma.addColorStop(0, "rgba(255,255,255,1)");
    coma.addColorStop(0.35, "rgba(215,238,255,0.8)");
    coma.addColorStop(1, "rgba(180,215,255,0)");
    g.fillStyle = coma;
    g.beginPath();
    g.arc(128, 128, 34, 0, Math.PI * 2);
    g.fill();
  }
  sprite.tex.needsUpdate = true;
}

// Run this after the camera pose and aspect ratio are final for the frame.
export function updateComets(sprites, camera, particleLoader, s, phi, cometAltAz, sunAlt) {
  camera.updateMatrixWorld(true);
  for (const key in COMETS) {
    updateComet(sprites[key], camera, particleLoader?.configs?.[key], key, s, phi, cometAltAz[key], sunAlt);
  }
}

function updateComet(sprite, camera, cfg, key, s, phi, ca, sunAlt) {
  const c = s.comets[key];
  paintCometTexture(sprite, key, cfg);

  const op = c.bright * cometVisibility(c.bright, sunAlt);
  sprite.s.visible = op > 0.002;
  sprite.s.material.opacity = op;
  if (!sprite.s.visible) return;

  const R = COMET_RADIUS;
  const P = dir(ca, R);
  sprite.s.position.copy(P);
  sprite.s.scale.setScalar(ang(cometAngularSize(c.size), R));

  // The tail position angle goes north to east. These steps convert it to a screen angle.
  const d = 0.5;
  const north = dir(altaz({ ra: c.ra, dec: clamp(c.dec + d, -89.5, 89.5) }, s, phi), R).sub(P).normalize();
  const east = dir(altaz({ ra: c.ra + d, dec: c.dec }, s, phi), R).sub(P).normalize();
  const T = north.multiplyScalar(cos(c.pa)).add(east.multiplyScalar(sin(c.pa)));

  const p0 = P.clone().project(camera);
  const p1 = P.clone().add(T.multiplyScalar(4)).project(camera);
  const dx = (p1.x - p0.x) * camera.aspect;
  const dy = p1.y - p0.y;
  sprite.s.material.rotation = Math.atan2(-dx, dy) + COMET_BASE.webTextureRot * D;
}
