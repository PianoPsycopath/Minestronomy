import { SkyScene } from "./scene/SkyScene.js";
import { UIController } from "./ui/UIController.js";

const canvas = document.getElementById("c");
const skyScene = new SkyScene(canvas);
const ui = new UIController(skyScene);

let last = performance.now();

function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  ui.tick(dt);
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);