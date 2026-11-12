import * as THREE from "three";
import { D, sin, cos, clamp, lerp, ang } from "../core/math.js";
import { PLN, VIS, STARBOX_FACES, COMETS, COMET_BASE, DEFAULT_FOV_DEG, BODY_SPRITE_HALF_PX } from "../config/constants.js";
import { eq, altaz, getTargetAltAz, cometVisibility, cometAngularSize } from "../core/astronomy.js";

function dir(p, r) {
  return new THREE.Vector3(cos(p.alt) * sin(p.az) * r, sin(p.alt) * r, -cos(p.alt) * cos(p.az) * r);
}

export class SkyScene {
  constructor(canvas, particleLoader) {
    this.cv = canvas;
    this.particleLoader = particleLoader;
    this.ren = new THREE.WebGLRenderer({ canvas: this.cv, antialias: true });
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(DEFAULT_FOV_DEG, 1, 0.1, 1000);
    this.cam.rotation.order = "YXZ";
    this.bg = new THREE.Color();

    this.groundMat = new THREE.MeshBasicMaterial({ color: 0x0d1612, transparent: true, opacity: 1.0 });
    this.ground = new THREE.Mesh(new THREE.CircleGeometry(400, 48), this.groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.3;
    this.scene.add(this.ground);

    this.starboxGroup = new THREE.Group();
    this.starboxFaces = {};
    this.scene.add(this.starboxGroup);
    this.initStarboxCube();

    this.SUN = this.mkSprite(128, 128, 1);
    this.MOON = this.mkSprite(128, 128, 3);
    this.PS = {};
    for (const n in PLN) {
      this.PS[n] = this.mkSprite(64, 64, 2);
    }

    // One sprite per comet (tinted per particle file); they share comet.png.
    this.CS = {};
    for (const key in COMETS) {
      const o = this.mkSprite(256, 256, 2);
      o.s.visible = false;
      o.paintedImg = undefined;
      this.CS[key] = o;
    }

    this.RETICLE = this.mkSprite(128, 128, 4);
    this.initReticle();

    this.ECL = this.mkLine(0xe0a040);
    this.EQU = this.mkLine(0x6aa0e0);
    this.eclPts = [];
    this.equPts = [];
    for (let i = 0; i <= 360; i += 2) {
      this.eclPts.push(eq(i, 0));
      this.equPts.push({ ra: i, dec: 0 });
    }

    this.initCardinalLabels();
  }

  initStarboxCube() {
    const faceKeys = Object.keys(STARBOX_FACES);
    faceKeys.forEach((faceKey, idx) => {
      const fCfg = STARBOX_FACES[faceKey];
      const loaderCfg = this.particleLoader?.starboxConfigs?.[faceKey];

      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.magFilter = THREE.LinearFilter;
      tex.minFilter = THREE.LinearMipmapLinearFilter;

      const scaleFactor = 256 / 256;
      const w = (fCfg.size?.[0] || 256) * 2 * scaleFactor;
      const h = (fCfg.size?.[1] || 256) * 2 * scaleFactor;

      const geom = new THREE.PlaneGeometry(w, h);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 1.0,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });

      const mesh = new THREE.Mesh(geom, mat);
      const [ox, oy, oz] = fCfg.offset || [0, 0, 256];
      mesh.position.set(ox * scaleFactor, oy * scaleFactor, oz * scaleFactor);
      mesh.lookAt(0, 0, 0);
      mesh.renderOrder = 0;

      this.starboxGroup.add(mesh);
      this.starboxFaces[faceKey] = {
        faceKey,
        mesh,
        mat,
        tex,
        canvas,
        ctx: canvas.getContext("2d"),
        seed: (idx + 1) * 9173
      };

      this.refreshStarboxFaceTexture(faceKey, loaderCfg?.image || null);
    });
  }

  refreshStarboxFaceTexture(faceKey, img) {
    const slot = this.starboxFaces[faceKey];
    if (!slot) return;
    const { canvas, ctx, tex, seed } = slot;

    if (img) {
      canvas.width = img.width || 512;
      canvas.height = img.height || 512;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    } else {
      canvas.width = 512;
      canvas.height = 512;
      ctx.clearRect(0, 0, 512, 512);
      let s = seed;
      const rand = () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
      };
      for (let i = 0; i < 180; i++) {
        const x = rand() * 512;
        const y = rand() * 512;
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

  syncStarboxTexturesFromLoader() {
    for (const faceKey of Object.keys(this.starboxFaces)) {
      const img = this.particleLoader?.starboxConfigs?.[faceKey]?.image || null;
      this.refreshStarboxFaceTexture(faceKey, img);
    }
  }

  updateStarboxOrientation(s, phi, opacity) {
    const vX = dir(altaz({ ra: 0, dec: 0 }, s, phi), 1).normalize();
    const vY = dir(altaz({ ra: 90, dec: 0 }, s, phi), 1).normalize();
    const vZ = dir(altaz({ ra: 0, dec: 90 }, s, phi), 1).normalize();

    const rotMatrix = new THREE.Matrix4().makeBasis(vX, vZ, vY.clone().negate());
    this.starboxGroup.quaternion.setFromRotationMatrix(rotMatrix);

    for (const face of Object.values(this.starboxFaces)) {
      face.mat.opacity = opacity;
    }
  }

  mkSprite(w, h, order) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const s = new THREE.Sprite(mat);
    s.renderOrder = order;
    this.scene.add(s);
    return { s, c, tex, g: c.getContext("2d") };
  }

  mkLine(col) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(722 * 3), 3));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.6 }));
    this.scene.add(l);
    return l;
  }

  initReticle() {
    const g = this.RETICLE.g;
    g.strokeStyle = "#5ce1ff";
    g.lineWidth = 3;
    g.setLineDash([10, 8]);
    g.beginPath();
    g.arc(64, 64, 48, 0, Math.PI * 2);
    g.stroke();
    this.RETICLE.tex.needsUpdate = true;
    this.RETICLE.s.visible = false;
  }

  initCardinalLabels() {
    ["N", "E", "S", "W"].forEach((n, i) => {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const g = c.getContext("2d");
      g.fillStyle = "#ffffff";
      g.font = "bold 38px sans-serif";
      g.textAlign = "center";
      g.fillText(n, 32, 46);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
      s.position.copy(dir({ alt: 4, az: i * 90 }, 90));
      s.scale.set(6, 6, 1);
      this.scene.add(s);
    });
  }

  applyMaterialBlending(spriteObj, materialType) {
    const desired =
      materialType === "particles_add" || materialType === "starfield:stars"
        ? THREE.AdditiveBlending
        : THREE.NormalBlending;
    if (spriteObj.s.material.blending !== desired) {
      spriteObj.s.material.blending = desired;
      spriteObj.s.material.needsUpdate = true;
    }
  }

  drawMoon(s, disc) {
    const g = this.MOON.g;
    const cfg = this.particleLoader?.configs?.moon;
    this.applyMaterialBlending(this.MOON, cfg?.material || "particles_alpha");

    const half = BODY_SPRITE_HALF_PX;
    const r = half - 1;
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

    this.MOON.tex.needsUpdate = true;
    return disc;
  }

  drawSun(disc) {
    const g = this.SUN.g;
    const cfg = this.particleLoader?.configs?.sun;
    const half = BODY_SPRITE_HALF_PX;
    this.applyMaterialBlending(this.SUN, cfg?.material || "particles_alpha");

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
      const fill = g.createRadialGradient(0, 0, 0, 0, 0, half - 1);
      fill.addColorStop(0, "#fff6d0");
      fill.addColorStop(1, "#ffd678");
      g.fillStyle = fill;
      g.beginPath();
      g.arc(0, 0, half - 1, 0, 7);
      g.fill();
    }

    this.SUN.tex.needsUpdate = true;
    return disc;
  }

  drawPlanet(n, s, sa) {
    const o = this.PS[n];
    const g = o.g;
    const cfg = this.particleLoader?.configs?.[n];
    this.applyMaterialBlending(o, cfg?.material || PLN[n].material || "particles_add");

    const c = PLN[n].col;
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

    const v = VIS[n];
    o.s.material.opacity = s.pl[n].bright * clamp((v[1] - sa) / (v[1] - v[0]), 0, 1);
    o.tex.needsUpdate = true;
  }

  // Repaints only when the texture source changes (default vs loaded PNG).
  drawCometTexture(key) {
    const o = this.CS[key];
    const cfg = this.particleLoader?.configs?.[key];
    const C = COMETS[key];
    const img = cfg?.image || null;
    this.applyMaterialBlending(o, cfg?.material || C.material);

    const [tr, tg, tb] = cfg?.tint || C.tint;
    o.s.material.color.setRGB(tr, tg, tb);

    if (o.paintedImg === img) return;
    o.paintedImg = img;

    const g = o.g;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, 256, 256);

    if (img) {
      g.imageSmoothingEnabled = false;
      g.drawImage(img, 0, 0, 256, 256);
    } else {
      // Fallback: coma at centre, tail streaming "up" (rotated to the sky position angle later).
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
    o.tex.needsUpdate = true;
  }

  // Must run after the camera pose and aspect are final for this frame.
  updateComets(s, phi, cometAltAz, sunAlt) {
    this.cam.updateMatrixWorld(true);
    for (const key in COMETS) {
      this.updateComet(key, s, phi, cometAltAz[key], sunAlt);
    }
  }

  updateComet(key, s, phi, ca, sunAlt) {
    const c = s.comets[key];
    const o = this.CS[key];
    this.drawCometTexture(key);

    const op = c.bright * cometVisibility(c.bright, sunAlt);
    o.s.visible = op > 0.002;
    o.s.material.opacity = op;
    if (!o.s.visible) return;

    const R = 97;
    const P = dir(ca, R);
    o.s.position.copy(P);
    o.s.scale.setScalar(ang(cometAngularSize(c.size), R));

    // Tail direction on the sky: position angle measured north -> east, resolved to a screen angle.
    const d = 0.5;
    const north = dir(altaz({ ra: c.ra, dec: clamp(c.dec + d, -89.5, 89.5) }, s, phi), R).sub(P).normalize();
    const east = dir(altaz({ ra: c.ra + d, dec: c.dec }, s, phi), R).sub(P).normalize();
    const T = north.multiplyScalar(cos(c.pa)).add(east.multiplyScalar(sin(c.pa)));

    const p0 = P.clone().project(this.cam);
    const p1 = P.clone().add(T.multiplyScalar(4)).project(this.cam);
    const dx = (p1.x - p0.x) * this.cam.aspect;
    const dy = p1.y - p0.y;
    o.s.material.rotation = Math.atan2(-dx, dy) + COMET_BASE.webTextureRot * D;
  }

  // Click picking. `pos` is the { su, mo, pa } object returned by render() (alt/az of every body), `s` is
  // calc(t, Z). Returns the nearest visible body within a small screen tolerance plus the alt/az of the click.
  pick(clientX, clientY, pos, s, { disc, md, xray }) {
    const rect = this.cv.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);
    this.cam.updateMatrixWorld(true);
    const ray = new THREE.Vector3(nx, ny, 0.5).unproject(this.cam).normalize();
    const tol = (18 / rect.height) * this.cam.fov; // ~18 px, expressed in degrees

    const cands = [];
    const test = (target, p, radius) => {
      if (!p || (p.alt < 0 && !xray)) return;
      const sep = Math.acos(clamp(ray.dot(dir(p, 1)), -1, 1)) / D;
      if (sep <= Math.max(tol, radius)) cands.push({ target, sep });
    };

    test({ type: "sun" }, pos.su, disc * 0.5);
    test({ type: "moon" }, pos.mo, disc * 0.5);
    for (const n in PLN) {
      if (this.PS[n].s.material.opacity < 0.03) continue;
      const bScale = (PLN[n].billboardSize?.[0] || PLN[n].size) / 4;
      test({ type: "planet", planet: n }, pos.pa[n], Math.max(md * bScale * 2, 0.4) / 2);
    }
    for (const key in COMETS) {
      if (!this.CS[key].s.visible) continue;
      test({ type: "comet", comet: key }, pos.pa.comets[key], cometAngularSize(s.comets[key].size) * 0.3);
    }

    cands.sort((a, b) => a.sep - b.sep);
    return {
      hit: cands[0]?.target || null,
      alt: Math.asin(clamp(ray.y, -1, 1)) / D,
      az: (Math.atan2(ray.x, -ray.z) / D + 360) % 360
    };
  }

  lineUpd(L, pts, s, phi) {
    const a = L.geometry.attributes.position;
    pts.forEach((p, i) => {
      const v = dir(altaz(p, s, phi), 95);
      a.setXYZ(i, v.x, v.y, v.z);
    });
    L.geometry.setDrawRange(0, pts.length);
    a.needsUpdate = true;
  }

  render(s, phi, options) {
    const { disc, md, showEcl, showEqu, xray, yaw, pitch, fov, trackedTarget } = options;

    const su = altaz(s.sun, s, phi);
    const mo = altaz(s.moon, s, phi);
    const pa = {};
    for (const n in PLN) {
      pa[n] = altaz(s.pl[n], s, phi);
    }

    const f = clamp((su.alt + 12) / 18, 0, 1);
    const sm = f * f * (3 - 2 * f);
    this.bg.setRGB(lerp(0.02, 0.38, sm), lerp(0.03, 0.62, sm), lerp(0.07, 0.92, sm));
    this.scene.background = this.bg;

    this.groundMat.opacity = xray ? 0.25 : 1.0;

    this.updateStarboxOrientation(s, phi, s.night);

    this.SUN.s.position.copy(dir(su, 100));
    this.SUN.s.scale.setScalar(ang(this.drawSun(disc), 100));

    for (const n in PLN) {
      this.PS[n].s.position.copy(dir(pa[n], 99));
      this.drawPlanet(n, s, su.alt);
      const bScale = (PLN[n].billboardSize?.[0] || PLN[n].size) / 4;
      this.PS[n].s.scale.setScalar(ang(Math.max(md * bScale * 2, 0.4), 99));
    }

    this.MOON.s.position.copy(dir(mo, 98));
    this.MOON.s.scale.setScalar(ang(this.drawMoon(s, disc), 98));

    if (trackedTarget) {
      const tPos = getTargetAltAz(trackedTarget, s, phi);
      if (tPos) {
        this.RETICLE.s.visible = true;
        this.RETICLE.s.position.copy(dir(tPos, 96));
        this.RETICLE.s.scale.setScalar(ang(Math.max(disc * 2.2, 6), 96));
      }
    } else {
      this.RETICLE.s.visible = false;
    }

    this.ECL.visible = showEcl;
    this.EQU.visible = showEqu;
    if (showEcl) this.lineUpd(this.ECL, this.eclPts, s, phi);
    if (showEqu) this.lineUpd(this.EQU, this.equPts, s, phi);

    this.cam.rotation.set(pitch * D, -yaw * D, 0);
    this.cam.fov = fov;
    this.cam.updateProjectionMatrix();

    const w = window.innerWidth;
    const h = window.innerHeight;
    if (this.cv.width !== w * devicePixelRatio || this.cv.height !== h * devicePixelRatio) {
      this.ren.setPixelRatio(devicePixelRatio);
      this.ren.setSize(w, h, false);
      this.cam.aspect = w / h;
      this.cam.updateProjectionMatrix();
    }

    pa.comets = {};
    for (const key in COMETS) {
      pa.comets[key] = altaz(s.comets[key], s, phi);
    }
    this.updateComets(s, phi, pa.comets, su.alt);

    this.ren.render(this.scene, this.cam);
    return { su, mo, pa };
  }
}