import { $ } from "./dom.js";
import { calc } from "../core/astronomy/index.js";
import { AppState } from "./AppState.js";
import { readObserver } from "./observer.js";
import { TabController } from "./TabController.js";
import { TimeControls } from "./TimeControls.js";
import { SettingsControls } from "./SettingsControls.js";
import { ExportPanel } from "./ExportPanel.js";
import { SkyCamera } from "./SkyCamera.js";
import { PickCard } from "./PickCard.js";
import { TargetTracker } from "./TargetTracker.js";
import { FindPanel } from "./FindPanel.js";
import { SolarHud } from "./SolarHud.js";
import { TelemetryPanel } from "./TelemetryPanel.js";
import { ForecastPanel } from "./forecast/ForecastPanel.js";

const PANEL_REFRESH_FRAMES = 4;

// Creates the UI modules and runs the frame loop. Each module gets this object as "app" to reach the others.
export class UIController {
  constructor(skyScene, particleLoader, solarScene) {
    this.skyScene = skyScene;
    this.solarScene = solarScene;
    this.particleLoader = particleLoader;
    this.state = new AppState();
    this.frameN = 0;
    this.lastScannedDay = null;

    this.pickCard = new PickCard(this);
    this.tracker = new TargetTracker(this);
    this.tabs = new TabController(this);
    this.time = new TimeControls(this);
    this.settings = new SettingsControls(this);
    this.camera = new SkyCamera(this);
    this.forecast = new ForecastPanel(this);
    this.find = new FindPanel(this);
    this.exportPanel = new ExportPanel(this);
    this.solarHud = new SolarHud(this);
    this.telemetry = new TelemetryPanel(this);

    this.time.updateReadouts();
    this.exportPanel.renderTextureStatusList();
  }

  renderFrame(s, observer, dt) {
    const { state } = this;
    if (state.activeTab === "solar") {
      this.solarScene.render(s, dt);
      return null;
    }
    state.lastRender = this.skyScene.render(s, observer.phi, {
      disc: observer.disc,
      md: observer.md,
      showEcl: $("ecl").checked,
      showEqu: $("equ").checked,
      xray: $("xray").checked,
      yaw: state.yaw,
      pitch: state.pitch,
      fov: state.fov,
      trackedTarget: state.trackedTarget
    });
    return state.lastRender;
  }

  refreshPanels(s, observer, rendered) {
    this.time.updateReadouts();
    if (!rendered) {
      this.solarHud.update();
      return;
    }
    const { su, mo, pa } = rendered;
    this.telemetry.update(s, observer.phi, su, mo, pa, observer.disc, observer.md);
    this.find.update(s, su, mo, pa);
    this.tracker.updateLiveBanner(s, observer.phi);
  }

  tick(dt) {
    this.time.advance(dt);
    this.camera.update(dt);

    const day = Math.floor(this.state.t);
    if (day !== this.lastScannedDay) {
      this.lastScannedDay = day;
      this.forecast.update();
    }

    const observer = readObserver();
    const s = calc(this.state.t, observer.Z);
    const rendered = this.renderFrame(s, observer, dt);

    if (this.frameN++ % PANEL_REFRESH_FRAMES === 0) this.refreshPanels(s, observer, rendered);
  }
}
