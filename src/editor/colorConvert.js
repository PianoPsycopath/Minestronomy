const channel = (value) => Math.max(0, Math.min(255, Math.round(value)));
const hex2 = (value) => channel(value).toString(16).padStart(2, "0");
const parts = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

export const tintToHex = (tint) => `#${tint.map((c) => hex2(c * 255)).join("")}`;
export const hexToTint = (hex) => parts(hex).map((c) => +(c / 255).toFixed(3));
export const rgbStringToHex = (rgb) => `#${rgb.split(",").map(hex2).join("")}`;
export const hexToRgbString = (hex) => parts(hex).join(",");