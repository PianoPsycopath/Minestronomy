import { $, el, tintRgb } from "../dom.js";
import { readObserver } from "../observer.js";
import { cap } from "../../core/math.js";
import { PLN, COMETS } from "../../config/index.js";
import { getCalendarInfo, getMonthSpan } from "../../core/calendar.js";
import { EVENT_KINDS, PLANETS, allBodies, bodiesKey, keepComets, findEventsInRange, findCometSpans } from "../../forecast/index.js";
import { getForecastRange } from "./forecastRange.js";
import { buildWeekBlock, buildDayOfWeekRow } from "./forecastBoard.js";
import { renderSide } from "./forecastSide.js";
import { renderNextBar } from "./forecastNext.js";
import { readSpan, paintCometMarkers, renderCometList, renderCometDay } from "./cometView.js";
import { BoardMotion } from "./forecastMotion.js";

const RESCAN_DELAY_MS = 150;

// Event kinds that depend on each body group. A group with no active kind looks idle.
const GROUP_KINDS = { planets: ["mm", "pp", "opp"], comets: ["com"] };

// Event kinds that a "Find Object" target opens in the forecast.
const FOCUS_KINDS = { sun: ["sol"], moon: ["lun", "mm"], planet: ["mm", "pp", "opp"], comet: ["com"] };

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
    // The body filter works inside the category filter. "vis" applies on top of both.
    this.bodies = allBodies();
    this.bodyChips = [];
    this.bodyGroups = [];
    this.cache = null;
    this.comets = [];
    this.ctx = null;
    this.hover = null;
    this.pinned = null;
    this.nextKind = "lun";
    this.nextCount = 5;
    this.nextCache = null;
    this.timer = null;
    this.motion = new BoardMotion($("fcBoard"));
    this.pendingMotion = null;
    this.rangeKey = null;
    this.sideDay = null;
    this.bind();
    this.buildBodyBar();
  }

  bind() {
    $("viewGroup").querySelectorAll(".wii-seg").forEach(btn => {
      btn.onclick = () => {
        const view = btn.dataset.view;
        if (view !== this.view) this.queueMotion("morph");        this.markView(view);
        this.view = view;
        this.update();
      };
    });

    $("fcPrev").onclick = () => this.shift(-1);
    $("fcNext").onclick = () => this.shift(1);
    $("fcToday").onclick = () => {
      this.queueMotion("fade");
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
        this.syncBodyBar();
        this.update();
      };
    });

    $("nextKindGroup").querySelectorAll(".wii-seg").forEach(btn => {
      btn.onclick = () => {
        this.setNextKind(btn.dataset.next);
        renderNextBar(this);
      };
    });

    $("fcBoard").onmouseleave = () => {
      this.hover = null;
      this.renderSide();
    };

    const search = $("bodySearch");
    if (search) {
      search.oninput = () => this.filterBodyChips(search.value);
      search.onkeydown = e => {
        if (e.key === "Escape") {
          search.value = "";
          this.filterBodyChips("");
          return;
        }
        if (e.key !== "Enter") return;
        const hits = this.bodyChips.filter(c => !c.chip.hidden);
        if (hits.length !== 1) return;
        const { group, key } = hits[0];
        this.focusBody(group === "planets" ? { type: "planet", planet: key } : { type: "comet", comet: key });
        search.value = "";
        this.filterBodyChips("");
      };
    }

    $("fcReset").onclick = () => this.resetFilters();
  }

  buildBodyBar() {
    const host = $("bodyGroups");
    if (!host) return;
    const groups = [
      { id: "planets", label: "Planets", items: PLANETS.map(n => ({ key: n, label: cap(n), color: `rgb(${PLN[n].col})` })) },
      { id: "comets", label: "Comets", items: Object.values(COMETS).map(C => ({ key: C.key, label: C.label, color: tintRgb(C.tint, 0, 1) })) }
    ];

    for (const g of groups) {
      const box = el("div", "fc-body-group");
      const head = el("div", "fc-body-head");
      const label = el("span", "fc-body-label");
      label.textContent = g.label;
      head.append(
        label,
        this.buildGroupLink("All", () => this.setGroup(g.id, g.items.map(i => i.key))),
        this.buildGroupLink("None", () => this.setGroup(g.id, []))
      );
      box.appendChild(head);

      for (const item of g.items) {
        const chip = el("button", "wii-seg fc-body-chip active");
        chip.type = "button";
        chip.innerHTML = `<span class="sw-dot" style="background:${item.color}"></span>${item.label}`;
        chip.onclick = () => this.toggleBody(g.id, item.key);
        box.appendChild(chip);
        this.bodyChips.push({ group: g.id, key: item.key, text: item.label.toLowerCase(), chip });
      }
      host.appendChild(box);
      this.bodyGroups.push({ id: g.id, box });
    }
    this.syncBodyBar();
  }

  buildGroupLink(text, onClick) {
    const b = el("button", "fc-body-link");
    b.type = "button";
    b.textContent = text;
    b.onclick = onClick;
    return b;
  }

  toggleBody(group, key) {
    const set = this.bodies[group];
    if (set.has(key)) set.delete(key);
    else set.add(key);
    this.syncBodyBar();
    // Several quick toggles cause only one scan.
    this.schedule();
  }

  setGroup(group, keys) {
    this.bodies[group] = new Set(keys);
    this.syncBodyBar();
    this.schedule();
  }

  syncBodyBar() {
    for (const c of this.bodyChips) c.chip.classList.toggle("active", this.bodies[c.group].has(c.key));
    for (const g of this.bodyGroups) g.box.classList.toggle("idle", !GROUP_KINDS[g.id].some(k => this.cats.has(k)));
  }

  // A focus from the search or the Find Object panel narrows every filter. This restores them in one step.
  resetFilters() {
    this.cats = new Set([...Object.keys(EVENT_KINDS), "vis"]);
    this.bodies = allBodies();
    this.syncCatButtons();
    this.syncBodyBar();
    this.update();
  }

  syncCatButtons() {
    $("catGroup").querySelectorAll(".wii-seg").forEach(b => b.classList.toggle("active", this.cats.has(b.dataset.cat)));
  }

  filterBodyChips(query) {
    const q = query.trim().toLowerCase();
    for (const c of this.bodyChips) c.chip.hidden = !!q && !c.text.includes(q);
    for (const g of this.bodyGroups) g.box.hidden = !this.bodyChips.some(c => c.group === g.id && !c.chip.hidden);
    const empty = $("bodySearchEmpty");
    if (empty) empty.hidden = !q || this.bodyChips.some(c => !c.chip.hidden);
  }

  setNextKind(kind) {
    $("nextKindGroup").querySelectorAll(".wii-seg").forEach(b => b.classList.toggle("active", b.dataset.next === kind));
    this.nextKind = kind;
    this.nextCount = 5;
  }

  // Narrows the board to one body. The "Find Object" panel and the search box both use this.
  focusBody(target) {
    const kinds = FOCUS_KINDS[target.type];
    if (!kinds) return;

    this.cats = new Set(this.cats.has("vis") ? [...kinds, "vis"] : kinds);
    this.bodies = allBodies();
    if (target.type === "planet") this.bodies.planets = new Set([target.planet]);
    if (target.type === "comet") this.bodies.comets = new Set([target.comet]);
    this.pinned = null;

    this.syncCatButtons();
    this.syncBodyBar();
    this.setNextKind(kinds[0]);
    this.update();
  }

  markView(view) {
    $("viewGroup").querySelectorAll(".wii-seg").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  }

  renderSide() {
    renderSide(this);
    renderCometDay(this);
  }

  // Waits a short time, so fast input changes cause only one scan.
  schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.update(), RESCAN_DELAY_MS);
  }

  queueMotion(kind, day) {
    this.pendingMotion = { kind, day };
  }

  shift(dir) {
    this.queueMotion(dir > 0 ? "next" : "prev");
    const a = this.anchor ?? Math.floor(this.app.state.t);
    if (this.view === "week") {
      this.anchor = a + 7 * dir;
    } else {
      const m = getMonthSpan(a);
      this.anchor = dir > 0 ? m.end : m.start - 1;
    }
    this.update();
  }

  goToDay(d) {
    this.queueMotion("fade");
    this.anchor = d;
    this.pinned = d;
    this.update();
  }

  showWeekOf(d) {
    this.queueMotion("morph");
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
    // A queued motion must not wait for a later update, so it is cleared first.
    const motion = this.pendingMotion;
    this.pendingMotion = null;
    if ($("panel-forecast").hidden) return;

    const { Z, phi, disc, md } = readObserver();
    const t = this.app.state.t;
    const range = getForecastRange(this.view, this.anchor, t);
    const { g0, g1, m0, m1 } = range;

    // Only a changed range plays a motion. A pin, a filter, or a day tick must not move the board.
    const rangeKey = `${this.view}|${g0}|${g1}`;
    const play = Boolean(motion) && this.rangeKey !== null && rangeKey !== this.rangeKey;
    this.rangeKey = rangeKey;

    const key = [g0, g1, Z, disc, md, [...this.cats].sort().join(","), bodiesKey(this.bodies)].join("|");
    if (!this.cache || this.cache.key !== key) {
      this.cache = {
        key,
        events: findEventsInRange({ d0: g0, d1: g1, Z, disc, md, cats: this.cats, bodies: this.bodies }),
        spans: this.cats.has("com") ? keepComets(findCometSpans(g0, g1, Z), this.bodies) : []
      };
    }
    const { events, spans } = this.cache;
    this.comets = spans.map(readSpan).filter(Boolean);

    this.renderRangeLabel(range);
    this.ctx = { view: this.view, g0, g1, m0, m1, byDay: groupByDay(events), spans: [], Z, phi, todayDay: Math.floor(t) };

    const board = $("fcBoard");
    if (play) this.motion.before(motion.kind);
    board.innerHTML = "";
    board.className = `fc-board ${this.view}`;
    board.appendChild(buildDayOfWeekRow());
    for (let w = g0; w < g1; w += 7) board.appendChild(buildWeekBlock(this, w, this.ctx));

    paintCometMarkers(this, board);
    renderCometList(this);
    renderNextBar(this);
    this.renderSide();
    if (play) this.motion.after();
  }
}