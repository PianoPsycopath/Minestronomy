import { ParticleLoader } from "./particles/ParticleLoader.js";
import { SkyScene } from "./scene/sky/SkyScene.js";
import { SolarSystemScene } from "./scene/solar/SolarSystemScene.js";
import { UIController } from "./ui/UIController.js";

const MAX_FRAME_SECONDS = 0.1;

async function bootstrap() {
  const particleLoader = new ParticleLoader();
  await particleLoader.loadAll();

  const skyScene = new SkyScene(document.getElementById("c"), particleLoader);
  const solarScene = new SolarSystemScene(document.getElementById("solarCanvas"));
  const ui = new UIController(skyScene, particleLoader, solarScene);

  let last = performance.now();
  function loop(now) {
    const dt = Math.min((now - last) / 1000, MAX_FRAME_SECONDS);
    last = now;
    ui.tick(dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

bootstrap();
