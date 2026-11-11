import { CONJ_RADIUS } from "./settings.js";
import { PLN } from "../config/index.js";
import { clamp } from "../core/math.js";

// Draws the 96 by 96 pixel icon of an event card.
export function paintForecastGraphic(canvas, ev) {
  const g = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const val = ev.v;
  g.clearRect(0, 0, w, h);

  const glowDot = (x, y, col, r, core) => {
    const gl = g.createRadialGradient(x, y, 2, x, y, r);
    gl.addColorStop(0, `rgba(${col}, 1)`);
    gl.addColorStop(1, `rgba(${col}, 0)`);
    g.fillStyle = gl;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = `rgb(${col})`;
    g.beginPath();
    g.arc(x, y, core, 0, Math.PI * 2);
    g.fill();
  };

  if (ev.kind === "lun") {
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
  } else if (ev.kind === "sol") {
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
  } else if (ev.kind === "mm") {
    g.fillStyle = "#e8e4d8";
    g.beginPath();
    g.arc(cx - 10, cy + 8, 18, 0, Math.PI * 2);
    g.fill();
    glowDot(cx + 16, cy - 14, PLN[ev.planet]?.col || "255,120,80", 16, 7);
  } else if (ev.kind === "pp") {
    // Draw each planet with its CONJ_RADIUS circle at the true relative sky position.
    const offs = ev.offsets || [];
    const ext = Math.max(1, ...offs.map(o => Math.hypot(o.x, o.y)));
    const ppd = clamp(34 / ext, 5, 26);
    const rr = CONJ_RADIUS * ppd;
    for (const o of offs) {
      const x = cx + o.x * ppd;
      const y = cy - o.y * ppd;
      g.strokeStyle = "rgba(255,255,255,0.55)";
      g.lineWidth = 1;
      g.setLineDash([3, 3]);
      g.beginPath();
      g.arc(x, y, rr, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
      glowDot(x, y, PLN[o.planet]?.col || "255,220,150", Math.max(rr * 1.1, 6), Math.max(2.5, rr * 0.35));
    }
  } else {
    const col = PLN[ev.planet]?.col || "255,220,150";
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
