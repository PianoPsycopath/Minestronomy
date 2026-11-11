import { $, compass } from "./dom.js";
import { clamp } from "../core/math.js";
import { calc, getTargetAltAz, zToLatitude, facingCommand } from "../core/astronomy/index.js";
import { labelFor, describeTarget } from "./targets.js";
import { readObserver } from "./observer.js";

// The small card that opens when the user clicks the sky.
export class PickCard {
  constructor(app) {
    this.app = app;
  }

  handleSkyClick(x, y) {
    const { state, skyScene } = this.app;
    if (!state.lastRender) return;
    const { Z, disc, md } = readObserver();
    const s = calc(state.t, Z);
    const res = skyScene.pick(x, y, state.lastRender, s, { disc, md, xray: $("xray").checked });
    this.show(res, s, x, y);
  }

  show(res, s, x, y) {
    const card = $("pickCard");
    const phi = zToLatitude(+$("z").value);
    const hit = res.hit;
    const pos = hit ? getTargetAltAz(hit, s, phi) : { alt: res.alt, az: res.az };
    const title = hit ? labelFor(hit) : "Empty sky";
    const lines = [
      `${pos.alt >= 0 ? "Above" : "Below"} horizon • Alt ${pos.alt.toFixed(1)}° • Az ${pos.az.toFixed(1)}° ${compass(pos.az)}`,
      ...(hit ? describeTarget(hit, s) : ["No visible object here. Stars aren't individually identified."])
    ];

    card.innerHTML = `
      <div class="pick-head"><strong>${title}</strong><button class="pick-x" type="button" aria-label="Close">×</button></div>
      <div class="pick-body">${lines.map(l => `<div>${l}</div>`).join("")}</div>
      <div class="pick-actions">
        ${hit ? `<button class="wii-pill-btn sm" data-act="lock" type="button">Lock on</button>` : ""}
        <button class="wii-pill-btn sm" data-act="tp" type="button">Copy /tp</button>
      </div>`;

    card.querySelector(".pick-x").onclick = () => this.hide();
    const lock = card.querySelector('[data-act="lock"]');
    if (lock) {
      lock.onclick = () => {
        this.app.tracker.trackObject(hit);
        this.hide();
      };
    }
    const tp = card.querySelector('[data-act="tp"]');
    tp.onclick = () => {
      navigator.clipboard.writeText(facingCommand(pos));
      tp.textContent = "Copied!";
      setTimeout(() => (tp.textContent = "Copy /tp"), 1200);
    };

    card.hidden = false;
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    card.style.left = `${clamp(x + 16, 8, window.innerWidth - w - 8)}px`;
    card.style.top = `${clamp(y + 16, 90, window.innerHeight - h - 100)}px`;
  }

  hide() {
    const card = $("pickCard");
    if (card) card.hidden = true;
  }
}
