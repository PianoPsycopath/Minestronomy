export const DEFAULT_FOV = 70;

// State that several UI modules read and write.
export class AppState {
  constructor() {
    this.t = 0;
    this.playing = false;
    this.tickMode = false;
    this.activeTab = "sky";
    this.yaw = 180;
    this.pitch = 25;
    this.fov = DEFAULT_FOV;
    this.camAnim = null;
    this.trackedTarget = null;
    // Set when the lock comes from Find or a sky click. The banner then shows live altitude and azimuth.
    this.trackedLabel = null;
    this.lastRender = null;
  }
}
