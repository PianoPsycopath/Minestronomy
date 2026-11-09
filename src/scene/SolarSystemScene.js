import * as THREE from "three";
import { cos, sin, cap, clamp, lerp } from "../core/math.js";
import { PLN, COMETS } from "../config/constants.js";
import { planetOrbit, cometOrbit, cometDt, solarTerms } from "../core/astronomy.js";

const FOV = 45;
const ORBIT_SAMPLES = 192;
const COMET_SAMPLES = 160;
const RING_SAMPLES = 128;
const RING_AU = [1, 2, 5, 10];
const STAR_COUNT = 900;
const STAR_RADIUS = 3000;

// Square-root spacing keeps Mercury and Saturn on one screen.
const COMPRESSION_UNIT = 3;

const MOON_AU = 0.00257;
// The true Moon orbit is too small to show apart from the Earth.
const MOON_DISPLAY_RADIUS = 0.35;
const MOON_LABEL_MAX_DISTANCE = 10;

// Markers keep one screen size at every zoom level.
const MARKER_SCALE = 0.006;
const TAIL_LENGTH = 1.6;
const TAIL_WIDTH_RATIO = 0.12;

const MIN_DISTANCE = 0.5;
const MAX_DISTANCE = 600;
const FOCUS_DISTANCE = { sun: 24, planet: 7, moon: 1.4, comet: 5 };
const FOCUS_RATE = 8;
const DRAG_DEGREES_PER_PX = 0.3;
const ZOOM_STEP = 0.1;
const PICK_RADIUS_PX = 20;

const ORIGIN = Object.freeze({ x: 0, y: 0, z: 0 });
const SPHERE = new THREE.SphereGeometry(1, 20, 14);
const TAIL_AXIS = new THREE.Vector3(0, -1, 0);

