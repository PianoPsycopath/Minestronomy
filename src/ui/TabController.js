import { $ } from "./dom.js";

const OVERLAY_TABS = new Set(["forecast", "settings"]);

export class TabController {
  constructor(app) {
    this.app = app;
    this.tabs = document.querySelectorAll(".wii-tab");
    this.panels = {
      forecast: $("panel-forecast"),
      settings: $("panel-settings")
    };
    this.tabs.forEach(btn => btn.addEventListener("click", () => this.switchTab(btn.dataset.tab)));
  }

  switchTab(tabName) {
    this.app.state.activeTab = tabName;
    this.tabs.forEach(btn => {
      const active = btn.dataset.tab === tabName;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active);
    });
    this.panels.forecast.hidden = tabName !== "forecast";
    this.panels.settings.hidden = tabName !== "settings";
    this.app.pickCard.hide();
    this.applyView();
    if (tabName === "forecast") this.app.forecast.update();
  }

  // Shows the sky canvas or the solar system canvas.
  applyView() {
    const { activeTab } = this.app.state;
    const solar = activeTab === "solar";
    const overlay = OVERLAY_TABS.has(activeTab);
    $("c").hidden = solar;
    this.app.solarScene.canvas.hidden = !solar;
    $("solarHud").hidden = !solar;
    document.body.classList.toggle("view-solar", solar);
    document.body.classList.toggle("view-overlay", overlay);
    if (solar || overlay) $("findPanel").hidden = true;
    if (solar) this.app.solarHud.update();
  }
}
