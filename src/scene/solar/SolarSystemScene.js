import * as THREE from "three";
import { cos, sin } from "../../core/math.js";
import { PLN, COMETS } from "../../config/index.js";
import { cometOrbit, cometCalc, cometDt, planetOrbit } from "../../core/astronomy/index.js";
import {

  COMET_SAMPLES,
  RING_SAMPLES,
  RING_AU,
  MOON_AU,
  MOON_DISPLAY_RADIUS,
  MOON_LABEL_MAX_DISTANCE,
  MARKER_SCALE,
  TAIL_LENGTH,
  TAIL_WIDTH_RATIO,
  FOCUS_DISTANCE,
  PICK_RADIUS_PX,
  PREVIEW_OPACITY
} from "./solarSettings.js";
import { makeLabel } from "./labelSprites.js";
import { makeLine } from "./lineHelpers.js";
import { createStarfield } from "./starfield.js";
import { ScaleProjection } from "./scaleProjection.js";
import { createBodies, disposeBodies } from "./solarBodies.js";
import { OrbitCamera } from "./OrbitCamera.js";


const ORIGIN = Object.freeze({ x: 0, y: 0, z: 0 });
const TAIL_AXIS = new THREE.Vector3(0, -1, 0);

// Solves Barker's equation for tan(true anomaly / 2).
function tanHalfAnomaly(w) {
  const c = Math.cbrt(Math.abs(w) / 2 + Math.sqrt((w * w) / 4 + 1));
  return Math.sign(w) * (c - 1 / c);
}

// Equal time steps put too few points near perihelion, where the comet moves fast.
// Equal angle steps keep the curve smooth at every distance.
function cometPathTimes(C, center, span) {
  const offset = C.orbitOffset || 0;
  const anomalyAt = (dt) => 2 * Math.atan(tanHalfAnomaly(C.rate * (dt + offset)));
  const start = anomalyAt(-span);
  const step = (anomalyAt(span) - start) / (COMET_SAMPLES - 1);

  return Array.from({ length: COMET_SAMPLES }, (_, i) => {
    const s = Math.tan((start + step * i) / 2);
    return center + (s * s * s + 3 * s) / C.rate - offset;
  });
}

export class SolarSystemScene {
  constructor(canvas, catalog) {
  this.canvas = canvas;
  this.catalog = catalog;
  this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  this.scene = new THREE.Scene();
  this.scene.background = new THREE.Color(0x050a14);

  this.orbitCamera = new OrbitCamera();
  this.camera = this.orbitCamera.camera;
  this.projection = new ScaleProjection();
  this.show = { orbits: true, labels: true, rings: true, comets: true };
  this.focusKey = "sun";
  this.onPick = null;

  this.pos = {};
  this.brightness = {};
  this.bodies = [];
  this.bodyByKey = {};
  this.orbits = [];
  this.glow = null;
  this.rings = [];
  this.moonDir = new THREE.Vector3();
  this.tmp = new THREE.Vector3();
  this.size = { w: 0, h: 0, dpr: 0 };

  this.scene.add(createStarfield());
  this.buildRings();
  this.rebuild();
  catalog.subscribe(() => this.rebuild());
  this.orbitCamera.bindPointer(canvas, (x, y) => {
    const key = this.pick(x, y);
    if (key && this.onPick) this.onPick(key);
  });
}

// A full rebuild is fast for this number of bodies. It also prevents stale label textures.
rebuild() {
  disposeBodies(this.scene, this.bodies, this.glow);
  const { bodies, byKey, orbits, glow } = createBodies(this.scene, this.catalog);
  Object.assign(this, { bodies, bodyByKey: byKey, orbits, glow, pos: {}, brightness: {} });
  if (!byKey[this.focusKey]) this.focusKey = "sun";
  this.layout();
}


  buildRings() {
    for (const au of RING_AU) {
      const line = makeLine(RING_SAMPLES, 0x2a4a73, 0.55, true);
      const label = makeLabel(`${au} AU`, "#6f93bd");
      this.scene.add(line, label);
      this.rings.push({ au, line, label });
    }
  }

  writeLine(line, pts) {
    const a = line.geometry.attributes.position;
    for (let i = 0; i < pts.length; i++) {
      this.projection.project(pts[i], this.tmp);
      a.setXYZ(i, this.tmp.x, this.tmp.y, this.tmp.z);
    }
    a.needsUpdate = true;
  }

  // Writes all geometry that depends on the distance scale.
  layout() {
    for (const b of this.orbits) this.writeLine(b.orbitLine, b.orbitPts);

    for (const ring of this.rings) {
      const R = this.projection.radial(ring.au);
      const a = ring.line.geometry.attributes.position;
      for (let i = 0; i < RING_SAMPLES; i++) {
        const th = (i / RING_SAMPLES) * Math.PI * 2;
        a.setXYZ(i, R * Math.cos(th), 0, R * Math.sin(th));
      }
      a.needsUpdate = true;
      ring.label.position.set(R, 0, 0);
    }

    for (const b of this.bodies) if (b.kind === "comet") b.pathDirty = true;
  }

  setScale(mode) {
    if (mode !== "compressed" && mode !== "linear") return;
    this.projection.mode = mode;
    this.layout();
  }

  setVisibility(partial) {
    Object.assign(this.show, partial);
  }

  setFocus(key) {
    const b = this.bodyByKey[key];
    if (!b || !b.mesh.visible) return false;
    this.focusKey = key;
    this.orbitCamera.distanceGoal = FOCUS_DISTANCE[b.kind];
    return true;
  }

