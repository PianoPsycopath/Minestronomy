import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TimeState } from './timeState.js';
import { compileMolang, molangMath } from './molang.js';
import { AstronomyEngine } from './astronomy.js';
const astronomy = new AstronomyEngine();

// --- Scene Initialization ---
const container = document.getElementById('canvas-container');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// --- Dual Scene Architecture ---
const sceneSky = new THREE.Scene();
const sceneHelios = new THREE.Scene();
let activeScene = sceneSky;

// SCENE 1: Observer Sky (Bedrock Horizon)
const gridHelper = new THREE.GridHelper(50, 50, 0x8b7355, 0x4a3b2c); 
sceneSky.add(gridHelper);

// Compass Markers to solve Handedness
function createCompassLabel(text, color, position) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.font = 'Bold 80px "Cinzel", serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 70); 
  
  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, color: 0xffffff, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(6, 6, 1);
  sprite.position.copy(position);
  return sprite;
}

const compassRadius = 24;
// Standard Three.js orientation: -Z is North, +X is East
sceneSky.add(createCompassLabel('N', '#8b2313', new THREE.Vector3(0, 2, -compassRadius)));
sceneSky.add(createCompassLabel('S', '#5c7ea8', new THREE.Vector3(0, 2, compassRadius)));
sceneSky.add(createCompassLabel('E', '#d4b886', new THREE.Vector3(compassRadius, 2, 0)));
sceneSky.add(createCompassLabel('W', '#5c4e3a', new THREE.Vector3(-compassRadius, 2, 0)));
sceneSky.add(createCompassLabel('Z', '#ffffff', new THREE.Vector3(0, compassRadius, 0))); // Zenith

// SCENE 2: Heliocentric Abstract (Orrery)
sceneHelios.background = new THREE.Color(0x0a0a0c);
const heliosGrid = new THREE.PolarGridHelper(300, 16, 8, 64, 0x8b7355, 0x2a221a);
sceneHelios.add(heliosGrid);

// --- Camera Modes ---
function resetCamera(mode) {
  if (mode === 'sky') {
    camera.position.set(0, 2, 0);
    controls.target.set(0, 2, -0.01); 
    controls.enablePan = false;
    controls.enableZoom = false;
  } else {
    camera.position.set(200, 150, 200);
    controls.target.set(0, 0, 0);
    controls.enablePan = true;
    controls.enableZoom = true;
  }
  controls.update();
}
resetCamera('sky');

// --- JSON Assets ---
const rawGeoJson = {
	"format_version": "1.12.0",
	"minecraft:geometry": [{
		"bones": [
			{ "name": "sky_anchor", "pivot": [0, 0, 0] },
			{ "name": "latitude_anchor", "parent": "sky_anchor", "pivot": [0, 0, 0] },
			{ "name": "bone_skybox", "parent": "latitude_anchor", "pivot": [0, 0, 0], "rotation": [90, 0, 0] },
			{ "name": "axial_tilt", "parent": "bone_skybox", "pivot": [0, 0, 0], "rotation": [23.5, 0, 0] },
			{ "name": "bone_sun_pivot", "parent": "latitude_anchor", "pivot": [0, 0, 0], "rotation": [0, 0, 0] },
			{ "name": "bone_sun_declination", "parent": "bone_sun_pivot", "pivot": [0, 0, 0], "rotation": [0, 0, 0] },
			{ "name": "bone_sun", "parent": "bone_sun_declination", "pivot": [0, 0, 0] },
			{ "name": "bone_moon_pivot", "parent": "latitude_anchor", "pivot": [0, 0, 0] },
			{ "name": "bone_moon_declination", "parent": "bone_moon_pivot", "pivot": [0, 0, 0] },
			{ "name": "bone_moon", "parent": "bone_moon_declination", "pivot": [0, 0, 0] }
		]
	}]
};

