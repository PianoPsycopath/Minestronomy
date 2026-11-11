import { el, compass } from "../dom.js";
import { EVENT_KINDS, paintForecastGraphic } from "../../forecast/index.js";
import { getTickInfo, hhmm12, hhmm24 } from "../../core/time.js";

export function visPill(v, long = false) {
  const word = v.state === "vis" ? "Visible" : v.state === "day" ? "Daytime" : "Below horizon";
  const arrow = v.alt >= 0 ? "↑" : "↓";
  return `<span class="fc-alt-pill ${v.state}">${long ? `${word} ` : ""}${arrow} ${Math.abs(v.alt).toFixed(0)}°${long ? ` ${compass(v.az)}` : ""}</span>`;
}

// Compact chip for the month view.
export function buildEventChip(panel, ev) {
  const chip = el("button", `fc-chip st-${ev.vis.state}`, `<i></i><span>${ev.title}</span>`);
  chip.type = "button";
  chip.style.setProperty("--k", EVENT_KINDS[ev.kind].color);
  chip.title = `${ev.title} • ${hhmm12(ev.t - Math.floor(ev.t))} • ${ev.sub}`;
  chip.onclick = e => {
    e.stopPropagation();
    panel.app.tracker.focusOnEvent(ev);
  };
  return chip;
}

// Compact card for the week view. The side panel shows the full detail.
export function buildEventCard(panel, ev) {
  const card = el(
    "div",
    `fc-card st-${ev.vis.state}`,
    `<canvas class="fc-art" width="96" height="96"></canvas>
     <div class="fc-card-body">
       <div class="fc-card-title">${ev.title}</div>
       <div class="fc-card-meta"><span>${hhmm12(ev.t - Math.floor(ev.t))}</span>${visPill(ev.vis)}</div>
     </div>`
  );
  card.style.setProperty("--k", EVENT_KINDS[ev.kind].color);
  paintForecastGraphic(card.querySelector(".fc-art"), ev);
  card.onclick = e => {
    e.stopPropagation();
    panel.app.tracker.focusOnEvent(ev);
  };
  return card;
}

export function buildEventDetail(panel, ev) {
  const tk = getTickInfo(ev.t);
  const tf = ev.t - Math.floor(ev.t);
  const card = el(
    "div",
    `side-ev st-${ev.vis.state}`,
    `<canvas class="fc-art lg" width="96" height="96"></canvas>
     <div class="side-ev-body">
       <div class="fc-card-title">${ev.title}</div>
       <div class="fc-card-sub">${ev.sub}</div>
       <div class="fc-card-meta"><span>${hhmm12(tf)} (${hhmm24(tf)})</span></div>
       <div>${visPill(ev.vis, true)}</div>
       <div class="side-actions">
         <button class="wii-pill-btn sm aqua" data-act="sky" type="button">View in Sky</button>
         <button class="wii-pill-btn sm" data-act="copy" type="button" title="Copy /time set ${tk.totalTicks}">${tk.totalTicks}t</button>
       </div>
     </div>`
  );
  card.style.setProperty("--k", EVENT_KINDS[ev.kind].color);
  paintForecastGraphic(card.querySelector(".fc-art"), ev);

  card.querySelector('[data-act="sky"]').onclick = () => panel.app.tracker.focusOnEvent(ev);
  const copy = card.querySelector('[data-act="copy"]');
  copy.onclick = () => {
    navigator.clipboard.writeText(`/time set ${tk.totalTicks}`);
    copy.textContent = "Copied!";
    setTimeout(() => (copy.textContent = `${tk.totalTicks}t`), 1200);
  };
  return card;
}
