import { clamp, lerp, cap } from "../core/math.js";
import { PLN, PH, COMETS } from "../config/constants.js";
import { calc, sepEq, getTargetAltAz, zToLatitude, cometVisibility, cometDaysToPerihelion, facingCommand } from "../core/astronomy.js";
import { getCalendarInfo, getTickInfo, totalTicksToTime, hhmm12, hhmm24, getMonthSpan } from "../core/calendar.js";
import {
  findEventsInRange,
  findCometSpans,
  findNextEvents,
  cometBestView,
  paintForecastGraphic,
  EVENT_KINDS
} from "../forecast/ForecastScanner.js";
import { exportBedrockAddon } from "../export/McAddonExporter.js";

const $ = id => document.getElementById(id);

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const compass = az => COMPASS[Math.round(((az % 360) + 360) % 360 / 45) % 8];

// Weeks run Sunday -> Saturday. Day 0 is a Tuesday (see DOW_NAMES), so Sunday is day % 7 === 5.
const weekStart = d => d - ((((d - 5) % 7) + 7) % 7);
const LIGHT_MINUTES_PER_AU = 8.317;
const lightTime = au => {
  const minutes = au * LIGHT_MINUTES_PER_AU;
  return minutes < 90 ? `${minutes.toFixed(1)} min` : `${(minutes / 60).toFixed(1)} h`;
};
const tintRgb = (t, base, gain) => `rgb(${t.map(c => Math.round(255 * (base + gain * c))).join(",")})`;

export class UIController {
  constructor(skyScene, particleLoader, solarScene) {
    this.skyScene = skyScene;
    this.solarScene = solarScene;
    this.particleLoader = particleLoader;
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
    this.trackedLabel = null; // set when locked via Find / sky click: banner then shows live alt/az
    this.pendingTexBody = null;
    this.lastRender = null;
    this.activeTab = "sky";

    // Forecast state
    this.fcView = "week";
    this.fcAnchor = null; // null = follow the current sky day
    this.fcCats = new Set([...Object.keys(EVENT_KINDS), "vis"]); // "vis" = only show what can be seen
    this.fcCache = null;
    this.fcCtx = null;
    this.fcHover = null;  // day under the mouse (drives the right-hand detail panel)
    this.fcPinned = null; // day chosen by clicking a day or a "next event" chip
    this.fcNextKind = "lun";
    this.fcNextCount = 5;
    this.fcNextCache = null;
    this._fcTimer = null;

    this.bindTabs();
    this.bindTimeControls();
    this.bindSettingsControls();
    this.bindCameraControls();
    this.bindForecastControls();
    this.buildFindList();
    this.bindExportControls();
    this.bindSolarControls();
    this.updateTimeReadouts();
    this.renderTextureStatusList();
  }