const rawAnimJson = {
	"format_version": "1.8.0",
	"animations": {
		"animation.astrum.sky_rotation": {
			"loop": true,
			"bones": {
				"sky_anchor": { "rotation": [ "-this", "-this - query.body_y_rotation", "-this" ] },
				"latitude_anchor": { "rotation": [ "(math.clamp(query.position_2 / 63710, -1, 1) * -90)", 0, 0 ] },
				"bone_skybox": { "rotation": [ 90, 0, "(query.time_of_day * -360) + (query.day / 365.25 * -360)" ] },
				"bone_sun_pivot": { "rotation": [ 0, 0, "(query.time_of_day * -360) + ((math.sin(((query.day - 2) / 182.5) * 360) * -7.65) + (math.sin(((query.day - 12) / 365) * 360) * -9.87))" ] },
				"bone_sun_declination": { "rotation": [ "math.sin(((query.day - 80) / 365) * 360) * 23.5", 0, 0 ] },
				"bone_moon_pivot": { "rotation": [ 0, 0, "(query.time_of_day * -360) + (((query.day + query.time_of_day) / 29.53) * 360) + 180" ] },
				"bone_moon_declination": { "rotation": [ "(math.sin((((query.day - 80) / 365.25) * 360) + 180 + (((query.day + query.time_of_day) / 29.53) * 360)) * (23.5 + (math.cos(((query.day + query.time_of_day) / 6793.5) * 360) * 5.14))) + (query.position_2 / 63710 * 2.9)", 0, 0 ] }
			}
		}
	}
};

const rawEmitterJson = {
  "format_version": "1.10.0",
  "animation_controllers": {
    "controller.animation.astrum.stars": {
      "initial_state": "stars_only",
      "states": {
        "stars_only": {
          "transitions": [ { "constellations": "query.is_item_name_any('slot.weapon.mainhand', 'minecraft:spyglass')" } ]
        },
        "constellations": {
          "transitions": [ { "stars_only": "!query.is_item_name_any('slot.weapon.mainhand', 'minecraft:spyglass')" } ]
        }
      }
    }
  }
};

// --- Geometry Construction ---
const boneMap = new Map();
const rootGroup = new THREE.Group();

rawGeoJson["minecraft:geometry"][0].bones.forEach(b => {
    const group = new THREE.Group();
    group.name = b.name;
    const baseRot = b.rotation || [0, 0, 0];
    group.userData.baseRotation = [ ...baseRot ];
    group.rotation.set(
        THREE.MathUtils.degToRad(baseRot[0]),
        THREE.MathUtils.degToRad(baseRot[1]),
        THREE.MathUtils.degToRad(baseRot[2])
    );
    boneMap.set(b.name, group);
});

rawGeoJson["minecraft:geometry"][0].bones.forEach(b => {
    if (b.parent && boneMap.has(b.parent)) boneMap.get(b.parent).add(boneMap.get(b.name));
    else rootGroup.add(boneMap.get(b.name));
});
sceneSky.add(rootGroup);

// --- Material Setup ---
const texLoader = new THREE.TextureLoader();
const faces = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
const createSkyMats = (prefix) => faces.map(f => new THREE.MeshBasicMaterial({ 
    map: texLoader.load(`/PACK/textures/SKY/${prefix}_${f}.png`), 
    side: THREE.BackSide, 
    depthWrite: false, transparent: true 
}));
const matStarsOnly = createSkyMats('normal');
const matConstellations = createSkyMats('const');

const skyboxMesh = new THREE.Mesh(new THREE.BoxGeometry(450, 450, 450), matStarsOnly);
if (boneMap.has('bone_skybox')) boneMap.get('bone_skybox').add(skyboxMesh);

// Fix: Bedrock Particles Emit UP (+Y Local Axis) at fixed distance
const sunMat = new THREE.SpriteMaterial({ map: texLoader.load('/PACK/textures/environment/sunAstrum.png'), color: 0xffffff });
const sunSprite = new THREE.Sprite(sunMat);
sunSprite.scale.set(40, 40, 1);
sunSprite.position.set(0, 250, 0); 
if (boneMap.has('bone_sun')) boneMap.get('bone_sun').add(sunSprite);

