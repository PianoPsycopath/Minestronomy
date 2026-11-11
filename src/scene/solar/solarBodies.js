import * as THREE from "three";
import { cap } from "../../core/math.js";
import { PLN, COMETS } from "../../config/index.js";
import { makeLabel, makeGlowTexture } from "./labelSprites.js";
import { makeLine } from "./lineHelpers.js";
import { planetOrbitPoints, earthOrbitPoints } from "./orbitPoints.js";
import { ORBIT_SAMPLES, COMET_SAMPLES } from "./solarSettings.js";

const SPHERE = new THREE.SphereGeometry(1, 20, 14);

const planetDef = n => ({
  key: n,
  label: cap(n),
  kind: "planet",
  color: `rgb(${PLN[n].col})`,
  size: PLN[n].size / 4
});

function bodyDefinitions() {
  return [
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
}

function createSunGlow() {
  return new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeGlowTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
}

function createCometTail(geometry, color) {
  return new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
}

// Creates the meshes, labels, and orbit lines of all bodies and adds them to the scene.
export function createBodies(scene) {
  const bodies = [];
  const byKey = {};
  const orbits = [];
  let glow = null;

  const tailGeometry = new THREE.ConeGeometry(1, 1, 16, 1, true);
  tailGeometry.translate(0, -0.5, 0);

  for (const def of bodyDefinitions()) {
    const color = new THREE.Color(def.color);
    const body = { ...def, active: true, mesh: new THREE.Mesh(SPHERE, new THREE.MeshBasicMaterial({ color })) };
    body.sprite = makeLabel(def.label, def.color);
    scene.add(body.mesh, body.sprite);

    if (def.kind === "sun") {
      glow = createSunGlow();
      scene.add(glow);
    }

    if (def.kind === "planet") {
      body.orbitPts = def.key === "earth" ? earthOrbitPoints() : planetOrbitPoints(def.key);
      body.orbitLine = makeLine(ORBIT_SAMPLES, color, 0.45, true);
      scene.add(body.orbitLine);
      orbits.push(body);
    }

    if (def.kind === "comet") {
      body.tail = createCometTail(tailGeometry, color);
      body.pathLine = makeLine(COMET_SAMPLES, color, 0.5, false);
      body.pathDirty = true;
      body.pathStamp = null;
      body.active = false;
      scene.add(body.tail, body.pathLine);
    }

    bodies.push(body);
    byKey[def.key] = body;
  }

  return { bodies, byKey, orbits, glow };
}
