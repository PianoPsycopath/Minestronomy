import { $ } from "./dom.js";
import { MONTHS } from "../config/index.js";
import { getCalendarInfo, getDayFromDate } from "../core/calendar.js";
import { getTickInfo, totalTicksToTime, hhmm12, hhmm24 } from "../core/time.js";

const DOCK_MODES = {
  date: { caption: "CALENDAR DATE", chip: "Date", group: "dateInputGroup" },
  day: { caption: "WORLD DAY", chip: "Day No.", group: "dayInputGroup" },
  ticks: { caption: "TOTAL TICKS", chip: "Ticks", group: "tickInputGroup" }
};
const DOCK_MODE_ORDER = ["date", "day", "ticks"];

export class TimeControls {
  constructor(app) {
    this.app = app;
    this.populateMonths();
    this.bind();
    this.setDockMode(app.state.dockMode);
  }

  setT(v) {
    this.app.state.t = v;
    this.updateReadouts();
  }

  advance(dt) {
    if (this.app.state.playing) this.setT(this.app.state.t + dt * +$("spd").value);
  }

  pause() {
    this.app.state.playing = false;
    this.setPlayIcon(false);
  }

  setPlayIcon(isPlaying) {
    $("playIco").innerHTML = isPlaying
      ? `<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>`
      : `<polygon points="7,4 20,12 7,20"/>`;
  }

  populateMonths() {
    $("dateMonth").replaceChildren(...MONTHS.map((m, i) => new Option(m.name, i)));
  }

  setDockMode(mode) {
    const state = this.app.state;
    state.dockMode = mode;
    state.tickMode = mode === "ticks";

    for (const [key, cfg] of Object.entries(DOCK_MODES)) $(cfg.group).hidden = key !== mode;

    const nextMode = DOCK_MODE_ORDER[(DOCK_MODE_ORDER.indexOf(mode) + 1) % DOCK_MODE_ORDER.length];
    $("modeLabel").textContent = DOCK_MODES[mode].caption;
    $("modeToggleBtn").textContent = `Switch to ${DOCK_MODES[nextMode].chip}`;
    this.updateReadouts();
  }

  cycleDockMode() {
    const i = DOCK_MODE_ORDER.indexOf(this.app.state.dockMode);
    this.setDockMode(DOCK_MODE_ORDER[(i + 1) % DOCK_MODE_ORDER.length]);
  }

  // The top pill only switches between calendar text and tick text.
  toggleCalendarTickMode() {
    this.setDockMode(this.app.state.tickMode ? "date" : "ticks");
  }

  applyDateFields() {
    const state = this.app.state;
    const monthIdx = +$("dateMonth").value;
    const year = Math.trunc(+$("dateYear").value || 0);
    const requestedDay = Math.trunc(+$("dateDay").value || 1);
    const dayOfMonth = Math.min(Math.max(requestedDay, 1), MONTHS[monthIdx].days);

    const day = getDayFromDate(year, monthIdx, dayOfMonth);
    if (day === null) return;
    this.setT(day + (state.t - Math.floor(state.t)));
  }

  bind() {
    const state = this.app.state;
    $("modeToggleBtn").onclick = () => this.cycleDockMode();
    $("topModeToggle").onclick = () => this.toggleCalendarTickMode();

    for (const id of ["dateDay", "dateMonth", "dateYear"]) {
      $(id).oninput = () => this.applyDateFields();
      $(id).onchange = () => this.updateReadouts(true);
    }
    $("datePrev").onclick = () => this.setT(state.t - 1);
    $("dateNext").onclick = () => this.setT(state.t + 1);

    $("day").oninput = () => {
      state.t = Math.floor(+$("day").value || 0) + +$("tod").value;
      this.updateReadouts();
    };

    $("tod").oninput = () => {
      state.t = Math.floor(state.t) + +$("tod").value;
      this.updateReadouts();
    };

    $("dayPrev").onclick = () => this.setT(state.t - 1);
    $("dayNext").onclick = () => this.setT(state.t + 1);

    $("totalTickInput").oninput = () => this.setT(totalTicksToTime(+$("totalTickInput").value || 0));
    $("tickPrev").onclick = () => this.setT(totalTicksToTime(getTickInfo(state.t).totalTicks - 1000));
    $("tickNext").onclick = () => this.setT(totalTicksToTime(getTickInfo(state.t).totalTicks + 1000));

    $("play").onclick = () => {
      state.playing = !state.playing;
      this.setPlayIcon(state.playing);
    };

    $("copyCmdBtn").onclick = () => {
      const cmd = `/time set ${getTickInfo(state.t).totalTicks}`;
      navigator.clipboard.writeText(cmd);
      const btn = $("copyCmdBtn");
      btn.classList.add("copied");
      $("cmdPreview").textContent = `Copied: ${cmd}`;
      setTimeout(() => {
        btn.classList.remove("copied");
        this.updateReadouts();
      }, 1400);
    };
  }

  // Do not overwrite an input while the user types in it.
  // A change event sets forceFields, so a clamped value shows when the user leaves the input.
  updateReadouts(forceFields = false) {
    const state = this.app.state;
    const tk = getTickInfo(state.t);
    const cal = getCalendarInfo(tk.day);
    const todFrac = state.t - Math.floor(state.t);
    const canWrite = id => forceFields || document.activeElement !== $(id);

    if (state.tickMode) {
      $("topDateText").textContent = `Tick ${tk.totalTicks.toLocaleString()} (Day ${tk.day})`;
      $("clk").textContent = `${tk.todTicks}t (${hhmm12(todFrac)})`;
    } else {
      $("topDateText").textContent = `${cal.fullText} (Day ${tk.day})`;
      $("clk").textContent = `${hhmm12(todFrac)} (${hhmm24(todFrac)})`;
    }

    $("todReadout").textContent = `TOD: ${tk.todTicks}t`;
    if (!$("copyCmdBtn").classList.contains("copied")) {
      $("cmdPreview").textContent = `/time set ${tk.totalTicks}`;
    }

    $("dateMonth").value = cal.monthIndex;
    $("dateDay").max = MONTHS[cal.monthIndex].days;
    if (canWrite("dateDay")) $("dateDay").value = cal.dayOfMonth;
    if (canWrite("dateYear")) $("dateYear").value = cal.year;

    if (canWrite("day")) $("day").value = tk.day;
    if (canWrite("totalTickInput")) $("totalTickInput").value = tk.totalTicks;
    if (canWrite("tod")) $("tod").value = todFrac.toFixed(4);
  }
}