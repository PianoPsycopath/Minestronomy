import { COMPRESSION_UNIT } from "./solarSettings.js";

// Maps ecliptic positions (AU) to scene positions.
export class ScaleProjection {
  constructor() {
    this.mode = "compressed";
  }

  radial(r) {
    return this.mode === "linear" ? r : COMPRESSION_UNIT * Math.sqrt(r);
  }

  // Ecliptic axes (x, y, z) map to scene axes (x, -z, y), so ecliptic north points up.
  project(v, out) {
    const m = Math.hypot(v.x, v.y, v.z);
    if (m < 1e-9) return out.set(0, 0, 0);
    const k = this.radial(m) / m;
    return out.set(v.x * k, v.z * k, -v.y * k);
  }
}
