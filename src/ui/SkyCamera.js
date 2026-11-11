import { clamp, lerp } from "../core/math.js";

const CLICK_MOVE_LIMIT_PX = 5;
const CAMERA_MOVE_SECONDS = 0.85;
const LOCK_FOV = 35;

// Drag, wheel, click, and the animated move of the sky camera.
export class SkyCamera {
  constructor(app) {
    this.app = app;
    this.bind(app.skyScene.cv);
  }

  bind(canvas) {
    const { state } = this.app;
    let drag = null;
    let downAt = null;
    let moved = false;

    canvas.onpointerdown = e => {
      drag = [e.clientX, e.clientY];
      downAt = [e.clientX, e.clientY];
      moved = false;
      state.camAnim = null;
      this.app.pickCard.hide();
      canvas.setPointerCapture(e.pointerId);
    };

    canvas.onpointerup = e => {
      const wasClick = drag && !moved;
      drag = null;
      if (wasClick) this.app.pickCard.handleSkyClick(e.clientX, e.clientY);
    };

    canvas.onpointermove = e => {
      if (!drag) return;
      if (Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > CLICK_MOVE_LIMIT_PX) moved = true;
      const k = state.fov / window.innerHeight;
      state.yaw = (state.yaw - (e.clientX - drag[0]) * k + 360) % 360;
      state.pitch = clamp(state.pitch + (e.clientY - drag[1]) * k, -85, 89);
      drag = [e.clientX, e.clientY];
    };

    canvas.onwheel = e => {
      e.preventDefault();
      state.camAnim = null;
      state.fov = clamp(state.fov * (1 + Math.sign(e.deltaY) * 0.08), 3, 100);
    };
  }

  // Starts a smooth move to the altitude and azimuth in pos. The camera takes the shortest way round in yaw.
  moveTo(pos) {
    const { state } = this.app;
    const dYaw = ((pos.az - state.yaw + 540) % 360) - 180;
    state.camAnim = {
      startYaw: state.yaw,
      targetYaw: state.yaw + dYaw,
      startPitch: state.pitch,
      targetPitch: clamp(pos.alt, -85, 89),
      startFov: state.fov,
      targetFov: LOCK_FOV,
      elapsed: 0,
      duration: CAMERA_MOVE_SECONDS
    };
  }

  update(dt) {
    const { state } = this.app;
    const anim = state.camAnim;
    if (!anim) return;

    anim.elapsed += dt;
    const u = clamp(anim.elapsed / anim.duration, 0, 1);
    const ease = 1 - Math.pow(1 - u, 3);
    state.yaw = (lerp(anim.startYaw, anim.targetYaw, ease) + 360) % 360;
    state.pitch = lerp(anim.startPitch, anim.targetPitch, ease);
    state.fov = lerp(anim.startFov, anim.targetFov, ease);
    if (u >= 1) state.camAnim = null;
  }
}
