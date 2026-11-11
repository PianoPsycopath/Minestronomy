import * as THREE from "three";
import { D, clamp, lerp, ang } from "../../core/math.js";
import { PLN, COMETS } from "../../config/index.js";
import { eq, altaz, getTargetAltAz } from "../../core/astronomy/index.js";
import { makeSprite } from "./spriteCanvas.js";
import { StarboxCube } from "./StarboxCube.js";
import { drawMoon, drawSun, drawPlanet } from "./bodyPainters.js";
import { updateComets } from "./cometSprites.js";
import { createReticle, createCardinalLabels, createGuideLine, updateGuideLine } from "./guides.js";
import { pickSky } from "./picking.js";
import { dir } from "./projection.js";

const MIN_PLANET_DISC_DEG = 0.4;

const planetBillboardScale = n => (PLN[n].billboardSize?.[0] || PLN[n].size) / 4;

export class SkyScene {
  constructor(canvas, particleLoader) {
    this.cv = canvas;
    this.particleLoader = particleLoader;
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

    this.starbox = new StarboxCube(this.scene, particleLoader);

    this.SUN = makeSprite(this.scene, 128, 128, 1);
    this.MOON = makeSprite(this.scene, 128, 128, 3);
    this.PS = {};
    for (const n in PLN) this.PS[n] = makeSprite(this.scene, 64, 64, 2);

    this.CS = {};
    for (const key in COMETS) {
      const sprite = makeSprite(this.scene, 256, 256, 2);
      sprite.s.visible = false;
      sprite.paintedImg = undefined;
      this.CS[key] = sprite;
    }

    this.RETICLE = createReticle(this.scene);

    this.ECL = createGuideLine(this.scene, 0xe0a040);
    this.EQU = createGuideLine(this.scene, 0x6aa0e0);
    this.eclPts = [];
    this.equPts = [];
    for (let i = 0; i <= 360; i += 2) {
      this.eclPts.push(eq(i, 0));
      this.equPts.push({ ra: i, dec: 0 });
    }

    createCardinalLabels(this.scene);
  }

  get starboxFaces() {
    return this.starbox.faces;
  }

  syncStarboxTexturesFromLoader() {
    this.starbox.syncFromLoader();
  }

  pick(clientX, clientY, pos, s, options) {
    return pickSky(
      { canvas: this.cv, camera: this.cam, planetSprites: this.PS, cometSprites: this.CS },
      clientX,
      clientY,
      pos,
      s,
      options
    );
  }

  updateBackground(sunAlt) {
    const f = clamp((sunAlt + 12) / 18, 0, 1);
    const sm = f * f * (3 - 2 * f);
    this.bg.setRGB(lerp(0.02, 0.38, sm), lerp(0.03, 0.62, sm), lerp(0.07, 0.92, sm));
    this.scene.background = this.bg;
  }

  updateReticle(trackedTarget, s, phi, disc) {
    if (!trackedTarget) {
      this.RETICLE.s.visible = false;
      return;
    }
    const tPos = getTargetAltAz(trackedTarget, s, phi);
    if (!tPos) return;
    this.RETICLE.s.visible = true;
    this.RETICLE.s.position.copy(dir(tPos, 96));
    this.RETICLE.s.scale.setScalar(ang(Math.max(disc * 2.2, 6), 96));
  }

  updateCamera(yaw, pitch, fov) {
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
  }

  render(s, phi, options) {
    const { disc, md, showEcl, showEqu, xray, yaw, pitch, fov, trackedTarget } = options;
    const cfgs = this.particleLoader?.configs;

    const su = altaz(s.sun, s, phi);
    const mo = altaz(s.moon, s, phi);
    const pa = {};
    for (const n in PLN) pa[n] = altaz(s.pl[n], s, phi);

    this.updateBackground(su.alt);
    this.groundMat.opacity = xray ? 0.25 : 1.0;
    this.starbox.updateOrientation(s, phi, s.night);

    this.SUN.s.position.copy(dir(su, 100));
    this.SUN.s.scale.setScalar(ang(drawSun(this.SUN, cfgs?.sun, disc), 100));

    for (const n in PLN) {
      this.PS[n].s.position.copy(dir(pa[n], 99));
      drawPlanet(this.PS[n], n, cfgs?.[n], s, su.alt);
      this.PS[n].s.scale.setScalar(ang(Math.max(md * planetBillboardScale(n) * 2, MIN_PLANET_DISC_DEG), 99));
    }

    this.MOON.s.position.copy(dir(mo, 98));
    this.MOON.s.scale.setScalar(ang(drawMoon(this.MOON, cfgs?.moon, s, disc), 98));

    this.updateReticle(trackedTarget, s, phi, disc);

    this.ECL.visible = showEcl;
    this.EQU.visible = showEqu;
    if (showEcl) updateGuideLine(this.ECL, this.eclPts, s, phi);
    if (showEqu) updateGuideLine(this.EQU, this.equPts, s, phi);

    this.updateCamera(yaw, pitch, fov);

    pa.comets = {};
    for (const key in COMETS) pa.comets[key] = altaz(s.comets[key], s, phi);
    updateComets(this.CS, this.cam, this.particleLoader, s, phi, pa.comets, su.alt);

    this.ren.render(this.scene, this.cam);
    return { su, mo, pa };
  }
}
