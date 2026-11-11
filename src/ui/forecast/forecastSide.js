import { el, tintRgb } from "../dom.js";
import { COMETS, PH } from "../../config/index.js";
import { calc } from "../../core/astronomy/index.js";
import { getCalendarInfo } from "../../core/calendar.js";
import { hhmm12 } from "../../core/time.js";
import { buildEventDetail } from "./forecastEventViews.js";

// The day shown in the side panel: the hovered day, else the pinned day, else today.
function dayToShow(panel, c) {
  if (panel.hover !== null) return panel.hover;
  if (panel.pinned !== null && panel.pinned >= c.g0 && panel.pinned < c.g1) return panel.pinned;
  if (c.todayDay >= c.g0 && c.todayDay < c.g1) return c.todayDay;
  return c.m0;
}

function buildCometLegend(spans, day, tracker) {
  const legend = el("div", "side-comets");
  for (const sp of [...spans].sort((x, y) => x.d0 - y.d0)) {
    const C = COMETS[sp.key];
    const a = getCalendarInfo(sp.d0);
    const b = getCalendarInfo(sp.d1);
    const pd = Math.floor(sp.peakT);
    const p = getCalendarInfo(pd);
    const row = el(
      "button",
      `side-comet${day >= sp.d0 && day <= sp.d1 ? " active" : ""}`,
      `<span class="sc-bar" style="--c:${tintRgb(C.tint, 0.15, 0.6)}"><i></i></span>
       <span class="sc-text"><b>${C.label}</b>
         <small>${a.monthShort} ${a.dayOrd} → ${b.monthShort} ${b.dayOrd}</small>
         <small>Peak ${p.monthShort} ${p.dayOrd}, ${hhmm12(sp.peakT - pd)}${sp.peakVisible ? "" : " (not visible here)"}</small>
       </span>`
    );
    row.type = "button";
    row.onclick = () => tracker.focusCometSpan(sp);
    legend.appendChild(row);
  }
  return legend;
}

export function renderSide(panel) {
  const side = document.getElementById("fcSide");
  const c = panel.ctx;
  if (!side || !c) return;

  const day = dayToShow(panel, c);
  const cal = getCalendarInfo(day);
  const evs = c.byDay.get(day) || [];
  const moonPhase = PH[calc(day + 0.9, c.Z).ph];

  side.innerHTML = "";
  side.appendChild(
    el(
      "div",
      "side-head",
      `<div class="side-dow">${cal.dowShort} • YEAR ${cal.year}${day === c.todayDay ? " • SKY DATE" : ""}</div>
       <div class="side-date">${cal.month} ${cal.dayOrd}</div>
       <div class="side-sub">Day ${day} • Moon: ${moonPhase}</div>`
    )
  );

  const list = el("div", "side-events");
  if (!evs.length) list.appendChild(el("div", "side-empty", "No events this day."));
  for (const ev of evs) list.appendChild(buildEventDetail(panel, ev));
  side.appendChild(list);

  if (c.spans.length) {
    side.appendChild(el("div", "side-sec", "Comets in view"));
    side.appendChild(buildCometLegend(c.spans, day, panel.app.tracker));
  }
}