const moonMat = new THREE.SpriteMaterial({ map: texLoader.load('/PACK/textures/environment/moon_phasesASTRUM.png'), color: 0xffffff });
const moonSprite = new THREE.Sprite(moonMat);
moonSprite.scale.set(30, 30, 1);
moonSprite.position.set(0, 250, 0);
if (boneMap.has('bone_moon')) boneMap.get('bone_moon').add(moonSprite);

// --- Precompile Animations & Controllers ---
const compiledAnims = {};
const animData = rawAnimJson.animations['animation.astrum.sky_rotation'].bones;
for (const bone in animData) {
    compiledAnims[bone] = animData[bone].rotation.map(expr => compileMolang(expr));
}

let activeControllerState = rawEmitterJson.animation_controllers['controller.animation.astrum.stars'].initial_state;
const controllerStates = rawEmitterJson.animation_controllers['controller.animation.astrum.stars'].states;

for (const stateName in controllerStates) {
    const transitions = controllerStates[stateName].transitions || [];
    controllerStates[stateName].compiledTransitions = transitions.map(t => {
        const targetState = Object.keys(t)[0];
        return { target: targetState, eval: compileMolang(t[targetState]) };
    });
}

// --- Heliocentric Mock ---
const orreryGroup = new THREE.Group();
const heliosPlanetMeshes = new Map();
sceneHelios.add(orreryGroup);

const defaultBodies = [
  { id: 'sun', name: 'Sol', type: 'star' },
  { id: 'earth', name: 'Terra', type: 'planet' },
  { id: 'moon', name: 'Luna', type: 'moon' }
];

let celestialBodies;
try {
  celestialBodies = JSON.parse(localStorage.getItem('minestronomy-bodies'));
  // Fix: Reset to default if LocalStorage is corrupted or user deleted all bodies
  if (!Array.isArray(celestialBodies) || celestialBodies.length === 0) {
    celestialBodies = defaultBodies;
  }
} catch(e) {
  celestialBodies = defaultBodies;
}

function renderOrrery() {
    orreryGroup.clear();
    heliosPlanetMeshes.clear();
    
    // Sun at center
    const sun = new THREE.Sprite(sunMat);
    sun.scale.set(40, 40, 1);
    orreryGroup.add(sun);
    
    celestialBodies.forEach(body => {
        if (body.id === 'sun' || body.id === 'moon') return;
        
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(4, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0x8b7355, wireframe: true })
        );
        orreryGroup.add(mesh);
        heliosPlanetMeshes.set(body.id, mesh);

        // Visual orbital ring placeholder
        const distance = (body.id === 'earth') ? 100 : (body.id === 'mercury' ? 38 : (body.id === 'venus' ? 72 : 152));
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(distance - 0.5, distance + 0.5, 64),
            new THREE.MeshBasicMaterial({ color: 0x5c4e3a, side: THREE.DoubleSide })
        );
        ring.rotation.x = Math.PI / 2;
        orreryGroup.add(ring);
    });
}

function saveBodies() {
  localStorage.setItem('minestronomy-bodies', JSON.stringify(celestialBodies));
  renderBodyList();
  renderOrrery();
}

function renderBodyList() {
  const list = document.getElementById('system-tree');
  if(!list) return;
  list.innerHTML = '';
  celestialBodies.forEach(body => {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `<span>${body.name}</span><div><span class="tag">${body.type.toUpperCase()}</span><button class="icon-btn delete-btn" data-id="${body.id}">&times;</button></div>`;
    list.appendChild(div);
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      celestialBodies = celestialBodies.filter(b => b.id !== e.target.dataset.id);
      saveBodies();
    });
  });
}

document.getElementById('btn-add-body').addEventListener('click', () => {
  const name = prompt("Enter Celestial Body Name:");
  if (name) {
    celestialBodies.push({ id: name.toLowerCase(), name, type: 'planet' });
    saveBodies();
  }
});

