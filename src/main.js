import { ParticleLoader } from "./core/ParticleLoader.js";
import { SkyScene } from "./scene/SkyScene.js";
import { SolarSystemScene } from "./scene/SolarSystemScene.js";
import { UIController } from "./ui/UIController.js";

async function bootstrap() {
  const particleLoader = new ParticleLoader();
  await particleLoader.loadAll();

  const canvas = document.getElementById("c");
  const skyScene = new SkyScene(canvas, particleLoader);
  const solarScene = new SolarSystemScene(document.getElementById("solarCanvas"));
  const ui = new UIController(skyScene, particleLoader, solarScene);

  let last = performance.now();

  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    ui.tick(dt);
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

bootstrap();