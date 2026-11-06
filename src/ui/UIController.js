import { clamp, lerp } from "../core/math.js";
import { PLN, PH } from "../config/constants.js";
import { calc, sepEq, getTargetAltAz, zToLatitude } from "../core/astronomy.js";
import { getCalendarInfo, getTickInfo, totalTicksToTime, hhmm12, hhmm24 } from "../core/calendar.js";
import { findForecastEvents, paintForecastGraphic } from "../forecast/ForecastScanner.js";

const $ = id => document.getElementById(id);

export class UIController {
  constructor(skyScene) {
    this.skyScene = skyScene;
    this.t = 0;
    this.playing = false;
    this.tickMode = false;
    this.yaw = 180;
    this.pitch = 25;
    this.fov = 70;
    this.frameN = 0;
    this.lastScannedDay = null;
    this.camAnim = null;
    this.trackedTarget = null;
    this.selectedEvt = "lun";
    this.selectedPlanet = "mars";

    this.bindTabs();
    this.bindTimeControls();
    this.bindSettingsControls();
    this.bindCameraControls();
    this.bindForecastControls();
    this.updateTimeReadouts();
  }

  bindTabs() {
    this.tabs = document.querySelectorAll(".wii-tab");
    this.panels = {
      forecast: $("panel-forecast"),
      settings: $("panel-settings")
    };

    this.tabs.forEach(btn => {
      btn.addEventListener("click", () => this.switchTab(btn.dataset.tab));
    });
  }

