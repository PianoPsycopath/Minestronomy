import { $ } from "./dom.js";
import { PLN, COMETS, PH } from "../config/index.js";
import { sepEq, cometVisibility, cometDaysToPerihelion } from "../core/astronomy/index.js";
import { getCalendarInfo } from "../core/calendar.js";
import { getTickInfo } from "../core/time.js";

const f1 = (x, n = 1) => x.toFixed(n);
const formatSpan = d => (d >= 730 ? `${f1(d / 365.25)}y` : `${Math.round(d)}d`);

function planetLines(s, pa, lim) {
  return Object.keys(PLN)
    .map(n => {
      const q = s.pl[n];
      const a = pa[n];
      const m = sepEq(s.moon, q);
      return `${n.slice(0, 3).toUpperCase()} alt ${f1(a.alt)} az ${f1(a.az)}  ${f1(q.dist, 2)}AU el ${f1(q.elong, 0)} br ${f1(q.bright, 2)} moon ${f1(m, 1)}°${m < lim ? " OVERLAP" : ""}`;
    })
    .join("\n");
}

function cometLines(s, su, pa) {
  return Object.values(COMETS)
    .map(C => {
      const c = s.comets[C.key];
      if (!c.on) return `${C.short} dormant  returns in ${formatSpan(cometDaysToPerihelion(C, s.t))}`;
      const ca = pa.comets[C.key];
      const cvis = cometVisibility(c.bright, su.alt);
      return `${C.short} alt ${f1(ca.alt)} az ${f1(ca.az)}  ${f1(c.dist, 2)}AU sun ${f1(c.r, 2)}AU br ${f1(c.bright, 2)} vis ${f1(cvis, 2)} Δ${f1(c.dt, 0)}d`;
    })
    .join("\n");
}

// The text panel in the settings tab.
export class TelemetryPanel {
  constructor(app) {
    this.app = app;
  }

  update(s, phi, su, mo, pa, disc, md) {
    const lim = disc / 2 + md / 2;
    const tk = getTickInfo(this.app.state.t);
    const cal = getCalendarInfo(tk.day);

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
${planetLines(s, pa, lim)}
${cometLines(s, su, pa)}`;
  }
}