  describe(key) {
    const b = this.bodyByKey[key];
    const p = this.pos[key];
    const e = this.pos.earth;
    if (!b || !p || !e) return null;
    return {
      label: b.label,
      active: b.active,
      sunAu: Math.hypot(p.x, p.y, p.z),
      earthAu: Math.hypot(p.x - e.x, p.y - e.y, p.z - e.z)
    };
  }

  // The path shows the comet orbit around the current window. It is rebuilt when the window moves or the scale changes.
  refreshCometPath(b, t) {
    const C = b.entry;
    const center = t - cometDt(C, t);
    const stamp = Math.round(center * 100);
    if (!b.pathDirty && b.pathStamp === stamp) return;

    const span = (C.window ?? C.period / 2) - 1;
    const pts = cometPathTimes(C, center, span).map((time) => {
      const o = cometOrbit(C, time);
      return { x: o.hx, y: o.hy, z: o.hz };
    });
    this.writeLine(b.pathLine, pts);
    b.pathDirty = false;
    b.pathStamp = stamp;
  }

  computePositions(s) {
    const earth = { x: -s.er * cos(s.ls), y: -s.er * sin(s.ls), z: 0 };
    const cb = cos(s.bmoon);
    this.moonDir.set(cb * cos(s.lmoon), cb * sin(s.lmoon), sin(s.bmoon));

    this.pos.sun = ORIGIN;
    this.pos.earth = earth;
    for (const planet of this.catalog.planets()) this.pos[planet.key] = planetOrbit(planet, s.t);
    this.pos.moon = {
      x: earth.x + this.moonDir.x * MOON_AU,
      y: earth.y + this.moonDir.y * MOON_AU,
      z: earth.z + this.moonDir.z * MOON_AU
    };
    for (const comet of this.catalog.comets()) {
      const o = cometOrbit(comet, s.t);
      this.pos[comet.key] = { x: o.hx, y: o.hy, z: o.hz };
      this.bodyByKey[comet.key].active = o.on;
      this.brightness[comet.key] = cometCalc(comet, s.t, s.ls, s.er).bright;
    }

    for (const b of this.bodies) {
      if (b.kind !== "moon") this.projection.project(this.pos[b.key], b.mesh.position);
    }
    this.bodyByKey.moon.mesh.position
      .set(this.moonDir.x, this.moonDir.z, -this.moonDir.y)
      .multiplyScalar(MOON_DISPLAY_RADIUS)
      .add(this.bodyByKey.earth.mesh.position);
  }

  updateCamera(dt) {
    if (!this.bodyByKey[this.focusKey].mesh.visible) this.focusKey = "sun";
    this.orbitCamera.update(dt, this.bodyByKey[this.focusKey].mesh.position);
  }

  updateMarkers(s) {
    const eye = this.camera.position;
    const distance = this.orbitCamera.distance;

    for (const b of this.bodies) {
      const shown = b.active && (b.kind !== "comet" || this.show.comets);
      b.mesh.visible = shown;
      b.sprite.visible = shown && this.show.labels && (b.kind !== "moon" || distance < MOON_LABEL_MAX_DISTANCE);
      if (b.orbitLine) b.orbitLine.visible = this.show.orbits;
      if (b.kind === "comet") {
        b.tail.visible = shown;
        b.pathLine.visible = shown && this.show.orbits;
      }
      if (!shown) continue;

      const radius = eye.distanceTo(b.mesh.position) * MARKER_SCALE * b.size;
      b.mesh.scale.setScalar(radius);
      b.sprite.position.copy(b.mesh.position);

      if (b.kind === "sun") {
        this.glow.scale.setScalar(radius * 7);
      } else if (b.kind === "comet") {
        const length = TAIL_LENGTH * (0.25 + 0.75 * (this.brightness[b.key] ?? 0));
        this.tmp.copy(b.mesh.position).normalize();
        b.tail.position.copy(b.mesh.position);
        b.tail.quaternion.setFromUnitVectors(TAIL_AXIS, this.tmp);
        b.tail.scale.set(length * TAIL_WIDTH_RATIO, length, length * TAIL_WIDTH_RATIO);
        if (this.show.orbits) this.refreshCometPath(b, s.t);
      }
    }

    for (const ring of this.rings) {
      ring.line.visible = this.show.rings;
      ring.label.visible = this.show.rings && this.show.labels;
    }
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    if (w === this.size.w && h === this.size.h && dpr === this.size.dpr) return;
    this.size = { w, h, dpr };
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.orbitCamera.resize(w, h);
  }

  render(s, dt = 0.016) {
    this.resize();
    this.computePositions(s);
    this.updateCamera(dt);
    this.updateMarkers(s);
    this.renderer.render(this.scene, this.camera);
  }

  // Returns the key of the nearest visible body within PICK_RADIUS_PX of the pointer, or null.
  pick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    let best = null;
    let bestDist = PICK_RADIUS_PX;
    for (const b of this.bodies) {
      if (!b.mesh.visible) continue;
      this.tmp.copy(b.mesh.position).project(this.camera);
      if (this.tmp.z > 1) continue;
      const px = rect.left + (this.tmp.x * 0.5 + 0.5) * rect.width;
      const py = rect.top + (-this.tmp.y * 0.5 + 0.5) * rect.height;
      const d = Math.hypot(px - clientX, py - clientY);
      if (d < bestDist) {
        best = b.key;
        bestDist = d;
      }
    }
    return best;
  }
  setFocus(key) {
    const b = this.bodyByKey[key];
    if (!b) return false;
    this.focusKey = key;
    this.orbitCamera.distanceGoal = FOCUS_DISTANCE[b.kind];
    return true;
  }
  
  updateCamera(dt) {
    this.orbitCamera.update(dt, this.bodyByKey[this.focusKey].mesh.position);
  }
}