  switchTab(tabName) {
    this.tabs.forEach(btn => {
      const active = btn.dataset.tab === tabName;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active);
    });
    this.panels.forecast.hidden = tabName !== "forecast";
    this.panels.settings.hidden = tabName !== "settings";
  }

  toggleCalendarTickMode() {
    this.tickMode = !this.tickMode;
    $("dayInputGroup").hidden = this.tickMode;
    $("tickInputGroup").hidden = !this.tickMode;
    $("modeLabel").textContent = this.tickMode ? "TOTAL TICKS" : "WORLD DAY";
    $("modeToggleBtn").textContent = this.tickMode ? "Switch to Date" : "Switch to Ticks";
    this.updateTimeReadouts();
    this.updateForecastBoard();
  }

  setPlayIcon(isPlaying) {
    $("playIco").innerHTML = isPlaying
      ? `<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>`
      : `<polygon points="7,4 20,12 7,20"/>`;
  }

  setT(v) {
    this.t = v;
    this.updateTimeReadouts();
  }

  bindTimeControls() {
    $("modeToggleBtn").onclick = () => this.toggleCalendarTickMode();
    $("topModeToggle").onclick = () => this.toggleCalendarTickMode();

    $("day").oninput = () => {
      this.t = Math.floor(+$("day").value || 0) + (+$("tod").value);
      this.updateTimeReadouts();
    };

    $("tod").oninput = () => {
      this.t = Math.floor(this.t) + (+$("tod").value);
      this.updateTimeReadouts();
    };

    $("dayPrev").onclick = () => this.setT(this.t - 1);
    $("dayNext").onclick = () => this.setT(this.t + 1);

    $("totalTickInput").oninput = () => {
      const val = +$("totalTickInput").value || 0;
      this.setT(totalTicksToTime(val));
    };

    $("tickPrev").onclick = () => {
      const tk = getTickInfo(this.t);
      this.setT(totalTicksToTime(tk.totalTicks - 1000));
    };

    $("tickNext").onclick = () => {
      const tk = getTickInfo(this.t);
      this.setT(totalTicksToTime(tk.totalTicks + 1000));
    };

    $("play").onclick = () => {
      this.playing = !this.playing;
      this.setPlayIcon(this.playing);
    };

    $("copyCmdBtn").onclick = () => {
      const tk = getTickInfo(this.t);
      const cmd = `/time set ${tk.totalTicks}`;
      navigator.clipboard.writeText(cmd);
      const btn = $("copyCmdBtn");
      btn.classList.add("copied");
      $("cmdPreview").textContent = `Copied: ${cmd}`;
      setTimeout(() => {
        btn.classList.remove("copied");
        this.updateTimeReadouts();
      }, 1400);
    };
  }

  bindSettingsControls() {
    $("z").oninput = () => this.updateForecastBoard();
    $("disc").oninput = e => {
      $("discVal").textContent = (+e.target.value).toFixed(1) + "°";
      this.updateForecastBoard();
    };
    $("mdisc").oninput = e => {
      $("mdiscVal").textContent = (+e.target.value).toFixed(1) + "°";
      this.updateForecastBoard();
    };
    $("resetFov").onclick = () => {
      this.fov = 70;
      this.trackedTarget = null;
      $("targetBanner").hidden = true;
    };
  }

  bindCameraControls() {
    const cv = this.skyScene.cv;
    let drag = null;

    cv.onpointerdown = e => {
      drag = [e.clientX, e.clientY];
      this.camAnim = null;
      cv.setPointerCapture(e.pointerId);
    };

    cv.onpointerup = () => {
      drag = null;
    };

    cv.onpointermove = e => {
      if (!drag) return;
      const k = this.fov / window.innerHeight;
      this.yaw = (this.yaw - (e.clientX - drag[0]) * k + 360) % 360;
      this.pitch = clamp(this.pitch + (e.clientY - drag[1]) * k, -85, 89);
      drag = [e.clientX, e.clientY];
    };

    cv.onwheel = e => {
      e.preventDefault();
      this.camAnim = null;
      this.fov = clamp(this.fov * (1 + Math.sign(e.deltaY) * 0.08), 3, 100);
    };
  }

  bindForecastControls() {
    $("scrollLeft").onclick = () => {
      $("ev").scrollBy({ left: -450, behavior: "smooth" });
    };
    $("scrollRight").onclick = () => {
      $("ev").scrollBy({ left: 450, behavior: "smooth" });
    };

    document.querySelectorAll("#evtGroup .wii-seg").forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll("#evtGroup .wii-seg").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.selectedEvt = btn.dataset.evt;
        this.updateForecastBoard();
      };
    });

    document.querySelectorAll("#plGroup .wii-pl-btn").forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll("#plGroup .wii-pl-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.selectedPlanet = btn.dataset.pl;
        this.updateForecastBoard();
      };
    });
  }

  focusOnEvent(evData) {
    this.playing = false;
    this.setPlayIcon(false);
    this.setT(evData.t);
    this.switchTab("sky");

    const Z = +$("z").value;
    const phi = zToLatitude(Z);
    const s = calc(evData.t, Z);
    this.trackedTarget = evData.target;
    const pos = getTargetAltAz(this.trackedTarget, s, phi);
    if (!pos) return;

    if (pos.alt < 0) $("xray").checked = true;

    const dYaw = ((pos.az - this.yaw + 540) % 360) - 180;
    this.camAnim = {
      startYaw: this.yaw,
      targetYaw: this.yaw + dYaw,
      startPitch: this.pitch,
      targetPitch: clamp(pos.alt, -85, 89),
      startFov: this.fov,
      targetFov: 35,
      elapsed: 0,
      duration: 0.85
    };

    const tk = getTickInfo(evData.t);
    const cal = getCalendarInfo(tk.day);
    $("targetText").textContent = `${evData.title} • ${cal.fullText} (${hhmm12(evData.t - Math.floor(evData.t))} / ${tk.totalTicks}t)`;
    $("targetBanner").hidden = false;
  }

  updateForecastBoard() {
    const Z = +$("z").value;
    const phi = zToLatitude(Z);
    const disc = +$("disc").value;
    const md = +$("mdisc").value;
    const t0 = Math.floor(this.t);

    const events = findForecastEvents({
      type: this.selectedEvt,
      pn: this.selectedPlanet,
      t0,
      Z,
      disc,
      md
    });

    const strip = $("ev");
    strip.innerHTML = "";

    if (!events.length) {
      strip.innerHTML = `<div class="wii-card">No upcoming events found in this window.</div>`;
      return;
    }

    events.forEach(ev => {
      const s = calc(ev.t, Z);
      const pos = getTargetAltAz(ev.target, s, phi);
      const isUp = pos && pos.alt >= 0;
      const tk = getTickInfo(ev.t);
      const cal = getCalendarInfo(tk.day);
      const todFrac = ev.t - Math.floor(ev.t);

      const col = document.createElement("div");
      col.className = "forecast-column";
      col.innerHTML = `
        <div class="fc-col-head">
          <div class="fc-dow">${cal.dowShort} • YEAR ${cal.year}</div>
          <div class="fc-date-main">${cal.monthShort} ${cal.dayOrd}</div>
          <div class="fc-sub-meta">
            <span>Day ${tk.day}</span>
            <span>•</span>
            <span>${hhmm12(todFrac)}</span>
          </div>
        </div>

        <div class="fc-col-stage">
          <canvas class="fc-art-lg" width="96" height="96"></canvas>
          <div class="fc-col-title">${ev.title}</div>
          <div class="fc-col-metric">${ev.sub}</div>
          <div class="fc-alt-pill ${isUp ? "up" : "down"}">
            ${isUp ? `Above Horizon (${pos.alt.toFixed(0)}°)` : `Below Horizon (${pos.alt.toFixed(0)}°)`}
          </div>
        </div>

        <div class="fc-col-foot">
          <span class="fc-view-label">View in Sky</span>
          <button class="fc-copy-mini" title="Copy /time set ${tk.totalTicks}">${tk.totalTicks}t</button>
        </div>
      `;

      paintForecastGraphic(col.querySelector(".fc-art-lg"), this.selectedEvt, ev.v, this.selectedPlanet);

      const copyBtn = col.querySelector(".fc-copy-mini");
      copyBtn.onclick = e => {
        e.stopPropagation();
        navigator.clipboard.writeText(`/time set ${tk.totalTicks}`);
        copyBtn.textContent = "Copied!";
        setTimeout(() => {
          copyBtn.textContent = `${tk.totalTicks}t`;
        }, 1200);
      };

      col.onclick = () => this.focusOnEvent(ev);
      strip.appendChild(col);
    });
  }

  updateTimeReadouts() {
    const tk = getTickInfo(this.t);
    const cal = getCalendarInfo(tk.day);
    const todFrac = this.t - Math.floor(this.t);

    if (this.tickMode) {
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

    if (document.activeElement !== $("day")) {
      $("day").value = tk.day;
    }
    if (document.activeElement !== $("totalTickInput")) {
      $("totalTickInput").value = tk.totalTicks;
    }
    if (document.activeElement !== $("tod")) {
      $("tod").value = todFrac.toFixed(4);
    }
  }

  updateTelemetry(s, phi, su, mo, pa, disc, md) {
    const f1 = (x, n = 1) => x.toFixed(n);
    const lim = disc / 2 + md / 2;
    const tk = getTickInfo(this.t);
    const cal = getCalendarInfo(tk.day);

    const ptxt = Object.keys(PLN)
      .map(n => {
        const q = s.pl[n];
        const a = pa[n];
        const m = sepEq(s.moon, q);
        return `${n.slice(0, 3).toUpperCase()} alt ${f1(a.alt)} az ${f1(a.az)}  ${f1(q.dist, 2)}AU el ${f1(q.elong, 0)} br ${f1(q.bright, 2)} moon ${f1(m, 1)}°${m < lim ? " OVERLAP" : ""}`;
      })
      .join("\n");

    $("lat").textContent = `Latitude ${phi.toFixed(1)}° (north = −Z)`;
    $("out").textContent =
`Date  ${cal.fullText}
Ticks Total ${tk.totalTicks} (Day ${tk.day}, TOD ${tk.todTicks}t)
Sun   alt ${f1(su.alt)}°  az ${f1(su.az)}°  dec ${f1(s.sun.dec)}°
Moon  alt ${f1(mo.alt)}°  az ${f1(mo.az)}°
      ${PH[s.ph]}, elong ${f1(s.elong)}°, lat β ${f1(s.bmoon, 2)}°
Lunar eclipse  dist ${f1(s.ecl_d, 2)}°  blood ${f1(s.blood, 2)}
Solar eclipse  sep ${f1(s.sep, 2)}°  tint ${f1(s.eclipse, 2)}
────────────────────────────────────────────────────────
${ptxt}`;
  }

  tick(dt) {
    if (this.playing) {
      this.setT(this.t + dt * (+$("spd").value));
    }

    if (this.camAnim) {
      this.camAnim.elapsed += dt;
      const u = clamp(this.camAnim.elapsed / this.camAnim.duration, 0, 1);
      const ease = 1 - Math.pow(1 - u, 3);
      this.yaw = (lerp(this.camAnim.startYaw, this.camAnim.targetYaw, ease) + 360) % 360;
      this.pitch = lerp(this.camAnim.startPitch, this.camAnim.targetPitch, ease);
      this.fov = lerp(this.camAnim.startFov, this.camAnim.targetFov, ease);
      if (u >= 1) this.camAnim = null;
    }

    const currentDayInt = Math.floor(this.t);
    if (currentDayInt !== this.lastScannedDay) {
      this.lastScannedDay = currentDayInt;
      this.updateForecastBoard();
    }

    const Z = +$("z").value;
    const phi = zToLatitude(Z);
    const disc = +$("disc").value;
    const md = +$("mdisc").value;
    const s = calc(this.t, Z);

    const { su, mo, pa } = this.skyScene.render(s, phi, {
      disc,
      md,
      showEcl: $("ecl").checked,
      showEqu: $("equ").checked,
      xray: $("xray").checked,
      yaw: this.yaw,
      pitch: this.pitch,
      fov: this.fov,
      trackedTarget: this.trackedTarget
    });

    if (this.frameN++ % 4 === 0) {
      this.updateTimeReadouts();
      this.updateTelemetry(s, phi, su, mo, pa, disc, md);
    }
  }
}