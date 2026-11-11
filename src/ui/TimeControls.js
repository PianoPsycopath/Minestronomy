import { $ } from "./dom.js";
import { getCalendarInfo } from "../core/calendar.js";
import { getTickInfo, totalTicksToTime, hhmm12, hhmm24 } from "../core/time.js";

export class TimeControls {
  constructor(app) {
    this.app = app;
    this.bind();
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

  toggleCalendarTickMode() {
    const state = this.app.state;
    state.tickMode = !state.tickMode;
    $("dayInputGroup").hidden = state.tickMode;
    $("tickInputGroup").hidden = !state.tickMode;
    $("modeLabel").textContent = state.tickMode ? "TOTAL TICKS" : "WORLD DAY";
    $("modeToggleBtn").textContent = state.tickMode ? "Switch to Date" : "Switch to Ticks";
    this.updateReadouts();
  }

  bind() {
    const state = this.app.state;
    $("modeToggleBtn").onclick = () => this.toggleCalendarTickMode();
    $("topModeToggle").onclick = () => this.toggleCalendarTickMode();

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
  updateReadouts() {
    const state = this.app.state;
    const tk = getTickInfo(state.t);
    const cal = getCalendarInfo(tk.day);
    const todFrac = state.t - Math.floor(state.t);

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

    if (document.activeElement !== $("day")) $("day").value = tk.day;
    if (document.activeElement !== $("totalTickInput")) $("totalTickInput").value = tk.totalTicks;
    if (document.activeElement !== $("tod")) $("tod").value = todFrac.toFixed(4);
  }
}
