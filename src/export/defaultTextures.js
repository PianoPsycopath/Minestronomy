import { cos } from "../core/math.js";

export async function canvasToPngBytes(canvas) {
  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
  return new Uint8Array(await blob.arrayBuffer());
}

export function createDefaultPlanetDotCanvas() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 28);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.4, "rgba(255,255,255,0.85)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.beginPath();
  g.arc(32, 32, 28, 0, Math.PI * 2);
  g.fill();
  return c;
}

// Atlas of 4 columns and 2 rows. Each cell is 128 pixels. Cell order matches the phase index.
export function createDefaultMoonAtlasCanvas() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d");
  const elongs = [180, 225, 270, 315, 0, 45, 90, 135];

  for (let ph = 0; ph < 8; ph++) {
    const cx = (ph % 4) * 128 + 64;
    const cy = Math.floor(ph / 4) * 128 + 64;
    const r = 46;
    const elong = elongs[ph];

    g.save();
    g.translate(cx, cy);
    g.fillStyle = "rgb(27, 31, 42)";
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.fill();

    if (ph !== 4) {
      const k = cos(elong);
      const wax = elong < 180;
      const sg = wax ? 1 : -1;
      g.fillStyle = "rgb(235, 235, 225)";
      g.beginPath();
      g.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, !wax);
      g.ellipse(0, 0, Math.abs(k) * r + 0.01, r, 0, Math.PI / 2, -Math.PI / 2, sg * k > 0);
      g.fill();
    }
    g.restore();
  }
  return c;
}
