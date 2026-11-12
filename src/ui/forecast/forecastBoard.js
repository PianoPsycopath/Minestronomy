import { $, el, tintRgb } from "../dom.js";
import { COMETS } from "../../config/index.js";
import { getCalendarInfo } from "../../core/calendar.js";
import { hhmm12 } from "../../core/time.js";
import { buildEventChip, buildEventCard } from "./forecastEventViews.js";

const MAX_CHIPS = 3;

export function cometSpanText(sp) {
  const C = COMETS[sp.key];
  const a = getCalendarInfo(sp.d0);
  const b = getCalendarInfo(sp.d1);
  const pd = Math.floor(sp.peakT);
  const p = getCalendarInfo(pd);
  return `${C.label} comet ${a.monthShort} ${a.dayOrd} – ${b.monthShort} ${b.dayOrd} • peak ${p.monthShort} ${p.dayOrd} ${hhmm12(sp.peakT - pd)}`;
}

function buildDayCell(panel, d, ctx) {
  const { view, m0, m1, byDay, todayDay } = ctx;
  const cal = getCalendarInfo(d);
  const evs = byDay.get(d) || [];
  const cell = el(
    "div",
    `fc-day${d === todayDay ? " today" : ""}${d < m0 || d >= m1 ? " outside" : ""}${d === panel.pinned ? " pinned" : ""}`
  );

  cell.dataset.day = d;

  cell.appendChild(
    el(
      "div",
      "fc-day-head",
      view === "week"
        ? `<span class="fc-day-dow">${cal.dowShort}</span><span class="fc-day-num">${cal.monthShort} ${cal.dayOrd}</span>`
        : `<span class="fc-day-num">${cal.dayOfMonth}</span>${cal.dayOfMonth === 1 ? `<span class="fc-day-mon">${cal.monthShort}</span>` : ""}`
    )
  );

  const list = el("div", "fc-day-events");
  const shown = view === "month" ? evs.slice(0, MAX_CHIPS) : evs;
  for (const ev of shown) list.appendChild(view === "week" ? buildEventCard(panel, ev) : buildEventChip(panel, ev));
  if (view === "month" && evs.length > MAX_CHIPS) {
    const more = el("button", "fc-more", `+${evs.length - MAX_CHIPS} more`);
    more.type = "button";
    more.onclick = e => {
      e.stopPropagation();
      panel.showWeekOf(d);
    };
    list.appendChild(more);
  }
  cell.appendChild(list);

  cell.onmouseenter = () => {
    panel.hover = d;
    panel.renderSide();
  };
  cell.onclick = () => {
    const { state, time } = panel.app;
    panel.pinned = d;
    time.setT(d + (state.t - Math.floor(state.t)));
    panel.update();
  };
  return cell;
}

// Comet bars are thin and have no text. The side panel has the legend. A diamond marks the best view of each comet.
function buildCometLanes(panel, w, spans) {
  const inWeek = spans.filter(sp => sp.d1 >= w && sp.d0 <= w + 6);
  if (!inWeek.length) return null;

  const lanes = el("div", "fc-lanes");
  const laneCount = Math.max(...inWeek.map(sp => sp.lane)) + 1;
  lanes.style.gridTemplateRows = `repeat(${laneCount}, var(--lane-h))`;

  for (const sp of inWeek) {
    const C = COMETS[sp.key];
    const s0 = Math.max(sp.d0, w);
    const s1 = Math.min(sp.d1, w + 6);
    const bar = el("button", `fc-bar${sp.d0 < w ? " cont-l" : ""}${sp.d1 > w + 6 ? " cont-r" : ""}`);
    bar.type = "button";
    bar.style.gridColumn = `${s0 - w + 1} / ${s1 - w + 2}`;
    bar.style.gridRow = String(sp.lane + 1);
    bar.style.setProperty("--c", tintRgb(C.tint, 0.15, 0.6));
    bar.title = `${cometSpanText(sp)}. Click for best view.`;

    const peakInBar = sp.peakT >= s0 && sp.peakT < s1 + 1;
    if (peakInBar) {
      const mk = el("i", "fc-peak");
      mk.style.left = `${((sp.peakT - s0) / (s1 - s0 + 1)) * 100}%`;
      bar.appendChild(mk);
    }
    bar.onmouseenter = () => {
      panel.hover = Math.floor(peakInBar ? sp.peakT : s0);
      panel.renderSide();
    };
    bar.onclick = e => {
      e.stopPropagation();
      panel.app.tracker.focusCometSpan(sp);
    };
    lanes.appendChild(bar);
  }
  return lanes;
}

export function buildWeekBlock(panel, w, ctx) {
  const week = el("div", "fc-week");
  const days = el("div", "fc-days");
  for (let i = 0; i < 7; i++) days.appendChild(buildDayCell(panel, w + i, ctx));
  week.appendChild(days);

  const lanes = buildCometLanes(panel, w, ctx.spans);
  if (lanes) week.appendChild(lanes);
  return week;
}

export function buildDayOfWeekRow() {
  const dow = el("div", "fc-dow-row");
  ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].forEach(n => dow.appendChild(el("span", "", n)));
  return dow;
}
