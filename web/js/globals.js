// ═══════════════════════════════════════════════════════
//  GLOBALS & STATE
// ═══════════════════════════════════════════════════════
const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const faceNames = ["px", "nx", "py", "ny", "pz", "nz"];
const APP_DEBUG = true;

let scene, camera, renderer, controls, mainSunLight, ambientLight;

// Skybox variables
let skyAnchor, latitudeAnchor, boneSkybox, axialTiltGroup;
let boneSunPivot, boneSunDeclination, skyboxSunMesh;
let boneMoonPivot, boneMoonDeclination, skyboxMoonMesh;
let groundMesh, analemmaLine;
let analemmaCache = { target: null, year: null, lat: null, tod: null, day: null, moonSid: null, moonInc: null, targetInc: null, targetPhase: null };

// Application State
let isPlaying = false, showConstellations = false;
let lastTime = performance.now();
let renderMode = 'skybox'; // 'skybox' | 'celestial'
let camTransition = null;

// Celestial scene objects
let celestialRoot = null;
let sunGroup, sunMesh;
let earthGroup, earthTiltGroup, earthMesh, orbitRing;
let selectedCelestial = null;

// Constants & Config
const SUN_ORBIT_R = 80;   
const EARTH_SIZE  = 5;
const CELESTIAL_PARTICLE_SCALE = 2.5; 
const sunCfg = { size: 80, analemmaOn: true, analemmaStrength: 1.0 };
const earthCfg = { tilt: 23.5, size: 5 };
const moonCfg = { sid: 29.53, inc: 23.5, size: 80 }; 
const ptolemyBodies = {
    sun: { 
        name: "SUN", icon: "☀", type: "center", 
        deferentR: 120, deferentPeriod: 365.25, 
        epicycleR: 0, epicyclePeriod: 1,
        inclination: 0, startingPhaseAngle: 0,
        size: 16, mesh: null, group: null, epiRing: null  
    },
    moon: { 
        name: "MOON", icon: "🌙", type: "orbiting", 
        deferentR: 35, deferentPeriod: 27.32, 
        epicycleR: 0, epicyclePeriod: 1, 
        inclination: 5.14, startingPhaseAngle: 0,
        size: 5, mesh: null, group: null, epiRing: null 
    },
    mars: { 
        name: "MARS", icon: "🔴", type: "epicycle", 
        deferentR: 180, deferentPeriod: 687, 
        epicycleR: 45, epicyclePeriod: 365.25,
        inclination: 1.85, startingPhaseAngle: 0,
        size: 6, mesh: null, group: null, epiRing: null 
    }
};

let skyboxPlanetMeshes = {};
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function debugLog(message, data = null) {
    if (!APP_DEBUG) return;
    console.log(`[DEBUG] ${message}`, data || '');
}