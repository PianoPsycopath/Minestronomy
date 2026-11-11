import * as THREE from "three";
import { cos, sin, clamp, lerp } from "../../core/math.js";
import {

  FOV,
  FOCUS_DISTANCE,
  FOCUS_RATE,
  DRAG_DEGREES_PER_PX,
  ZOOM_STEP,
  MIN_DISTANCE,
  MAX_DISTANCE
} from "./solarSettings.js";

// A camera that orbits a target point. Drag changes yaw and pitch. The wheel changes the distance.
export class OrbitCamera {
  constructor() {
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 5000);
    this.yaw = 35;
    this.pitch = 38;
    this.distance = FOCUS_DISTANCE.sun;
    this.distanceGoal = this.distance;
    this.target = new THREE.Vector3();
  }

  setDistanceForKind(kind) {
    this.distanceGoal = FOCUS_DISTANCE[kind];
  }

  // Moves the target and the distance toward their goals. The rate does not depend on the frame time.
  update(dt, focusPosition) {
    const k = 1 - Math.exp(-dt * FOCUS_RATE);
    this.target.lerp(focusPosition, k);
    this.distance = lerp(this.distance, this.distanceGoal, k);

    const cp = cos(this.pitch);
    this.camera.position.set(
      this.target.x + this.distance * cp * sin(this.yaw),
      this.target.y + this.distance * sin(this.pitch),
      this.target.z + this.distance * cp * cos(this.yaw)
    );
    this.camera.lookAt(this.target);
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // onClick receives the pointer position when the pointer goes up without a drag.
  bindPointer(canvas, onClick) {
    let last = null;
    let start = null;
    let moved = false;

    canvas.addEventListener("pointerdown", e => {
      last = start = [e.clientX, e.clientY];
      moved = false;
      canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener("pointermove", e => {
      if (!last) return;
      if (Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 5) moved = true;
      this.yaw = (this.yaw - (e.clientX - last[0]) * DRAG_DEGREES_PER_PX + 360) % 360;
      this.pitch = clamp(this.pitch + (e.clientY - last[1]) * DRAG_DEGREES_PER_PX, -89, 89);
      last = [e.clientX, e.clientY];
    });

    const release = e => {
      const wasClick = last && !moved && e.type === "pointerup";
      last = null;
      if (wasClick) onClick(e.clientX, e.clientY);
    };
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);

    canvas.addEventListener(
      "wheel",
      e => {
        e.preventDefault();
        this.distanceGoal = clamp(this.distanceGoal * (1 + Math.sign(e.deltaY) * ZOOM_STEP), MIN_DISTANCE, MAX_DISTANCE);
      },
      { passive: false }
    );
  }
}