renderBodyList();
renderOrrery();

// --- Time & State Management ---
const timeState = new TimeState();
const cmdOutput = document.getElementById('cmd-output');
const segmentDisplay = document.getElementById('segment-display');
const clockHand = document.getElementById('clock-hand');

function updateUI() {
  cmdOutput.textContent = timeState.getMinecraftCommand();
  segmentDisplay.innerHTML = timeState.getFormattedTime().replace(' · ', '<br>');
  document.getElementById('tick-counter').textContent = `TOTAL TICKS: ${timeState.getTicks().toLocaleString()}`;
  sceneSky.background = timeState.getSkyColor();

  const rotationDeg = (timeState.timeOfDay + 0.5) * 360;
  clockHand.style.transform = `translate(-50%, -100%) rotate(${rotationDeg}deg)`;
  
  document.getElementById('val-latitude').textContent = timeState.latitude.toFixed(1) + '°';
  document.getElementById('val-yaw').textContent = timeState.bodyYaw.toFixed(1) + '°';
}

// UI Listeners
document.getElementById('lat-slider').addEventListener('input', (e) => { timeState.latitude = parseFloat(e.target.value); updateUI(); });
document.getElementById('yaw-slider').addEventListener('input', (e) => { timeState.bodyYaw = parseFloat(e.target.value); updateUI(); });
document.getElementById('btn-spyglass').addEventListener('click', (e) => {
    timeState.holdingSpyglass = !timeState.holdingSpyglass;
    e.target.classList.toggle('active', timeState.holdingSpyglass);
    e.target.textContent = timeState.holdingSpyglass ? 'SPYGLASS: ACTIVE' : 'SPYGLASS: STOWED';
});

// Clock Dragging
let isDraggingClock = false;
const clockElement = document.getElementById('radial-clock');
function updateTimeFromEvent(e) {
    const rect = clockElement.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.touches ? e.touches[0].clientX : e.clientX) - cx;
    const dy = (e.touches ? e.touches[0].clientY : e.clientY) - cy;
    
    let degrees = (Math.atan2(dy, dx) * 180 / Math.PI) + 90;
    if (degrees < 0) degrees += 360;
    let timeOfDay = (degrees / 360) + 0.5;
    if (timeOfDay >= 1.0) timeOfDay -= 1.0;

    timeState.timeOfDay = timeOfDay;
    updateUI();
}
clockElement.addEventListener('mousedown', (e) => { if (e.target.tagName !== 'BUTTON') { isDraggingClock = true; updateTimeFromEvent(e); }});
window.addEventListener('mousemove', (e) => { if (isDraggingClock) updateTimeFromEvent(e); });
window.addEventListener('mouseup', () => isDraggingClock = false);

document.querySelectorAll('.clock-btn').forEach(btn => {
  btn.addEventListener('mousedown', e => e.stopPropagation()); 
  btn.addEventListener('click', () => { timeState.timeOfDay = parseFloat(btn.dataset.time); updateUI(); });
});

document.getElementById('btn-time-fwd').addEventListener('click', () => timeState.speedMultiplier = Math.min(timeState.speedMultiplier * 2, 64));
document.getElementById('btn-time-rev').addEventListener('click', () => timeState.speedMultiplier = Math.max(timeState.speedMultiplier / 2, -64));
const btnPlay = document.getElementById('btn-time-play');
btnPlay.addEventListener('click', () => {
  timeState.isPlaying = !timeState.isPlaying;
  btnPlay.textContent = timeState.isPlaying ? 'PAUSE' : 'PLAY';
  btnPlay.classList.toggle('active', timeState.isPlaying);
});


