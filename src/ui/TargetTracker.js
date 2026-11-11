import { $, compass } from "./dom.js";
import { COMETS } from "../config/index.js";
import { calc, getTargetAltAz } from "../core/astronomy/index.js";
import { getCalendarInfo } from "../core/calendar.js";
import { getTickInfo, hhmm12 } from "../core/time.js";
import { labelFor } from "./targets.js";
import { DEFAULT_FOV } from "./AppState.js";
import { readObserver } from "./observer.js";

// Locks the sky reticle on a body and moves the camera to it.
export class TargetTracker {
  constructor(app) {
    this.app = app;
  }

  showBanner(text) {
    $("targetText").textContent = text;
    $("targetBanner").hidden = false;
  }

  clearLock() {
    const { state } = this.app;
    state.fov = DEFAULT_FOV;
    state.trackedTarget = null;
    state.trackedLabel = null;
    $("targetBanner").hidden = true;
  }

  // Locks on any body at the current time.
  trackObject(target) {
    const { state, camera } = this.app;
    const { Z, phi } = readObserver();
    const s = calc(state.t, Z);
    if (target.type === "comet" && !s.comets[target.comet].on) return;
    const pos = getTargetAltAz(target, s, phi);
    if (!pos) return;

    state.trackedTarget = target;
    state.trackedLabel = labelFor(target);
    if (pos.alt < 0) $("xray").checked = true;
    camera.moveTo(pos);
    this.showBanner(`${state.trackedLabel} • Alt ${pos.alt.toFixed(0)}° Az ${pos.az.toFixed(0)}° ${compass(pos.az)}`);
  }

  // Jumps to the time of an event and locks on its target.
  focusOnEvent(evData) {
    const { state, time, tabs, camera } = this.app;
    time.pause();
    time.setT(evData.t);
    tabs.switchTab("sky");

    const { Z, phi } = readObserver();
    const s = calc(evData.t, Z);
    state.trackedTarget = evData.target;
    state.trackedLabel = null;
    const pos = getTargetAltAz(state.trackedTarget, s, phi);
    if (!pos) return;

    if (pos.alt < 0) $("xray").checked = true;
    camera.moveTo(pos);

    const tk = getTickInfo(evData.t);
    const cal = getCalendarInfo(tk.day);
    this.showBanner(`${evData.title} • ${cal.fullText} (${hhmm12(evData.t - Math.floor(evData.t))} / ${tk.totalTicks}t)`);
  }

  focusCometSpan(sp) {
    const C = COMETS[sp.key];
    this.focusOnEvent({
      t: sp.peakT,
      title: sp.key === "comet" ? "Comet Peak View" : `${C.label} Comet Peak View`,
      target: { type: "comet", comet: sp.key }
    });
  }

  // Keeps the altitude and azimuth in the banner current while the time runs.
  updateLiveBanner(s, phi) {
    const { state } = this.app;
    if (!state.trackedTarget || !state.trackedLabel || $("targetBanner").hidden) return;
    const p = getTargetAltAz(state.trackedTarget, s, phi);
    if (p) $("targetText").textContent = `${state.trackedLabel} • Alt ${p.alt.toFixed(0)}° Az ${p.az.toFixed(0)}° ${compass(p.az)}`;
  }
}
