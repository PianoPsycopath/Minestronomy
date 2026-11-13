import { el } from "../ui/dom.js";
import { rgbStringToHex, hexToRgbString, tintToHex, hexToTint } from "./colorConvert.js";

const text = (label, path) => ({ type: "text", label, path });
const num = (label, path, min, max, nullable = false) => ({ type: "number", label, path, min, max, nullable });
const color = (read, write) => ({ type: "color", label: "Color", read, write });

// One color input sets both values. The scene reads col and the export reads tint.
const planetColor = color(
  (e) => rgbStringToHex(e.col),
  (hex) => [[["col"], hexToRgbString(hex)], [["tint"], hexToTint(hex)]]
);
const cometColor = color((e) => tintToHex(e.tint), (hex) => [[["tint"], hexToTint(hex)]]);
const fixedColor = color((e) => e.color, (hex) => [[["color"], hex]]);

const FIXED = [{ fields: [text("Name", ["label"]), fixedColor, num("Marker size", ["size"], 0.1, 10)] }];

const SCHEMAS = {
  sun: FIXED,
  earth: FIXED,
  moon: FIXED,
  planet: [
    { fields: [text("Name", ["label"]), planetColor, num("Particle size", ["size"], 0.5, 20)] },
    {
      title: "ORBIT",
      fields: [
        num("Period (d)", ["el", 0], 1, 1e6),
        num("Mean long. (°)", ["el", 1], -720, 720),
        num("Perihelion long. (°)", ["el", 2], -720, 720),
        num("Eccentricity", ["el", 3], 0, 0.95),
        num("Semi-major (AU)", ["el", 4], 0.05, 100),
        num("Inclination (°)", ["el", 5], 0, 90),
        num("Asc. node (°)", ["el", 6], -720, 720)
      ]
    },
    { title: "BRIGHTNESS", fields: [num("Peak", ["peak"], 0, 1), num("Flux at max", ["fmax"], 1e-6, 100)] }
  ],
  comet: [
    { fields: [text("Name", ["label"]), cometColor] },
    {
      title: "ORBIT",
      fields: [
        num("Perihelion day", ["perihelionDay"], -1e7, 1e7),
        num("Period (d)", ["period"], 1, 1e7),
        num("Window (d)", ["window"], 1, 1e7, true),
        num("Perihelion q (AU)", ["q"], 0.01, 50),
        num("Rate", ["rate"], 0.001, 50),
        num("Phase offset (°)", ["uOffset"], -720, 720),
        num("Orbit offset (d)", ["orbitOffset"], -1e5, 1e5)
      ]
    },
    { title: "APPEARANCE", fields: [num("Size scale", ["sizeScale"], 0.05, 10), num("Flux scale", ["fluxScale"], 0.01, 1000)] }
  ]
};

const readPath = (entry, path) => path.reduce((node, step) => node?.[step], entry);

export class SolarInspector {
  constructor(catalog, root) {
    this.catalog = catalog;
    this.root = root;
    this.key = null;
    // The inspector does not redraw on its own edits. A redraw would remove keyboard focus.
    catalog.subscribe(({ type }) => {
      if (type !== "edit") this.render();
    });
  }

  show(key) {
    this.key = key;
    this.render();
  }

  render() {
    this.root.replaceChildren();
    const entry = this.catalog.get(this.key);
    const schema = entry && SCHEMAS[entry.kind];
    if (!schema) return;

    for (const section of schema) {
      if (section.title) {
        const title = el("div", "solar-group-label");
        title.textContent = section.title;
        this.root.appendChild(title);
      }
      for (const spec of section.fields) this.root.appendChild(this.renderField(entry, spec));
    }
  }

  renderField(entry, spec) {
    const row = el("label", "solar-field");
    const name = el("span", "solar-field-name");
    name.textContent = spec.label;
    const input = el("input", "solar-field-input");
    row.append(name, input);

    if (spec.type === "color") {
      input.type = "color";
      input.value = spec.read(entry);
      input.onchange = () => this.catalog.setMany(entry.key, spec.write(input.value));
    } else if (spec.type === "text") {
      input.type = "text";
      input.value = readPath(entry, spec.path);
      input.onchange = () => {
        const value = input.value.trim();
        if (!value) input.value = readPath(entry, spec.path);
        else this.catalog.set(entry.key, spec.path, value);
      };
    } else {
      input.type = "number";
      input.step = "any";
      input.placeholder = spec.nullable ? "always on" : "";
      input.value = readPath(entry, spec.path) ?? "";
      input.onchange = () => this.commitNumber(entry, spec, input);
    }
    return row;
  }

  commitNumber(entry, spec, input) {
    const raw = input.value.trim();
    const current = readPath(entry, spec.path);
    if (raw === "" && spec.nullable) {
      this.catalog.set(entry.key, spec.path, null);
      return;
    }
    const parsed = Number(raw);
    if (raw === "" || !Number.isFinite(parsed)) {
      input.value = current ?? "";
      return;
    }
    const value = Math.min(spec.max, Math.max(spec.min, parsed));
    input.value = value;
    this.catalog.set(entry.key, spec.path, value);
  }
}