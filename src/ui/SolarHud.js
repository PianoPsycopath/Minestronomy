import { $, el } from "./dom.js";
import { SolarInspector } from "../editor/SolarInspector.js";

const LIGHT_MINUTES_PER_AU = 8.317;

function lightTime(au) {
  const minutes = au * LIGHT_MINUTES_PER_AU;
  return minutes < 90 ? `${minutes.toFixed(1)} min` : `${(minutes / 60).toFixed(1)} h`;
}

// The side panel of the solar system view.
export class SolarHud {
  constructor(app) {
    this.app = app;
    this.scene = app.solarScene;
    this.catalog = this.scene.catalog;
    this.rows = [];
    this.selectedKey = this.scene.focusKey;
    this.inspector = new SolarInspector(this.catalog, $("solarInspector"));

    this.buildRows();

    $("solarScaleGroup").querySelectorAll(".wii-seg").forEach(btn => {
      btn.onclick = () => {
        $("solarScaleGroup").querySelectorAll(".wii-seg").forEach(b => b.classList.toggle("active", b === btn));
        this.scene.setScale(btn.dataset.scale);
      };
    });

    const syncVisibility = () =>
      this.scene.setVisibility({
        orbits: $("solarOrbits").checked,
        labels: $("solarLabels").checked,
        rings: $("solarRings").checked,
        comets: $("solarComets").checked
      });
    for (const id of ["solarOrbits", "solarLabels", "solarRings", "solarComets"]) $(id).onchange = syncVisibility;

    $("solarAddPlanet").onclick = () => this.catalog.addPlanet();
    $("solarAddComet").onclick = () => this.catalog.addComet();
    $("solarResetBody").onclick = () => this.catalog.resetBody(this.selectedKey);
    $("solarResetAll").onclick = () => {
      if (window.confirm("Reset all bodies to defaults? Custom bodies are deleted.")) this.catalog.resetAll();
    };

    this.scene.onPick = key => this.focus(key);
    this.catalog.subscribe(event => this.onCatalogChange(event));
    this.select(this.selectedKey);
  }

  buildRows() {
    const list = $("solarFocusList");
    list.replaceChildren();
    this.rows = [];
    for (const body of this.scene.bodies) {
      const row = el("button", "find-row");
      row.type = "button";
      row.innerHTML = `<span class="sw-dot" style="background:${body.color}"></span><span class="find-name">${body.label}</span><span class="find-alt">—</span>`;
      row.onclick = () => this.focus(body.key);
      list.appendChild(row);
      this.rows.push({ key: body.key, row, readout: row.querySelector(".find-alt") });
    }
  }

  onCatalogChange({ type, key }) {
    this.buildRows();
    if (type === "add") this.focus(key);
    else if (!this.catalog.has(this.selectedKey)) this.select("sun");
    else this.syncActions();
    this.update();
  }

  // Selection and camera focus differ. A dormant comet can be edited but cannot take the camera.
  focus(key) {
    this.scene.setFocus(key);
    this.select(key);
  }

  select(key) {
    this.selectedKey = key;
    this.inspector.show(key);
    this.syncActions();
    this.update();
  }

  syncActions() {
    const custom = this.catalog.isCustom(this.selectedKey);
    const button = $("solarResetBody");
    button.textContent = custom ? "Delete body" : "Reset body";
    button.disabled = !custom && !this.catalog.isModified(this.selectedKey);
  }

  update() {
    const scene = this.scene;

    for (const r of this.rows) {
      const info = scene.describe(r.key);
      if (!info) continue;
      r.readout.textContent = info.active ? `${info.sunAu.toFixed(2)} AU` : "dormant";
      r.row.classList.toggle("disabled", !info.active);
      r.row.classList.toggle("focused", r.key === this.selectedKey);
    }

    const info = scene.describe(scene.focusKey);
    if (!info) return;
    $("solarInfo").innerHTML = `
      <strong>${info.label}</strong>
      <div>Sun distance: ${info.sunAu.toFixed(3)} AU</div>
      <div>Earth distance: ${info.earthAu.toFixed(3)} AU</div>
      <div>Light time from Sun: ${lightTime(info.sunAu)}</div>`;
  }
}