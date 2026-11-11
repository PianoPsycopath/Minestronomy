import { $, el } from "./dom.js";

const LIGHT_MINUTES_PER_AU = 8.317;

function lightTime(au) {
  const minutes = au * LIGHT_MINUTES_PER_AU;
  return minutes < 90 ? `${minutes.toFixed(1)} min` : `${(minutes / 60).toFixed(1)} h`;
}

// The side panel of the solar system view.
export class SolarHud {
  constructor(app) {
    this.app = app;
    const scene = app.solarScene;
    this.rows = [];
    const list = $("solarFocusList");

    for (const body of scene.bodies) {
      const row = el("button", "find-row");
      row.type = "button";
      row.innerHTML = `<span class="sw-dot" style="background:${body.color}"></span><span class="find-name">${body.label}</span><span class="find-alt">—</span>`;
      row.onclick = () => this.focus(body.key);
      list.appendChild(row);
      this.rows.push({ key: body.key, row, readout: row.querySelector(".find-alt") });
    }

    $("solarScaleGroup").querySelectorAll(".wii-seg").forEach(btn => {
      btn.onclick = () => {
        $("solarScaleGroup").querySelectorAll(".wii-seg").forEach(b => b.classList.toggle("active", b === btn));
        scene.setScale(btn.dataset.scale);
      };
    });

    const syncVisibility = () =>
      scene.setVisibility({
        orbits: $("solarOrbits").checked,
        labels: $("solarLabels").checked,
        rings: $("solarRings").checked,
        comets: $("solarComets").checked
      });
    for (const id of ["solarOrbits", "solarLabels", "solarRings", "solarComets"]) $(id).onchange = syncVisibility;

    scene.onPick = key => this.focus(key);
  }

  focus(key) {
    if (this.app.solarScene.setFocus(key)) this.update();
  }

  update() {
    const scene = this.app.solarScene;
    const focusKey = scene.focusKey;

    for (const r of this.rows) {
      const info = scene.describe(r.key);
      if (!info) continue;
      r.readout.textContent = info.active ? `${info.sunAu.toFixed(2)} AU` : "dormant";
      r.row.classList.toggle("disabled", !info.active);
      r.row.classList.toggle("focused", r.key === focusKey);
    }

    const info = scene.describe(focusKey);
    if (!info) return;
    $("solarInfo").innerHTML = `
      <strong>${info.label}</strong>
      <div>Sun distance: ${info.sunAu.toFixed(3)} AU</div>
      <div>Earth distance: ${info.earthAu.toFixed(3)} AU</div>
      <div>Light time from Sun: ${lightTime(info.sunAu)}</div>`;
  }
}
