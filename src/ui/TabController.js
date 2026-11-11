import { $ } from "./dom.js";

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
    const solar = this.app.state.activeTab === "solar";
    $("c").hidden = solar;
    this.app.solarScene.canvas.hidden = !solar;
    $("solarHud").hidden = !solar;
    document.body.classList.toggle("view-solar", solar);
    if (solar) {
      $("findPanel").hidden = true;
      this.app.solarHud.update();
    }
  }
}