  // ------------------------------------------------------------------------------------------ tabs
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
    this.activeTab = tabName;
    this.tabs.forEach(btn => {
      const active = btn.dataset.tab === tabName;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active);
    });
    this.panels.forecast.hidden = tabName !== "forecast";
    this.panels.settings.hidden = tabName !== "settings";
    this.hidePickCard();
    this.applyView();
    if (tabName === "forecast") this.updateForecastBoard();
  }

  // ------------------------------------------------------------------------------------------ solar system
  bindSolarControls() {
    const scene = this.solarScene;
    this.solarRows = [];
    const list = $("solarFocusList");

    for (const body of scene.bodies) {
      const row = el("button", "find-row");
      row.type = "button";
      row.innerHTML = `<span class="sw-dot" style="background:${body.color}"></span><span class="find-name">${body.label}</span><span class="find-alt">—</span>`;
      row.onclick = () => this.focusSolar(body.key);
      list.appendChild(row);
      this.solarRows.push({ key: body.key, row, readout: row.querySelector(".find-alt") });
    }

    $("solarScaleGroup").querySelectorAll(".wii-seg").forEach(btn => {
      btn.onclick = () => {
        $("solarScaleGroup").querySelectorAll(".wii-seg").forEach(b => b.classList.toggle("active", b === btn));
        scene.setScale(btn.dataset.scale);
      };
    });

    const syncVisibility = () =>
      scene.setVisibility({
        orbits: $("solarOrbits").checked,
        labels: $("solarLabels").checked,
        rings: $("solarRings").checked,
        comets: $("solarComets").checked
      });
    for (const id of ["solarOrbits", "solarLabels", "solarRings", "solarComets"]) $(id).onchange = syncVisibility;

    scene.onPick = key => this.focusSolar(key);
  }

  focusSolar(key) {
    if (this.solarScene.setFocus(key)) this.updateSolarHud();
  }

  updateSolarHud() {
    if (!this.solarRows) return;
    const focusKey = this.solarScene.focusKey;

    for (const r of this.solarRows) {
      const info = this.solarScene.describe(r.key);
      if (!info) continue;
      r.readout.textContent = info.active ? `${info.sunAu.toFixed(2)} AU` : "dormant";
      r.row.classList.toggle("disabled", !info.active);
      r.row.classList.toggle("focused", r.key === focusKey);
    }

    const info = this.solarScene.describe(focusKey);
    if (!info) return;
    $("solarInfo").innerHTML = `
      <strong>${info.label}</strong>
      <div>Sun distance: ${info.sunAu.toFixed(3)} AU</div>
      <div>Earth distance: ${info.earthAu.toFixed(3)} AU</div>
      <div>Light time from Sun: ${lightTime(info.sunAu)}</div>`;
  }

  applyView() {
    const solar = this.activeTab === "solar";
    $("c").hidden = solar;
    this.solarScene.canvas.hidden = !solar;
    $("solarHud").hidden = !solar;
    document.body.classList.toggle("view-solar", solar);
    if (solar) {
      $("findPanel").hidden = true;
      this.updateSolarHud();
    }
  }

  // ------------------------------------------------------------------------------------------ time
  toggleCalendarTickMode() {
    this.tickMode = !this.tickMode;
    $("dayInputGroup").hidden = this.tickMode;
    $("tickInputGroup").hidden = !this.tickMode;
    $("modeLabel").textContent = this.tickMode ? "TOTAL TICKS" : "WORLD DAY";
    $("modeToggleBtn").textContent = this.tickMode ? "Switch to Date" : "Switch to Ticks";
    this.updateTimeReadouts();
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

  // ------------------------------------------------------------------------------------------ settings
  bindSettingsControls() {
    $("z").oninput = () => this.scheduleForecast();
    $("disc").oninput = e => {
      $("discVal").textContent = (+e.target.value).toFixed(1) + "°";
      this.scheduleForecast();
    };
    $("mdisc").oninput = e => {
      $("mdiscVal").textContent = (+e.target.value).toFixed(1) + "°";
      this.scheduleForecast();
    };
    $("resetFov").onclick = () => {
      this.fov = 70;
      this.trackedTarget = null;
      this.trackedLabel = null;
      $("targetBanner").hidden = true;
    };
    $("copyFaceBtn").onclick = () => {
      if (!this.trackedTarget) return;
      const Z = +$("z").value;
      const s = calc(this.t, Z);
      const pos = getTargetAltAz(this.trackedTarget, s, zToLatitude(Z));
      if (!pos) return;
      const btn = $("copyFaceBtn");
      navigator.clipboard.writeText(facingCommand(pos));
      btn.textContent = "Copied!";
      setTimeout(() => {
        btn.textContent = "Copy /tp";
      }, 1200);
    };
  }

  bindExportControls() {
    $("exportAddonBtn").onclick = async () => {
      const btn = $("exportAddonBtn");
      const prev = btn.textContent;
      btn.textContent = "Packaging...";
      await exportBedrockAddon(this.particleLoader, this.skyScene, "Minestronomy");
      btn.textContent = "Exported!";
      setTimeout(() => {
        btn.textContent = prev;
      }, 1400);
    };

    $("customTexInput").onchange = async e => {
      const file = e.target.files?.[0];
      if (!file || !this.pendingTexBody) return;
      await this.particleLoader.setCustomTextureFile(this.pendingTexBody, file);
      this.skyScene.syncStarboxTexturesFromLoader();
      this.renderTextureStatusList();
      e.target.value = "";
    };
  }

  renderTextureStatusList() {
    const list = $("texStatusList");
    if (!list || !this.particleLoader) return;
    list.innerHTML = "";

    const entries = [
      ...Object.entries(this.particleLoader.configs).map(([key, cfg]) => ({
        targetKey: key,
        label: key === "moon" ? "moon (4x2 phase atlas)" : `${key} (${cfg.material})`,
        cfg
      })),
      ...Object.entries(this.particleLoader.starboxConfigs).map(([faceKey, cfg]) => ({
        targetKey: `starbox_${faceKey}`,
        label: `starbox ${faceKey.toUpperCase()} (${cfg.material})`,
        cfg
      }))
    ];

    for (const item of entries) {
      const { targetKey, label, cfg } = item;
      const row = document.createElement("div");
      row.className = "tex-row";
      row.innerHTML = `
        <div class="tex-row-left">
          <span class="tex-body-name">${label}</span>
          <span class="tex-path-code">public/${cfg.texturePath}.png</span>
        </div>
        <div class="tex-row-right">
          <span class="tex-badge ${cfg.hasTextureFile ? "ok" : "fallback"}">
            ${cfg.hasTextureFile ? "PNG Loaded" : "Fallback"}
          </span>
          <button class="fc-copy-mini load-png-btn" type="button">Load PNG</button>
        </div>
      `;
      row.querySelector(".load-png-btn").onclick = () => {
        this.pendingTexBody = targetKey;
        $("customTexInput").click();
      };
      list.appendChild(row);
    }
  }

  // ------------------------------------------------------------------------------------------ camera + sky click
  bindCameraControls() {
    const cv = this.skyScene.cv;
    let drag = null;
    let downAt = null;
    let moved = false;

    cv.onpointerdown = e => {
      drag = [e.clientX, e.clientY];
      downAt = [e.clientX, e.clientY];
      moved = false;
      this.camAnim = null;
      this.hidePickCard();
      cv.setPointerCapture(e.pointerId);
    };

    cv.onpointerup = e => {
      const wasClick = drag && !moved;
      drag = null;
      if (wasClick) this.handleSkyClick(e.clientX, e.clientY);
    };

    cv.onpointermove = e => {
      if (!drag) return;
      if (Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) moved = true;
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

  labelFor(target) {
    if (target.type === "sun") return "Sun";
    if (target.type === "moon") return "Moon";
    if (target.type === "planet") return cap(target.planet);
    const C = COMETS[target.comet || "comet"];
    return `${C.label} Comet`;
  }

  // Short fact lines for the click card.
  describeTarget(target, s) {
    const f = (x, n = 1) => x.toFixed(n);
    const lines = [];
    if (target.type === "sun") {
      lines.push(`Declination ${f(s.sun.dec)}°`);
      if (s.eclipse > 0.05) lines.push(`Being eclipsed (${Math.round(s.eclipse * 100)}%)`);
    } else if (target.type === "moon") {
      lines.push(`${PH[s.ph]} • elongation ${f(s.elong, 0)}°`);
      if (s.blood > 0.05) lines.push("Lunar eclipse in progress");
      if (s.eclipse > 0.05) lines.push("Passing in front of the Sun");
    } else if (target.type === "planet") {
      const q = s.pl[target.planet];
      lines.push(`${f(q.dist, 2)} AU from Earth • elongation ${f(q.elong, 0)}°`);
      lines.push(`Brightness ${f(q.bright, 2)}`);
    } else {
      const c = s.comets[target.comet];
      lines.push(`${f(c.dist, 2)} AU from Earth • ${f(c.r, 2)} AU from Sun`);
      lines.push(`Brightness ${f(c.bright, 2)}`);
    }
    return lines;
  }

  handleSkyClick(x, y) {
    if (!this.lastRender) return;
    const Z = +$("z").value;
    const s = calc(this.t, Z);
    const res = this.skyScene.pick(x, y, this.lastRender, s, {
      disc: +$("disc").value,
      md: +$("mdisc").value,
      xray: $("xray").checked
    });
    this.showPickCard(res, s, x, y);
  }

  showPickCard(res, s, x, y) {
    const card = $("pickCard");
    const phi = zToLatitude(+$("z").value);
    const hit = res.hit;
    const pos = hit ? getTargetAltAz(hit, s, phi) : { alt: res.alt, az: res.az };
    const title = hit ? this.labelFor(hit) : "Empty sky";
    const lines = [
      `${pos.alt >= 0 ? "Above" : "Below"} horizon • Alt ${pos.alt.toFixed(1)}° • Az ${pos.az.toFixed(1)}° ${compass(pos.az)}`,
      ...(hit ? this.describeTarget(hit, s) : ["No visible object here. Stars aren't individually identified."])
    ];

    card.innerHTML = `
      <div class="pick-head"><strong>${title}</strong><button class="pick-x" type="button" aria-label="Close">×</button></div>
      <div class="pick-body">${lines.map(l => `<div>${l}</div>`).join("")}</div>
      <div class="pick-actions">
        ${hit ? `<button class="wii-pill-btn sm" data-act="lock" type="button">Lock on</button>` : ""}
        <button class="wii-pill-btn sm" data-act="tp" type="button">Copy /tp</button>
      </div>`;

    card.querySelector(".pick-x").onclick = () => this.hidePickCard();
    const lock = card.querySelector('[data-act="lock"]');
    if (lock) {
      lock.onclick = () => {
        this.trackObject(hit);
        this.hidePickCard();
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

  hidePickCard() {
    const card = $("pickCard");
    if (card) card.hidden = true;
  }

  // ------------------------------------------------------------------------------------------ find object
  buildFindList() {
    const list = $("findList");
    if (!list) return;

    const objs = [
      { label: "Sun", target: { type: "sun" }, color: "#ffd84a" },
      { label: "Moon", target: { type: "moon" }, color: "#e8e4d8" },
      ...Object.keys(PLN).map(n => ({ label: cap(n), target: { type: "planet", planet: n }, color: `rgb(${PLN[n].col})` })),
      ...Object.values(COMETS).map(C => ({
        label: `${C.label} Comet`,
        target: { type: "comet", comet: C.key },
        color: tintRgb(C.tint, 0, 1)
      }))
    ];

    this.findObjs = objs;
    for (const o of objs) {
      const row = el("button", "find-row");
      row.type = "button";
      row.innerHTML = `<span class="sw-dot" style="background:${o.color}"></span><span class="find-name">${o.label}</span><span class="find-alt">—</span>`;
      row.onclick = () => this.trackObject(o.target);
      o.row = row;
      o.altEl = row.querySelector(".find-alt");
      list.appendChild(row);
    }

    $("findBtn").onclick = () => {
      $("findPanel").hidden = !$("findPanel").hidden;
    };
    $("findClose").onclick = () => {
      $("findPanel").hidden = true;
    };
  }

  updateFindList(s, su, mo, pa) {
    if (!this.findObjs || $("findPanel").hidden) return;
    for (const o of this.findObjs) {
      const t = o.target;
      let p;
      let dormant = false;
      if (t.type === "sun") p = su;
      else if (t.type === "moon") p = mo;
      else if (t.type === "planet") p = pa[t.planet];
      else {
        p = pa.comets[t.comet];
        dormant = !s.comets[t.comet].on;
      }
      o.altEl.textContent = dormant ? "dormant" : `${p.alt >= 0 ? "↑" : "↓"} ${Math.abs(p.alt).toFixed(0)}° ${compass(p.az)}`;
      o.row.classList.toggle("down", !dormant && p.alt < 0);
      o.row.classList.toggle("disabled", dormant);
    }
  }

  // Lock the reticle on any object at the current time and swing the camera to it.
  trackObject(target) {
    const Z = +$("z").value;
    const s = calc(this.t, Z);
    if (target.type === "comet" && !s.comets[target.comet].on) return;
    const pos = getTargetAltAz(target, s, zToLatitude(Z));
    if (!pos) return;

    this.trackedTarget = target;
    this.trackedLabel = this.labelFor(target);
    if (pos.alt < 0) $("xray").checked = true;
    this.camTo(pos);
    $("targetText").textContent = `${this.trackedLabel} • Alt ${pos.alt.toFixed(0)}° Az ${pos.az.toFixed(0)}° ${compass(pos.az)}`;
    $("targetBanner").hidden = false;
  }

  camTo(pos) {
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
    this.trackedLabel = null;
    const pos = getTargetAltAz(this.trackedTarget, s, phi);
    if (!pos) return;

    if (pos.alt < 0) $("xray").checked = true;
    this.camTo(pos);

    const tk = getTickInfo(evData.t);
    const cal = getCalendarInfo(tk.day);
    $("targetText").textContent = `${evData.title} • ${cal.fullText} (${hhmm12(evData.t - Math.floor(evData.t))} / ${tk.totalTicks}t)`;
    $("targetBanner").hidden = false;
  }

  // ------------------------------------------------------------------------------------------ forecast
  bindForecastControls() {
    $("viewGroup").querySelectorAll(".wii-seg").forEach(btn => {
      btn.onclick = () => {
        $("viewGroup").querySelectorAll(".wii-seg").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.fcView = btn.dataset.view;
        this.updateForecastBoard();
      };
    });

    $("fcPrev").onclick = () => this.fcShift(-1);
    $("fcNext").onclick = () => this.fcShift(1);
    $("fcToday").onclick = () => {
      this.fcAnchor = null;
      this.fcPinned = null;
      this.updateForecastBoard();
    };

    $("catGroup").querySelectorAll(".wii-seg").forEach(btn => {
      btn.onclick = () => {
        const k = btn.dataset.cat;
        if (this.fcCats.has(k)) this.fcCats.delete(k);
        else this.fcCats.add(k);
        btn.classList.toggle("active", this.fcCats.has(k));
        this.updateForecastBoard();
      };
    });

    $("nextKindGroup").querySelectorAll(".wii-seg").forEach(btn => {
      btn.onclick = () => {
        $("nextKindGroup").querySelectorAll(".wii-seg").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.fcNextKind = btn.dataset.next;
        this.fcNextCount = 5;
        this.renderNextBar();
      };
    });

    $("fcBoard").onmouseleave = () => {
      this.fcHover = null;
      this.renderSide();
    };
  }

  scheduleForecast() {
    clearTimeout(this._fcTimer);
    this._fcTimer = setTimeout(() => this.updateForecastBoard(), 150);
  }

  fcShift(dir) {
    const a = this.fcAnchor ?? Math.floor(this.t);
    if (this.fcView === "week") {
      this.fcAnchor = a + 7 * dir;
    } else {
      const m = getMonthSpan(a);
      this.fcAnchor = dir > 0 ? m.end : m.start - 1;
    }
    this.updateForecastBoard();
  }

  // Jump the calendar to a day and pin it in the detail panel.
  goToDay(d) {
    this.fcAnchor = d;
    this.fcPinned = d;
    this.updateForecastBoard();
  }

  // g0..g1 = the days drawn (whole weeks); m0..m1 = the days that belong to the shown month/week.
  getForecastRange() {
    const a = this.fcAnchor ?? Math.floor(this.t);
    if (this.fcView === "week") {
      const g0 = weekStart(a);
      return { a, g0, g1: g0 + 7, m0: g0, m1: g0 + 7 };
    }
    const m = getMonthSpan(a);
    return { a, g0: weekStart(m.start), g1: weekStart(m.end - 1) + 7, m0: m.start, m1: m.end };
  }

  updateForecastBoard() {
    if ($("panel-forecast").hidden) return;

    const Z = +$("z").value;
    const phi = zToLatitude(Z);
    const disc = +$("disc").value;
    const md = +$("mdisc").value;
    const range = this.getForecastRange();
    const { g0, g1, m0, m1, a } = range;

    const key = [g0, g1, Z, disc, md, [...this.fcCats].sort().join(",")].join("|");
    if (!this.fcCache || this.fcCache.key !== key) {
      this.fcCache = {
        key,
        events: findEventsInRange({ d0: g0, d1: g1, Z, disc, md, cats: this.fcCats }),
        spans: this.fcCats.has("com") ? findCometSpans(g0, g1, Z) : []
      };
    }
    const { events, spans } = this.fcCache;

    if (this.fcView === "week") {
      const c0 = getCalendarInfo(g0);
      const c1 = getCalendarInfo(g1 - 1);
      $("fcRange").textContent = `${c0.monthShort} ${c0.dayOrd} – ${c1.monthShort} ${c1.dayOrd}, Year ${c1.year}`;
    } else {
      const c = getCalendarInfo(a);
      $("fcRange").textContent = `${c.month}, Year ${c.year}`;
    }

    const byDay = new Map();
    for (const ev of events) {
      const d = Math.floor(ev.t);
      if (!byDay.has(d)) byDay.set(d, []);
      byDay.get(d).push(ev);
    }

    const ctx = { view: this.fcView, g0, g1, m0, m1, byDay, spans, Z, phi, todayDay: Math.floor(this.t) };
    this.fcCtx = ctx;

    const board = $("fcBoard");
    board.innerHTML = "";
    board.className = `fc-board ${this.fcView}`;

    const dow = el("div", "fc-dow-row");
    ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].forEach(n => dow.appendChild(el("span", "", n)));
    board.appendChild(dow);

    for (let w = g0; w < g1; w += 7) board.appendChild(this.buildWeekBlock(w, ctx));

    this.renderNextBar();
    this.renderSide();
  }

  buildWeekBlock(w, ctx) {
    const { view, m0, m1, byDay, spans, Z, phi, todayDay } = ctx;
    const week = el("div", "fc-week");
    const days = el("div", "fc-days");
    const MAX_CHIPS = 3;

    for (let i = 0; i < 7; i++) {
      const d = w + i;
      const cal = getCalendarInfo(d);
      const evs = byDay.get(d) || [];
      const cell = el(
        "div",
        `fc-day${d === todayDay ? " today" : ""}${d < m0 || d >= m1 ? " outside" : ""}${d === this.fcPinned ? " pinned" : ""}`
      );

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
      for (const ev of shown) list.appendChild(view === "week" ? this.buildEventCard(ev) : this.buildEventChip(ev));
      if (view === "month" && evs.length > MAX_CHIPS) {
        const more = el("button", "fc-more", `+${evs.length - MAX_CHIPS} more`);
        more.type = "button";
        more.onclick = e => {
          e.stopPropagation();
          this.fcView = "week";
          this.fcAnchor = d;
          $("viewGroup").querySelectorAll(".wii-seg").forEach(b => b.classList.toggle("active", b.dataset.view === "week"));
          this.updateForecastBoard();
        };
        list.appendChild(more);
      }
      cell.appendChild(list);

      cell.onmouseenter = () => {
        this.fcHover = d;
        this.renderSide();
      };
      cell.onclick = () => {
        this.fcPinned = d;
        this.setT(d + (this.t - Math.floor(this.t)));
        this.updateForecastBoard();
      };
      days.appendChild(cell);
    }
    week.appendChild(days);

    // Comet bars: thin, no text (the legend lives in the side panel). A diamond marks each comet's best view.
    const inWeek = spans.filter(sp => sp.d1 >= w && sp.d0 <= w + 6);
    if (inWeek.length) {
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
        bar.title = `${this.cometSpanText(sp)}. Click for best view.`;
        if (sp.peakT >= s0 && sp.peakT < s1 + 1) {
          const mk = el("i", "fc-peak");
          mk.style.left = `${((sp.peakT - s0) / (s1 - s0 + 1)) * 100}%`;
          bar.appendChild(mk);
        }
        bar.onmouseenter = () => {
          this.fcHover = Math.floor(sp.peakT >= s0 && sp.peakT < s1 + 1 ? sp.peakT : s0);
          this.renderSide();
        };
        bar.onclick = e => {
          e.stopPropagation();
          this.focusCometSpan(sp);
        };
        lanes.appendChild(bar);
      }
      week.appendChild(lanes);
    }

    return week;
  }

  cometSpanText(sp) {
    const C = COMETS[sp.key];
    const a = getCalendarInfo(sp.d0);
    const b = getCalendarInfo(sp.d1);
    const pd = Math.floor(sp.peakT);
    const p = getCalendarInfo(pd);
    return `${C.label} comet ${a.monthShort} ${a.dayOrd} – ${b.monthShort} ${b.dayOrd} • peak ${p.monthShort} ${p.dayOrd} ${hhmm12(sp.peakT - pd)}`;
  }

  buildEventChip(ev) {
    const chip = el("button", `fc-chip st-${ev.vis.state}`, `<i></i><span>${ev.title}</span>`);
    chip.type = "button";
    chip.style.setProperty("--k", EVENT_KINDS[ev.kind].color);
    chip.title = `${ev.title} • ${hhmm12(ev.t - Math.floor(ev.t))} • ${ev.sub}`;
    chip.onclick = e => {
      e.stopPropagation();
      this.focusOnEvent(ev);
    };
    return chip;
  }

  // Week-view cell card (compact; the side panel has the full detail).
  buildEventCard(ev) {
    const v = ev.vis;
    const card = el(
      "div",
      `fc-card st-${v.state}`,
      `<canvas class="fc-art" width="96" height="96"></canvas>
       <div class="fc-card-body">
         <div class="fc-card-title">${ev.title}</div>
         <div class="fc-card-meta"><span>${hhmm12(ev.t - Math.floor(ev.t))}</span>${this.visPill(v)}</div>
       </div>`
    );
    card.style.setProperty("--k", EVENT_KINDS[ev.kind].color);
    paintForecastGraphic(card.querySelector(".fc-art"), ev);
    card.onclick = e => {
      e.stopPropagation();
      this.focusOnEvent(ev);
    };
    return card;
  }

  visPill(v, long = false) {
    const word = v.state === "vis" ? "Visible" : v.state === "day" ? "Daytime" : "Below horizon";
    const arrow = v.alt >= 0 ? "↑" : "↓";
    return `<span class="fc-alt-pill ${v.state}">${long ? `${word} ` : ""}${arrow} ${Math.abs(v.alt).toFixed(0)}°${long ? ` ${compass(v.az)}` : ""}</span>`;
  }

  // ---- right-hand detail panel: the hovered day (else the pinned day, else today)
  renderSide() {
    const side = $("fcSide");
    const c = this.fcCtx;
    if (!side || !c) return;

    let day = this.fcHover;
    if (day === null) {
      if (this.fcPinned !== null && this.fcPinned >= c.g0 && this.fcPinned < c.g1) day = this.fcPinned;
      else if (c.todayDay >= c.g0 && c.todayDay < c.g1) day = c.todayDay;
      else day = c.m0;
    }

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
    for (const ev of evs) list.appendChild(this.buildEventDetail(ev));
    side.appendChild(list);

    // Comet legend: names appear here once instead of on every bar.
    if (c.spans.length) {
      side.appendChild(el("div", "side-sec", "Comets in view"));
      const leg = el("div", "side-comets");
      const sorted = [...c.spans].sort((x, y) => x.d0 - y.d0);
      for (const sp of sorted) {
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
        row.onclick = () => this.focusCometSpan(sp);
        leg.appendChild(row);
      }
      side.appendChild(leg);
    }
  }

  buildEventDetail(ev) {
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
         <div>${this.visPill(ev.vis, true)}</div>
         <div class="side-actions">
           <button class="wii-pill-btn sm aqua" data-act="sky" type="button">View in Sky</button>
           <button class="wii-pill-btn sm" data-act="copy" type="button" title="Copy /time set ${tk.totalTicks}">${tk.totalTicks}t</button>
         </div>
       </div>`
    );
    card.style.setProperty("--k", EVENT_KINDS[ev.kind].color);
    paintForecastGraphic(card.querySelector(".fc-art"), ev);

    card.querySelector('[data-act="sky"]').onclick = () => this.focusOnEvent(ev);
    const copy = card.querySelector('[data-act="copy"]');
    copy.onclick = () => {
      navigator.clipboard.writeText(`/time set ${tk.totalTicks}`);
      copy.textContent = "Copied!";
      setTimeout(() => (copy.textContent = `${tk.totalTicks}t`), 1200);
    };
    return card;
  }

  // ---- "Next" row: the next few events of the chosen kind, click to jump the calendar to one
  renderNextBar() {
    const list = $("nextList");
    if (!list) return;
    const Z = +$("z").value;
    const disc = +$("disc").value;
    const md = +$("mdisc").value;
    const from = Math.floor(this.t);
    const visibleOnly = this.fcCats.has("vis");
    const key = [this.fcNextKind, this.fcNextCount, Z, disc, md, visibleOnly].join("|");

    let c = this.fcNextCache;
    const valid = c && c.key === key && c.from <= from && (!c.list.length || c.list[0].t >= from);
    if (!valid) {
      c = {
        key,
        from,
        list: findNextEvents({ kind: this.fcNextKind, from, count: this.fcNextCount, Z, disc, md, visibleOnly })
      };
      this.fcNextCache = c;
    }

    list.innerHTML = "";
    if (!c.list.length) list.appendChild(el("span", "side-empty", "None found in the next ~20 years."));
    for (const ev of c.list) {
      const d = Math.floor(ev.t);
      const cal = getCalendarInfo(d);
      const chip = el(
        "button",
        `fc-next-chip${d === this.fcPinned ? " active" : ""}`,
        `<b>${cal.monthShort} ${cal.dayOrd}, Y${cal.year}</b><span>${ev.title}</span><em>${d - from <= 0 ? "today" : `in ${d - from}d`}</em>`
      );
      chip.type = "button";
      chip.style.setProperty("--k", ev.kind === "com" ? EVENT_KINDS.com.color : EVENT_KINDS[ev.kind].color);
      chip.title = ev.sub;
      chip.onclick = () => this.goToDay(d);
      list.appendChild(chip);
    }
    const more = el("button", "fc-next-more", "+5 more");
    more.type = "button";
    more.onclick = () => {
      this.fcNextCount += 5;
      this.renderNextBar();
    };
    list.appendChild(more);
  }

  focusCometSpan(sp) {
    const C = COMETS[sp.key];
    this.focusOnEvent({
      t: sp.peakT,
      title: sp.key === "comet" ? "Comet Peak View" : `${C.label} Comet Peak View`,
      target: { type: "comet", comet: sp.key }
    });
  }

  // ------------------------------------------------------------------------------------------ readouts
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

    const fmtSpan = d => (d >= 730 ? `${f1(d / 365.25)}y` : `${Math.round(d)}d`);
    const ctxt = Object.values(COMETS)
      .map(C => {
        const c = s.comets[C.key];
        if (!c.on) return `${C.short} dormant  returns in ${fmtSpan(cometDaysToPerihelion(C, s.t))}`;
        const ca = pa.comets[C.key];
        const cvis = cometVisibility(c.bright, su.alt);
        return `${C.short} alt ${f1(ca.alt)} az ${f1(ca.az)}  ${f1(c.dist, 2)}AU sun ${f1(c.r, 2)}AU br ${f1(c.bright, 2)} vis ${f1(cvis, 2)} Δ${f1(c.dt, 0)}d`;
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
${ptxt}
${ctxt}`;

    this.updateFindList(s, su, mo, pa);

    // Locked from Find / a sky click: keep the banner's alt/az live as time passes.
    if (this.trackedTarget && this.trackedLabel && !$("targetBanner").hidden) {
      const p = getTargetAltAz(this.trackedTarget, s, phi);
      if (p) {
        $("targetText").textContent = `${this.trackedLabel} • Alt ${f1(p.alt, 0)}° Az ${f1(p.az, 0)}° ${compass(p.az)}`;
      }
    }
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

    const solar = this.activeTab === "solar";
    let rendered = null;

    if (solar) {
      this.solarScene.render(s, dt);
    } else {
      rendered = this.skyScene.render(s, phi, {
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
      this.lastRender = rendered;
    }

    if (this.frameN++ % 4 === 0) {
      this.updateTimeReadouts();
      if (solar) this.updateSolarHud();
      else this.updateTelemetry(s, phi, rendered.su, rendered.mo, rendered.pa, disc, md);
    }
  }
}