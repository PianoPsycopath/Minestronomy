import * as THREE from "three";
import { makeLabel, makeGlowTexture } from "./labelSprites.js";
import { makeLine } from "./lineHelpers.js";
import { planetOrbitPoints, earthOrbitPoints } from "./orbitPoints.js";
import { ORBIT_SAMPLES, COMET_SAMPLES } from "./solarSettings.js";

const COMET_MARKER_SIZE = 0.7;

// These geometries are shared by all bodies, so disposal must not free them.
const SPHERE = new THREE.SphereGeometry(1, 20, 14);
const TAIL = new THREE.ConeGeometry(1, 1, 16, 1, true);
TAIL.translate(0, -0.5, 0);

const fixedDef = (entry) => ({ key: entry.key, label: entry.label, kind: entry.kind === "earth" ? "planet" : entry.kind, color: entry.color, size: entry.size, entry });

const planetDef = (entry) => ({
  key: entry.key,
  label: entry.label,
  kind: "planet",
  color: `rgb(${entry.col})`,
  size: entry.size / 4,
  entry
});

const cometDef = (entry) => ({
  key: entry.key,
  label: `${entry.label} Comet`,
  kind: "comet",
  color: `rgb(${entry.tint.map((c) => Math.round(255 * c)).join(",")})`,
  size: COMET_MARKER_SIZE,
  entry
});

function bodyDefinitions(catalog) {
  const earth = catalog.get("earth");
  // Sorting by semi-major axis puts custom planets in distance order in the list.
  const ranked = [
    ...catalog.planets().map((entry) => ({ entry, au: entry.el[4] })),
    { entry: earth, au: 1 }
  ].sort((a, b) => a.au - b.au);

  const defs = [fixedDef(catalog.get("sun"))];
  for (const { entry } of ranked) {
    defs.push(entry === earth ? fixedDef(entry) : planetDef(entry));
    if (entry === earth) defs.push(fixedDef(catalog.get("moon")));
  }
  for (const entry of catalog.comets()) defs.push(cometDef(entry));
  return defs;
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

function createCometTail(color) {
  return new THREE.Mesh(
    TAIL,
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
export function createBodies(scene, catalog) {
  const bodies = [];
  const byKey = {};
  const orbits = [];
  let glow = null;

  for (const def of bodyDefinitions(catalog)) {
    const color = new THREE.Color(def.color);
    const body = { ...def, active: true, mesh: new THREE.Mesh(SPHERE, new THREE.MeshBasicMaterial({ color })) };
    body.sprite = makeLabel(def.label, def.color);
    scene.add(body.mesh, body.sprite);

    if (def.kind === "sun") {
      glow = createSunGlow();
      scene.add(glow);
    }

    if (def.kind === "planet") {
      body.orbitPts = def.key === "earth" ? earthOrbitPoints() : planetOrbitPoints(def.entry);
      body.orbitLine = makeLine(ORBIT_SAMPLES, color, 0.45, true);
      scene.add(body.orbitLine);
      orbits.push(body);
    }

    if (def.kind === "comet") {
      body.tail = createCometTail(color);
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

export function disposeBodies(scene, bodies, glow) {
  for (const body of bodies) {
    for (const object of [body.mesh, body.sprite, body.orbitLine, body.tail, body.pathLine]) {
      if (!object) continue;
      scene.remove(object);
      object.material.map?.dispose();
      object.material.dispose();
      if (object.isLine) object.geometry.dispose();
    }
  }
  if (glow) {
    scene.remove(glow);
    glow.material.map?.dispose();
    glow.material.dispose();
  }
}