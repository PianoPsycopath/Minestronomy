export const D = Math.PI / 180;
export const RD = 180 / Math.PI;

export const sin = a => Math.sin(a * D);
export const cos = a => Math.cos(a * D);
export const atan2 = (y, x) => Math.atan2(y, x) * RD;
export const asin = x => Math.asin(Math.max(-1, Math.min(1, x))) * RD;
export const acos = x => Math.acos(Math.max(-1, Math.min(1, x))) * RD;
export const wrap = a => atan2(sin(a), cos(a));
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, f) => a + (b - a) * f;
export const ang = (deg, r) => 2 * r * Math.tan(deg * D / 2);

export function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function cap(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}