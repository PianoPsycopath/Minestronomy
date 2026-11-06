import * as THREE from "three";
import { D, sin, cos, asin, clamp, lerp, ang } from "../core/math.js";
import { PLN, VIS } from "../config/constants.js";
import { eq, altaz, getTargetAltAz } from "../core/astronomy.js";

function dir(p, r) {
  return new THREE.Vector3(cos(p.alt) * sin(p.az) * r, sin(p.alt) * r, -cos(p.alt) * cos(p.az) * r);
}

export class SkyScene {
  constructor(canvas) {
    this.cv = canvas;
    this.ren = new THREE.WebGLRenderer({ canvas: this.cv, antialias: true });
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(70, 1, 0.1, 1000);
    this.cam.rotation.order = "YXZ";
    this.bg = new THREE.Color();

    this.groundMat = new THREE.MeshBasicMaterial({ color: 0x0d1612, transparent: true, opacity: 1.0 });
    this.ground = new THREE.Mesh(new THREE.CircleGeometry(400, 48), this.groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.3;
    this.scene.add(this.ground);

    this.SUN = this.mkSprite(128, 128, 1);
    this.MOON = this.mkSprite(128, 128, 3);
    this.PS = {};
    for (const n in PLN) {
      this.PS[n] = this.mkSprite(64, 64, 2);
    }

    this.RETICLE = this.mkSprite(128, 128, 4);
    this.initReticle();

    this.stars = [];
    for (let i = 0; i < 700; i++) {
      this.stars.push({ ra: Math.random() * 360, dec: asin(Math.random() * 2 - 1) });
    }
    this.sg = new THREE.BufferGeometry();
    this.sg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(2100), 3));
    this.smat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.6,
      sizeAttenuation: false,
      transparent: true,
      depthWrite: false
    });
    this.scene.add(new THREE.Points(this.sg, this.smat));

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

  mkSprite(w, h, order) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const tex = new THREE.CanvasTexture(c);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
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

  drawMoon(s, disc) {
    const g = this.MOON.g;
    const r = 40;
    const f = 1 - s.eclipse;
    g.setTransform(1, 0, 0, 1, 64, 64);
    g.clearRect(-64, -64, 128, 128);
    g.globalAlpha = lerp(s.dayA, 0.9, s.eclipse);
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
    this.MOON.tex.needsUpdate = true;
    return disc * 1.6;
  }

  drawSun(disc) {
    const g = this.SUN.g;
    const size = Math.max(18.2, disc * 2.4);
    const cr = (64 * disc) / size;
    g.setTransform(1, 0, 0, 1, 64, 64);
    g.clearRect(-64, -64, 128, 128);
    const gr = g.createRadialGradient(0, 0, cr * 0.8, 0, 0, 64);
    gr.addColorStop(0, "rgba(255,230,150,.55)");
    gr.addColorStop(1, "rgba(255,200,100,0)");
    g.fillStyle = gr;
    g.fillRect(-64, -64, 128, 128);
    g.fillStyle = "#fff6d0";
    g.beginPath();
    g.arc(0, 0, cr, 0, 7);
    g.fill();
    this.SUN.tex.needsUpdate = true;
    return size;
  }

  drawPlanet(n, s, sa) {
    const o = this.PS[n];
    const g = o.g;
    const c = PLN[n].col;
    g.setTransform(1, 0, 0, 1, 32, 32);
    g.clearRect(-32, -32, 64, 64);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 16);
    gr.addColorStop(0, `rgba(${c},1)`);
    gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr;
    g.beginPath();
    g.arc(0, 0, 16, 0, 7);
    g.fill();
    const v = VIS[n];
    o.s.material.opacity = s.pl[n].bright * clamp((v[1] - sa) / (v[1] - v[0]), 0, 1);
    o.tex.needsUpdate = true;
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

    this.SUN.s.position.copy(dir(su, 100));
    this.SUN.s.scale.setScalar(ang(this.drawSun(disc), 100));

    for (const n in PLN) {
      this.PS[n].s.position.copy(dir(pa[n], 99));
      this.drawPlanet(n, s, su.alt);
      this.PS[n].s.scale.setScalar(ang(Math.max(((md * PLN[n].size) / 4) * 2, 0.4), 99));
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

    const p = this.sg.attributes.position;
    this.stars.forEach((st, i) => {
      const v = dir(altaz(st, s, phi), 100);
      p.setXYZ(i, v.x, v.y, v.z);
    });
    p.needsUpdate = true;
    this.smat.opacity = s.night * 0.9;

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

    this.ren.render(this.scene, this.cam);
    return { su, mo, pa };
  }
}