document.getElementById('btn-mode-sky').addEventListener('click', (e) => { activeScene = sceneSky; document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active')); e.target.classList.add('active'); resetCamera('sky'); });
document.getElementById('btn-mode-helios').addEventListener('click', (e) => { activeScene = sceneHelios; document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active')); e.target.classList.add('active'); resetCamera('helios'); });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Main Evaluator Loop ---
let lastTime = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const delta = (now - lastTime) / 1000;
  lastTime = now;

  controls.update();

  if (timeState.isPlaying) {
    timeState.timeOfDay += delta * 0.05 * timeState.speedMultiplier;
    if (timeState.timeOfDay >= 1.0) { timeState.timeOfDay -= 1.0; timeState.daysPassed += 1; } 
    else if (timeState.timeOfDay < 0.0) { timeState.timeOfDay += 1.0; timeState.daysPassed -= 1; }
    updateUI();
  }

  // 1. Build Bedrock Query State
  const query = {
      time_of_day: timeState.timeOfDay,
      day: timeState.daysPassed,
      body_y_rotation: timeState.bodyYaw,
      position_2: (timeState.latitude / 90) * 63710, 
      is_item_name_any: (slot, item) => timeState.holdingSpyglass && item === 'minecraft:spyglass'
  };

  // 2. Evaluate Controller State Machine (Spyglass toggle)
  if (activeScene === sceneSky) {
    const currentStateData = controllerStates[activeControllerState];
    for (const transition of currentStateData.compiledTransitions) {
        if (transition.eval(molangMath, query, 0)) {
            activeControllerState = transition.target;
            skyboxMesh.material = activeControllerState === 'constellations' ? matConstellations : matStarsOnly;
            break; 
        }
    }

    // 3. Evaluate Legacy Animations (For Skybox, Anchors, and Latitude ONLY)
    const bonesToEvaluate = ['sky_anchor', 'latitude_anchor', 'bone_skybox', 'axial_tilt'];
    for (const boneName of bonesToEvaluate) {
        const bone = boneMap.get(boneName);
        if (bone && compiledAnims[boneName]) {
            const baseRot = bone.userData.baseRotation;
            const funcs = compiledAnims[boneName];
            const rx = baseRot[0] + funcs[0](molangMath, query, 0);
            const ry = baseRot[1] + funcs[1](molangMath, query, 0);
            const rz = baseRot[2] + funcs[2](molangMath, query, 0);

            bone.rotation.set(
                THREE.MathUtils.degToRad(rx),
                THREE.MathUtils.degToRad(-ry),
                THREE.MathUtils.degToRad(-rz),
                'ZYX' 
            );
        }
    }

    // 4. INJECT ASTRONOMY ENGINE (Replaces Ptolemaic Molang)
    const sunAngles = astronomy.getApparentGeocentricAngles('sun', timeState.daysPassed, timeState.timeOfDay);
    if (boneMap.has('bone_sun_pivot')) {
        boneMap.get('bone_sun_pivot').rotation.set(0, THREE.MathUtils.degToRad(-sunAngles.pivotY), 0, 'ZYX');
    }
    if (boneMap.has('bone_sun_declination')) {
        boneMap.get('bone_sun_declination').rotation.set(THREE.MathUtils.degToRad(sunAngles.declinationX), 0, 0, 'ZYX');
    }

    const moonAngles = astronomy.getApparentGeocentricAngles('moon', timeState.daysPassed, timeState.timeOfDay);
    if (boneMap.has('bone_moon_pivot')) {
        boneMap.get('bone_moon_pivot').rotation.set(0, THREE.MathUtils.degToRad(-moonAngles.pivotY), 0, 'ZYX');
    }
    if (boneMap.has('bone_moon_declination')) {
        boneMap.get('bone_moon_declination').rotation.set(THREE.MathUtils.degToRad(moonAngles.declinationX), 0, 0, 'ZYX');
    }
  }

  // 5. Update Orrery Positions
  if (activeScene === sceneHelios) {
      heliosPlanetMeshes.forEach((mesh, id) => {
          const coords = astronomy.getHeliocentricCoords(id, timeState.daysPassed);
          // Scale up AU for visual purposes
          mesh.position.set(coords.x * 100, coords.z * 100, coords.y * 100); 
      });
  }

  renderer.render(activeScene, camera);
}

updateUI();
animate(performance.now());