function makeLabel(text, color) {
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

function makeGlowTexture() {
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

function makeLine(count, color, opacity, closed) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  const line = closed ? new THREE.LineLoop(geometry, material) : new THREE.Line(geometry, material);
  // Vertices change each frame, so the cached bounding sphere is not valid.
  line.frustumCulled = false;
  return line;
}

const planetDef = n => ({
  key: n,
  label: cap(n),
  kind: "planet",
  color: `rgb(${PLN[n].col})`,
  size: PLN[n].size / 4
});

export class SolarSystemScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050a14);
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 5000);

    this.mode = "compressed";
    this.show = { orbits: true, labels: true, rings: true, comets: true };
    this.focusKey = "sun";
    this.yaw = 35;
    this.pitch = 38;
    this.distance = FOCUS_DISTANCE.sun;
    this.distanceGoal = this.distance;
    this.target = new THREE.Vector3();
    this.onPick = null;

    this.pos = {};
    this.bodies = [];
    this.bodyByKey = {};
    this.orbits = [];
    this.rings = [];
    this.moonDir = new THREE.Vector3();
    this.tmp = new THREE.Vector3();
    this.size = { w: 0, h: 0, dpr: 0 };

    this.buildStars();
    this.buildBodies();
    this.buildRings();
    this.layout();
    this.bindPointer();
  }

  buildStars() {
    const positions = new Float32Array(STAR_COUNT * 3);
    let seed = 7919;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < STAR_COUNT; i++) {
      const z = rand() * 2 - 1;
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(1 - z * z);
      positions.set([r * Math.cos(a) * STAR_RADIUS, z * STAR_RADIUS, r * Math.sin(a) * STAR_RADIUS], i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ color: 0x9fb4d6, size: 1.6, sizeAttenuation: false, depthWrite: false })
    );
    stars.frustumCulled = false;
    this.scene.add(stars);
  }

  buildBodies() {
    const defs = [
      { key: "sun", label: "Sun", kind: "sun", color: "#ffd84a", size: 2.4 },
      planetDef("mercury"),
      planetDef("venus"),
      { key: "earth", label: "Earth", kind: "planet", color: "#4aa3ff", size: 1 },
      { key: "moon", label: "Moon", kind: "moon", color: "#d8d4c8", size: 0.45 },
      planetDef("mars"),
      planetDef("jupiter"),
      planetDef("saturn"),
      ...Object.values(COMETS).map(C => ({
        key: C.key,
        label: `${C.label} Comet`,
        kind: "comet",
        color: `rgb(${C.tint.map(c => Math.round(255 * c)).join(",")})`,
        size: 0.7
      }))
    ];

    const tailGeometry = new THREE.ConeGeometry(1, 1, 16, 1, true);
    tailGeometry.translate(0, -0.5, 0);

    for (const def of defs) {
      const color = new THREE.Color(def.color);
      const body = { ...def, active: true, mesh: new THREE.Mesh(SPHERE, new THREE.MeshBasicMaterial({ color })) };
      body.sprite = makeLabel(def.label, def.color);
      this.scene.add(body.mesh, body.sprite);

      if (def.kind === "sun") {
        this.glow = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: makeGlowTexture(),
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          })
        );
        this.scene.add(this.glow);
      }

      if (def.kind === "planet") {
        body.orbitPts = def.key === "earth" ? this.earthOrbitPoints() : this.planetOrbitPoints(def.key);
        body.orbitLine = makeLine(ORBIT_SAMPLES, color, 0.45, true);
        this.scene.add(body.orbitLine);
        this.orbits.push(body);
      }

      if (def.kind === "comet") {
        body.tail = new THREE.Mesh(
          tailGeometry,
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.35,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
          })
        );
        body.pathLine = makeLine(COMET_SAMPLES, color, 0.5, false);
        body.pathDirty = true;
        body.pathStamp = null;
        body.active = false;
        this.scene.add(body.tail, body.pathLine);
      }

      this.bodies.push(body);
      this.bodyByKey[def.key] = body;
    }
  }

  planetOrbitPoints(key) {
    const p = PLN[key];
    return Array.from({ length: ORBIT_SAMPLES }, (_, i) => planetOrbit(p, (i / ORBIT_SAMPLES) * p.el[0]));
  }

  earthOrbitPoints() {
    return Array.from({ length: ORBIT_SAMPLES }, (_, i) => {
      const { ls, er } = solarTerms((i / ORBIT_SAMPLES) * 365.25);
      return { x: -er * cos(ls), y: -er * sin(ls), z: 0 };
    });
  }

  buildRings() {
    for (const au of RING_AU) {
      const line = makeLine(RING_SAMPLES, 0x2a4a73, 0.55, true);
      const label = makeLabel(`${au} AU`, "#6f93bd");
      this.scene.add(line, label);
      this.rings.push({ au, line, label });
    }
  }

  radial(r) {
    return this.mode === "linear" ? r : COMPRESSION_UNIT * Math.sqrt(r);
  }

  // Ecliptic axes (x, y, z) map to world axes (x, -z, y) so that ecliptic north points up.
  project(v, out) {
    const m = Math.hypot(v.x, v.y, v.z);
    if (m < 1e-9) return out.set(0, 0, 0);
    const k = this.radial(m) / m;
    return out.set(v.x * k, v.z * k, -v.y * k);
  }

  writeLine(line, pts) {
    const a = line.geometry.attributes.position;
    for (let i = 0; i < pts.length; i++) {
      this.project(pts[i], this.tmp);
      a.setXYZ(i, this.tmp.x, this.tmp.y, this.tmp.z);
    }
    a.needsUpdate = true;
  }

  layout() {
    for (const b of this.orbits) this.writeLine(b.orbitLine, b.orbitPts);

    for (const ring of this.rings) {
      const R = this.radial(ring.au);
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
    this.mode = mode;
    this.layout();
  }

  setVisibility(partial) {
    Object.assign(this.show, partial);
  }

  setFocus(key) {
    const b = this.bodyByKey[key];
    if (!b || !b.mesh.visible) return false;
    this.focusKey = key;
    this.distanceGoal = FOCUS_DISTANCE[b.kind];
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

  refreshCometPath(b, t) {
    const C = COMETS[b.key];
    const center = t - cometDt(C, t);
    const stamp = Math.round(center * 100);
    if (!b.pathDirty && b.pathStamp === stamp) return;

    const span = (C.window ?? C.period / 2) - 1;
    const pts = Array.from({ length: COMET_SAMPLES }, (_, i) => {
      const o = cometOrbit(C, center - span + (2 * span * i) / (COMET_SAMPLES - 1));
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
    for (const n of Object.keys(PLN)) this.pos[n] = planetOrbit(PLN[n], s.t);
    this.pos.moon = {
      x: earth.x + this.moonDir.x * MOON_AU,
      y: earth.y + this.moonDir.y * MOON_AU,
      z: earth.z + this.moonDir.z * MOON_AU
    };
    for (const key of Object.keys(COMETS)) {
      const o = cometOrbit(COMETS[key], s.t);
      this.pos[key] = { x: o.hx, y: o.hy, z: o.hz };
      this.bodyByKey[key].active = o.on;
    }

    for (const b of this.bodies) {
      if (b.kind !== "moon") this.project(this.pos[b.key], b.mesh.position);
    }
    this.bodyByKey.moon.mesh.position
      .set(this.moonDir.x, this.moonDir.z, -this.moonDir.y)
      .multiplyScalar(MOON_DISPLAY_RADIUS)
      .add(this.bodyByKey.earth.mesh.position);
  }

  updateCamera(dt) {
    const focus = this.bodyByKey[this.focusKey];
    if (!focus.mesh.visible) this.focusKey = "sun";

    const k = 1 - Math.exp(-dt * FOCUS_RATE);
    this.target.lerp(this.bodyByKey[this.focusKey].mesh.position, k);
    this.distance = lerp(this.distance, this.distanceGoal, k);

    const cp = cos(this.pitch);
    this.camera.position.set(
      this.target.x + this.distance * cp * sin(this.yaw),
      this.target.y + this.distance * sin(this.pitch),
      this.target.z + this.distance * cp * cos(this.yaw)
    );
    this.camera.lookAt(this.target);
  }

  updateMarkers(s) {
    const eye = this.camera.position;

    for (const b of this.bodies) {
      const shown = b.active && (b.kind !== "comet" || this.show.comets);
      b.mesh.visible = shown;
      b.sprite.visible = shown && this.show.labels && (b.kind !== "moon" || this.distance < MOON_LABEL_MAX_DISTANCE);
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
        const length = TAIL_LENGTH * (0.25 + 0.75 * s.comets[b.key].bright);
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
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render(s, dt = 0.016) {
    this.resize();
    this.computePositions(s);
    this.updateCamera(dt);
    this.updateMarkers(s);
    this.renderer.render(this.scene, this.camera);
  }

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

  bindPointer() {
    const cv = this.canvas;
    let last = null;
    let start = null;
    let moved = false;

    cv.addEventListener("pointerdown", e => {
      last = start = [e.clientX, e.clientY];
      moved = false;
      cv.setPointerCapture(e.pointerId);
    });

    cv.addEventListener("pointermove", e => {
      if (!last) return;
      if (Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 5) moved = true;
      this.yaw = (this.yaw - (e.clientX - last[0]) * DRAG_DEGREES_PER_PX + 360) % 360;
      this.pitch = clamp(this.pitch + (e.clientY - last[1]) * DRAG_DEGREES_PER_PX, -89, 89);
      last = [e.clientX, e.clientY];
    });

    const release = e => {
      const wasClick = last && !moved && e.type === "pointerup";
      last = null;
      if (!wasClick) return;
      const key = this.pick(e.clientX, e.clientY);
      if (key && this.onPick) this.onPick(key);
    };
    cv.addEventListener("pointerup", release);
    cv.addEventListener("pointercancel", release);

    cv.addEventListener(
      "wheel",
      e => {
        e.preventDefault();
        this.distanceGoal = clamp(this.distanceGoal * (1 + Math.sign(e.deltaY) * ZOOM_STEP), MIN_DISTANCE, MAX_DISTANCE);
      },
      { passive: false }
    );
  }
}