import { $, el, tintRgb } from "../dom.js";
import { COMETS } from "../../config/index.js";
import { getCalendarInfo } from "../../core/calendar.js";
import { cometKeyOf } from "../../forecast/bodyFilter.js";

const META = new Map(Object.values(COMETS).map(c => [c.key, c]));

// One table names the span fields, so a change in the span format needs one edit.
const FIELDS = {
  start: ["start", "d0", "from", "t0", "a"],
  end: ["end", "d1", "to", "t1", "b"],
  peak: ["peak", "tPeak", "tp", "best"]
};

const PHASE_WORD = { start: "window opens", peak: "peak", end: "window closes" };

const EYE_ICON =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';

const pick = (span, names) => {
  for (const n of names) if (Number.isFinite(span[n])) return span[n];
  return null;
};

let warned = false;

export function readSpan(span) {
  const key = cometKeyOf(span);
  const start = pick(span, FIELDS.start);
  const end = pick(span, FIELDS.end);
  if (key == null || start == null || end == null) {
    if (!warned) {
      warned = true;
      console.warn("Comet span fields not found. Fields in the span:", Object.keys(span));
    }
    return null;
  }
  const meta = META.get(key);
  return {
    key,
    start,
    end,
    peak: pick(span, FIELDS.peak),
    label: meta?.label ?? key,
    color: meta ? tintRgb(meta.tint, 0, 1) : "#3a8dde"
  };
}

function dayText(d, withYear) {
  const c = getCalendarInfo(d);
  return withYear ? `${c.monthShort} ${c.dayOrd}, Y${c.year}` : `${c.monthShort} ${c.dayOrd}`;
}

// The single call point for the sky jump. Use cometBestView here if the camera must change too.
function showInSky(panel, c) {
  panel.app.tabs.switchTab("sky");
  panel.app.tracker.trackObject({ type: "comet", comet: c.key });
}

function buildRow(panel, c, lines, onMain) {
  const item = el("div", "fc-cm-item");
  item.style.setProperty("--c", c.color);

  const main = el("button", "fc-cm-main");
  main.type = "button";
  main.innerHTML = `<span class="fc-cm-dot"></span><span class="fc-cm-text"><b>${c.label}</b>${lines.map(t => `<small>${t}</small>`).join("")}</span>`;
  main.onclick = onMain;

  const track = el("button", "find-fc fc-cm-track");
  track.type = "button";
  track.title = "Show in sky";
  track.setAttribute("aria-label", `Show ${c.label} comet in the sky`);
  track.innerHTML = EYE_ICON;
  track.onclick = () => showInSky(panel, c);

  item.append(main, track);
  return item;
}

function markersOn(comets, day) {
  const out = [];
  for (const c of comets) {
    if (Math.floor(c.start) === day) out.push({ c, phase: "start" });
    if (c.peak != null && Math.floor(c.peak) === day) out.push({ c, phase: "peak" });
    if (Math.floor(c.end) === day) out.push({ c, phase: "end" });
  }
  return out;
}

// The board builder does not mark comet days, so this pass adds the markers after the board exists.
// Each week block holds seven day cells in date order.
export function paintCometMarkers(panel, board) {
  const { g0 } = panel.ctx;
  board.querySelectorAll(".fc-week").forEach((week, w) => {
    const cells = week.querySelectorAll(".fc-day");
    if (cells.length !== 7) return;
    cells.forEach((cell, i) => {
      const day = g0 + w * 7 + i;
      const marks = markersOn(panel.comets, day);
      if (!marks.length) return;

      const row = el("div", "fc-cm-row");
      for (const { c, phase } of marks) {
        const b = el("button", `fc-cm-mark ${phase}`);
        b.type = "button";
        b.style.setProperty("--c", c.color);
        b.title = `${c.label} comet ${PHASE_WORD[phase]}, ${dayText(day)}`;
        b.innerHTML = `<i></i><span>${c.label}</span>`;
        // A marker click pins the day. It must not also set the sky date.
        b.onclick = e => {
          e.stopPropagation();
          panel.goToDay(day);
        };
        row.appendChild(b);
      }
      const head = cell.querySelector(".fc-day-head");
      if (head) head.after(row);
      else cell.prepend(row);
    });
  });
}

export function renderCometList(panel) {
  const host = $("cometList");
  if (!host) return;
  const month = panel.view === "month";
  const { g0, g1, m0, m1 } = panel.ctx;
  const [a, b] = month && Number.isFinite(m0) && Number.isFinite(m1) ? [m0, m1] : [g0, g1];

  const title = $("cometListTitle");
  if (title) title.textContent = month ? "Active this month" : "Active this week";

  host.innerHTML = "";
  host.className = "fc-cm-list";

  const list = panel.comets.filter(c => c.end >= a && c.start < b).sort((x, y) => x.start - y.start);
  if (!list.length) {
    const p = el("p", "fc-cm-empty");
    p.textContent = panel.cats.has("com") ? "No active comets in this range." : "Comets are off in the Events list.";
    host.appendChild(p);
    return;
  }

  for (const c of list) {
    const years = getCalendarInfo(c.start).year !== getCalendarInfo(c.end).year;
    const lines = [`${dayText(c.start, years)} → ${dayText(c.end, years)}`];
    if (c.peak != null) lines.push(`Peak ${dayText(c.peak, years)}`);
    host.appendChild(buildRow(panel, c, lines, () => panel.goToDay(Math.floor(c.peak ?? c.start))));
  }
}

function statusOn(c, d) {
  const peak = c.peak == null ? null : Math.floor(c.peak);
  if (peak === d) return "Peaks today";
  if (Math.floor(c.start) === d) return "Window opens today";
  if (Math.floor(c.end) === d) return "Window closes today";
  if (peak == null) return "Active";
  return peak > d ? `Active, peak in ${peak - d} d` : `Active, peaked ${d - peak} d ago`;
}

export function renderCometDay(panel) {
  const side = $("fcSide");
  if (!side || !panel.ctx) return;

  const old = side.querySelector(".side-comets");
  if (old) {
    const head = old.previousElementSibling;
    if (head?.classList.contains("side-sec")) head.remove();
    old.remove();
  }
  side.querySelector(".fc-cm-day")?.remove();

  const d = Number.isFinite(panel.hover) ? panel.hover : Number.isFinite(panel.pinned) ? panel.pinned : panel.ctx.todayDay;
  const here = panel.comets.filter(c => d >= Math.floor(c.start) && d <= Math.floor(c.end));
  if (!here.length) return;

  const box = el("div", "fc-cm-day");
  const head = el("div", "side-sec");
  head.textContent = "Comets";
  box.appendChild(head);
  for (const c of here) box.appendChild(buildRow(panel, c, [statusOn(c, d)], () => panel.goToDay(Math.floor(c.peak ?? c.start))));
  side.appendChild(box);
}