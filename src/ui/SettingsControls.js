import { $ } from "./dom.js";
import { calc, getTargetAltAz, facingCommand } from "../core/astronomy/index.js";
import { readObserver } from "./observer.js";

export class SettingsControls {
  constructor(app) {
    this.app = app;
    $("z").oninput = () => app.forecast.schedule();
    $("disc").oninput = e => {
      $("discVal").textContent = (+e.target.value).toFixed(1) + "°";
      app.forecast.schedule();
    };
    $("mdisc").oninput = e => {
      $("mdiscVal").textContent = (+e.target.value).toFixed(1) + "°";
      app.forecast.schedule();
    };
    $("resetFov").onclick = () => app.tracker.clearLock();
    $("copyFaceBtn").onclick = () => this.copyFacingCommand();
  }

  copyFacingCommand() {
    const { state } = this.app;
    if (!state.trackedTarget) return;
    const { Z, phi } = readObserver();
    const pos = getTargetAltAz(state.trackedTarget, calc(state.t, Z), phi);
    if (!pos) return;
    const btn = $("copyFaceBtn");
    navigator.clipboard.writeText(facingCommand(pos));
    btn.textContent = "Copied!";
    setTimeout(() => {
      btn.textContent = "Copy /tp";
    }, 1200);
  }
}
