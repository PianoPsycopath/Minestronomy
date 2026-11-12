import { $, el, compass, tintRgb } from "./dom.js";
import { cap } from "../core/math.js";
import { PLN, COMETS } from "../config/index.js";

const FORECAST_ICON =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';

export class FindPanel {
  constructor(app) {
    this.app = app;
    this.objects = this.buildObjectList();
    this.buildRows();

    $("findBtn").onclick = () => {
      $("findPanel").hidden = !$("findPanel").hidden;
    };
    $("findClose").onclick = () => {
      $("findPanel").hidden = true;
    };
  }

  buildObjectList() {
    return [
      { label: "Sun", target: { type: "sun" }, color: "#ffd84a" },
      { label: "Moon", target: { type: "moon" }, color: "#e8e4d8" },
      ...Object.keys(PLN).map(n => ({ label: cap(n), target: { type: "planet", planet: n }, color: `rgb(${PLN[n].col})` })),
      ...Object.values(COMETS).map(C => ({
        label: `${C.label} Comet`,
        target: { type: "comet", comet: C.key },
        color: tintRgb(C.tint, 0, 1)
      }))
    ];
  }

  buildRows() {
    const list = $("findList");
    if (!list) return;
    for (const o of this.objects) {
      const item = el("div", "find-item");
      const row = el("button", "find-row");
      row.type = "button";
      row.innerHTML = `<span class="sw-dot" style="background:${o.color}"></span><span class="find-name">${o.label}</span><span class="find-alt">—</span>`;
      row.onclick = () => this.app.tracker.trackObject(o.target);

      // A separate button avoids a button inside a button, which is invalid HTML.
      const fc = el("button", "find-fc");
      fc.type = "button";
      fc.title = "Show in forecast";
      fc.setAttribute("aria-label", `Show ${o.label} in forecast`);
      fc.innerHTML = FORECAST_ICON;
      fc.onclick = () => this.showInForecast(o.target);

      o.row = row;
      o.altEl = row.querySelector(".find-alt");
      item.append(row, fc);
      list.appendChild(item);
    }
  }

  // The tab click uses the existing tab router. This keeps the panel visibility logic in one place.
  showInForecast(target) {
    document.querySelector('.wii-tab[data-tab="forecast"]')?.click();
    this.app.forecast?.focusBody(target);
  }

  // su, mo, and pa are the altitude and azimuth of the Sun, the Moon, and the planets and comets.
  update(s, su, mo, pa) {
    if ($("findPanel").hidden) return;
    for (const o of this.objects) {
      const t = o.target;
      let p;
      let dormant = false;
      if (t.type === "sun") p = su;
      else if (t.type === "moon") p = mo;
      else if (t.type === "planet") p = pa[t.planet];
      else {
        p = pa.comets[t.comet];
        dormant = !s.comets[t.comet].on;
      }
      o.altEl.textContent = dormant ? "dormant" : `${p.alt >= 0 ? "↑" : "↓"} ${Math.abs(p.alt).toFixed(0)}° ${compass(p.az)}`;
      o.row.classList.toggle("down", !dormant && p.alt < 0);
      o.row.classList.toggle("disabled", dormant);
    }
  }
}