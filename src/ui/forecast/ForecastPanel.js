import { $ } from "../dom.js";
import { readObserver } from "../observer.js";
import { getCalendarInfo, getMonthSpan } from "../../core/calendar.js";
import { EVENT_KINDS, findEventsInRange, findCometSpans } from "../../forecast/index.js";
import { getForecastRange } from "./forecastRange.js";
import { buildWeekBlock, buildDayOfWeekRow } from "./forecastBoard.js";
import { renderSide } from "./forecastSide.js";
import { renderNextBar } from "./forecastNext.js";

const RESCAN_DELAY_MS = 150;

function groupByDay(events) {
  const byDay = new Map();
  for (const ev of events) {
    const d = Math.floor(ev.t);
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d).push(ev);
  }
  return byDay;
}

// The forecast tab: a week or month board, a side panel, and the "Next" row.
export class ForecastPanel {
  constructor(app) {
    this.app = app;
    this.view = "week";
    // A null anchor means the board follows the current sky day.
    this.anchor = null;
    // "vis" means: show only events that the observer can see.
    this.cats = new Set([...Object.keys(EVENT_KINDS), "vis"]);
    this.cache = null;
    this.ctx = null;
    this.hover = null;
    this.pinned = null;
    this.nextKind = "lun";
    this.nextCount = 5;
    this.nextCache = null;
    this.timer = null;
    this.bind();
  }

  bind() {
    $("viewGroup").querySelectorAll(".wii-seg").forEach(btn => {
      btn.onclick = () => {
        this.markView(btn.dataset.view);
        this.view = btn.dataset.view;
        this.update();
      };
    });

    $("fcPrev").onclick = () => this.shift(-1);
    $("fcNext").onclick = () => this.shift(1);
    $("fcToday").onclick = () => {
      this.anchor = null;
      this.pinned = null;
      this.update();
    };

    $("catGroup").querySelectorAll(".wii-seg").forEach(btn => {
      btn.onclick = () => {
        const k = btn.dataset.cat;
        if (this.cats.has(k)) this.cats.delete(k);
        else this.cats.add(k);
        btn.classList.toggle("active", this.cats.has(k));
        this.update();
      };
    });

    $("nextKindGroup").querySelectorAll(".wii-seg").forEach(btn => {
      btn.onclick = () => {
        $("nextKindGroup").querySelectorAll(".wii-seg").forEach(b => b.classList.toggle("active", b === btn));
        this.nextKind = btn.dataset.next;
        this.nextCount = 5;
        renderNextBar(this);
      };
    });

    $("fcBoard").onmouseleave = () => {
      this.hover = null;
      this.renderSide();
    };
  }

  markView(view) {
    $("viewGroup").querySelectorAll(".wii-seg").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  }

  renderSide() {
    renderSide(this);
  }

  // Waits a short time, so fast input changes cause only one scan.
  schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.update(), RESCAN_DELAY_MS);
  }

  shift(dir) {
    const a = this.anchor ?? Math.floor(this.app.state.t);
    if (this.view === "week") {
      this.anchor = a + 7 * dir;
    } else {
      const m = getMonthSpan(a);
      this.anchor = dir > 0 ? m.end : m.start - 1;
    }
    this.update();
  }

  // Moves the board to a day and pins that day in the side panel.
  goToDay(d) {
    this.anchor = d;
    this.pinned = d;
    this.update();
  }

  showWeekOf(d) {
    this.view = "week";
    this.anchor = d;
    this.markView("week");
    this.update();
  }

  renderRangeLabel({ a, g0, g1 }) {
    if (this.view === "week") {
      const c0 = getCalendarInfo(g0);
      const c1 = getCalendarInfo(g1 - 1);
      $("fcRange").textContent = `${c0.monthShort} ${c0.dayOrd} – ${c1.monthShort} ${c1.dayOrd}, Year ${c1.year}`;
    } else {
      const c = getCalendarInfo(a);
      $("fcRange").textContent = `${c.month}, Year ${c.year}`;
    }
  }

  update() {
    if ($("panel-forecast").hidden) return;

    const { Z, phi, disc, md } = readObserver();
    const t = this.app.state.t;
    const range = getForecastRange(this.view, this.anchor, t);
    const { g0, g1, m0, m1 } = range;

    const key = [g0, g1, Z, disc, md, [...this.cats].sort().join(",")].join("|");
    if (!this.cache || this.cache.key !== key) {
      this.cache = {
        key,
        events: findEventsInRange({ d0: g0, d1: g1, Z, disc, md, cats: this.cats }),
        spans: this.cats.has("com") ? findCometSpans(g0, g1, Z) : []
      };
    }
    const { events, spans } = this.cache;

    this.renderRangeLabel(range);
    this.ctx = { view: this.view, g0, g1, m0, m1, byDay: groupByDay(events), spans, Z, phi, todayDay: Math.floor(t) };

    const board = $("fcBoard");
    board.innerHTML = "";
    board.className = `fc-board ${this.view}`;
    board.appendChild(buildDayOfWeekRow());
    for (let w = g0; w < g1; w += 7) board.appendChild(buildWeekBlock(this, w, this.ctx));

    renderNextBar(this);
    renderSide(this);
  }
}
