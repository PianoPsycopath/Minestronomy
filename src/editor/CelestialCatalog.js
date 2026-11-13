import { PLN, COMETS, VIS } from "../config/index.js";
import { cap } from "../core/math.js";

const FALLBACK_VIS = [-9, -3];

// This template places a custom planet between Mars and Jupiter.
const PLANET_TEMPLATE = Object.freeze({
  kind: "planet",
  el: [1895.6, 120, 60, 0.05, 3, 1.5, 80],
  peak: 0.7,
  fmax: 0.01,
  size: 4,
  col: "200,200,220",
  tint: [0.78, 0.78, 0.86],
  texture: "textures/environment/planet",
  material: "particles_add",
  vis: [-8, -2]
});

function seedEntries() {
  const seed = new Map();
  seed.set("sun", { key: "sun", label: "Sun", kind: "sun", color: "#ffd84a", size: 2.4 });
  seed.set("earth", { key: "earth", label: "Earth", kind: "earth", color: "#4aa3ff", size: 1 });
  seed.set("moon", { key: "moon", label: "Moon", kind: "moon", color: "#d8d4c8", size: 0.45 });

  for (const [key, planet] of Object.entries(PLN)) {
    seed.set(key, {
      ...structuredClone(planet),
      key,
      label: cap(key),
      kind: "planet",
      vis: [...(VIS[key] ?? FALLBACK_VIS)]
    });
  }
  for (const [key, comet] of Object.entries(COMETS)) {
    seed.set(key, { ...structuredClone(comet), key, kind: "comet" });
  }
  return seed;
}

const cloneMap = (source) => new Map([...source].map(([key, entry]) => [key, structuredClone(entry)]));

// The catalog owns clones. The Sky View and the Forecast keep reading the static config.
export class CelestialCatalog {
  constructor() {
    this.defaults = seedEntries();
    this.entries = cloneMap(this.defaults);
    this.listeners = new Set();
    this.cache = null;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(type, key) {
    this.cache = null;
    for (const listener of this.listeners) listener({ type, key });
  }

  get(key) {
    return this.entries.get(key);
  }

  has(key) {
    return this.entries.has(key);
  }

  isCustom(key) {
    return !this.defaults.has(key);
  }

  isModified(key) {
    if (this.isCustom(key)) return true;
    return JSON.stringify(this.entries.get(key)) !== JSON.stringify(this.defaults.get(key));
  }

  byKind(kind) {
    this.cache ??= new Map();
    if (!this.cache.has(kind)) {
      this.cache.set(kind, [...this.entries.values()].filter((entry) => entry.kind === kind));
    }
    return this.cache.get(kind);
  }

  planets() {
    return this.byKind("planet");
  }

  comets() {
    return this.byKind("comet");
  }

  // Each edit is [path, value]. One call emits one event, so one rebuild follows.
  setMany(key, edits) {
    const entry = this.entries.get(key);
    if (!entry) return false;
    let changed = false;
    for (const [path, value] of edits) {
      const owner = path.slice(0, -1).reduce((node, step) => node[step], entry);
      const last = path[path.length - 1];
      if (Object.is(owner[last], value)) continue;
      owner[last] = value;
      changed = true;
    }
    if (changed) this.emit("edit", key);
    return changed;
  }

  set(key, path, value) {
    return this.setMany(key, [[path, value]]);
  }

  nextIndex(prefix) {
    let index = 1;
    while (this.entries.has(`${prefix}_${index}`)) index++;
    return index;
  }

  addPlanet() {
    const index = this.nextIndex("custom_planet");
    const key = `custom_planet_${index}`;
    this.entries.set(key, { ...structuredClone(PLANET_TEMPLATE), key, label: `Custom Planet ${index}` });
    this.emit("add", key);
    return key;
  }

  addComet() {
    const index = this.nextIndex("custom_comet");
    const key = `custom_comet_${index}`;
    this.entries.set(key, {
      ...structuredClone(this.defaults.get("comet")),
      key,
      label: `Custom ${index}`,
      short: `C${index}`,
      identifier: `astrum:${key}_particle`
    });
    this.emit("add", key);
    return key;
  }

  remove(key) {
    if (!this.isCustom(key) || !this.entries.delete(key)) return false;
    this.emit("remove", key);
    return true;
  }

  resetBody(key) {
    if (this.isCustom(key)) return this.remove(key);
    this.entries.set(key, structuredClone(this.defaults.get(key)));
    this.emit("reset", key);
    return true;
  }

  resetAll() {
    this.entries = cloneMap(this.defaults);
    this.emit("reset-all", null);
  }
}