import { clamp, cap } from "../core/math.js";
import { PLN } from "../config/constants.js";
import { calc, sepEq } from "../core/astronomy.js";

export function scan(fn, t0, t1, step, thr) {
  const out = [];
  let a = fn(t0);
  let b = fn(t0 + step);
  for (let x = t0 + step; x < t1; x += step) {
    const c = fn(x + step);
    if (b < a && b <= c && b < thr) out.push({ t: x, v: b });
    a = b;
    b = c;
  }
  return out;
}

export function findForecastEvents({ type, pn, t0, Z, disc, md }) {
  let raw = [];
  let describe;

  if (type === "lun") {
    raw = scan(x => calc(x, Z).ecl_d, t0, t0 + 1500, 0.05, 0.96);
    describe = q => ({
      title: q.v < 0.44 ? "Total Lunar Eclipse" : "Partial Lunar Eclipse",
      sub: `Umbra dist ${q.v.toFixed(2)}°`,
      target: { type: "moon" }
    });
  } else if (type === "sol") {
    raw = scan(x => calc(x, Z).sep, t0, t0 + 1500, 0.02, 1.2);
    describe = q => ({
      title: q.v < 0.5 ? "Total / Overlap Eclipse" : "Partial Solar Eclipse",
      sub: `Separation ${q.v.toFixed(2)}°`,
      target: { type: "sun" }
    });
  } else if (type === "mm") {
    raw = scan(
      x => {
        const s = calc(x, Z);
        return sepEq(s.moon, s.pl[pn]);
      },
      t0,
      t0 + 400,
      0.1,
      25
    );
    describe = q => ({
      title: `Moon & ${cap(pn)} ${q.v < disc / 2 + md / 2 ? "Occultation" : "Conjunction"}`,
      sub: `Closest sep ${q.v.toFixed(2)}°`,
      target: { type: "planet", planet: pn }
    });
  } else if (type === "opp") {
    const inner = pn === "mercury" || pn === "venus";
    raw = inner
      ? scan(x => -Math.abs(calc(x, Z).pl[pn].elong), t0, t0 + 1500, 0.5, -10)
      : scan(x => 180 - Math.abs(calc(x, Z).pl[pn].elong), t0, t0 + Math.max(900, PLN[pn].el[0] * 1.2), 0.5, 3);
    describe = q => ({
      title: inner ? `${cap(pn)} Max Elongation` : `${cap(pn)} Opposition`,
      sub: inner ? `Elongation ${(-q.v).toFixed(1)}°` : `Opposition delta ${q.v.toFixed(1)}°`,
      target: { type: "planet", planet: pn }
    });
  }

  return raw.slice(0, 14).map(q => ({
    t: q.t,
    v: q.v,
    ...describe(q)
  }));
}

export function paintForecastGraphic(canvas, type, val, pn) {
  const g = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  g.clearRect(0, 0, w, h);

  if (type === "lun") {
    const total = val < 0.44;
    const glow = g.createRadialGradient(cx, cy, 8, cx, cy, 42);
    glow.addColorStop(0, total ? "rgba(255, 80, 40, 0.45)" : "rgba(210, 225, 255, 0.25)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = glow;
    g.beginPath();
    g.arc(cx, cy, 42, 0, Math.PI * 2);
    g.fill();

    const gr = g.createRadialGradient(cx - 8, cy - 8, 4, cx, cy, 28);
    gr.addColorStop(0, total ? "#ff6442" : "#f2ece1");
    gr.addColorStop(1, total ? "#6b1207" : "#565e72");
    g.fillStyle = gr;
    g.beginPath();
    g.arc(cx, cy, 26, 0, Math.PI * 2);
    g.fill();
  } else if (type === "sol") {
    const gr = g.createRadialGradient(cx, cy, 14, cx, cy, 42);
    gr.addColorStop(0, "rgba(255, 244, 185, 0.98)");
    gr.addColorStop(0.5, "rgba(255, 185, 70, 0.45)");
    gr.addColorStop(1, "rgba(255, 140, 30, 0)");
    g.fillStyle = gr;
    g.beginPath();
    g.arc(cx, cy, 42, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = "#060d1c";
    const offset = clamp(val * 10, 0, 14);
    g.beginPath();
    g.arc(cx + offset, cy - offset * 0.35, 19, 0, Math.PI * 2);
    g.fill();
  } else if (type === "mm") {
    g.fillStyle = "#e8e4d8";
    g.beginPath();
    g.arc(cx - 10, cy + 8, 18, 0, Math.PI * 2);
    g.fill();

    const col = PLN[pn]?.col || "255,120,80";
    const pGlow = g.createRadialGradient(cx + 16, cy - 14, 2, cx + 16, cy - 14, 16);
    pGlow.addColorStop(0, `rgba(${col}, 1)`);
    pGlow.addColorStop(1, `rgba(${col}, 0)`);
    g.fillStyle = pGlow;
    g.beginPath();
    g.arc(cx + 16, cy - 14, 16, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = `rgb(${col})`;
    g.beginPath();
    g.arc(cx + 16, cy - 14, 7, 0, Math.PI * 2);
    g.fill();
  } else {
    const col = PLN[pn]?.col || "255,220,150";
    g.strokeStyle = "rgba(255,255,255,0.35)";
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(cx, cy, 34, 13, -0.3, 0, Math.PI * 2);
    g.stroke();

    g.fillStyle = `rgb(${col})`;
    g.beginPath();
    g.arc(cx, cy, 16, 0, Math.PI * 2);
    g.fill();
  }
}