export const $ = id => document.getElementById(id);

export function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
export const compass = az => COMPASS[Math.round((((az % 360) + 360) % 360) / 45) % 8];

export const tintRgb = (t, base, gain) => `rgb(${t.map(c => Math.round(255 * (base + gain * c))).join(",")})`;
