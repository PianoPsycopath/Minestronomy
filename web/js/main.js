// ═══════════════════════════════════════════════════════
//  INIT, MAIN LOOP & EEL BINDINGS
// ═══════════════════════════════════════════════════════

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020205);

    mainSunLight = new THREE.DirectionalLight(0xfff8e0, 1.2);
    mainSunLight.position.set(0, 100, 0);
    scene.add(mainSunLight);

    ambientLight = new THREE.AmbientLight(0x111822, 1.0);
    scene.add(ambientLight);

    camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.01, 3000);
    camera.position.set(0, 1.8, 0.001);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.8, 0);
    controls.minDistance = 0.01;
    controls.maxDistance = 0.1;
    controls.enablePan = false;

    groundMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2000, 2000),
        new THREE.MeshBasicMaterial({ color: 0x080808, side: THREE.DoubleSide })
    );
    groundMesh.rotation.x = -Math.PI / 2;
    scene.add(groundMesh);

    skyAnchor = new THREE.Group();
    skyAnchor.position.y = 1.8;
    scene.add(skyAnchor);

    latitudeAnchor = new THREE.Group();
    skyAnchor.add(latitudeAnchor);

    boneSkybox = new THREE.Group();
    latitudeAnchor.add(boneSkybox);
    boneSkybox.rotation.order = 'ZXY';
    axialTiltGroup = new THREE.Group();
    axialTiltGroup.rotation.x = D2R * 23.5;
    boneSkybox.add(axialTiltGroup);

    boneSunPivot = new THREE.Group();
    latitudeAnchor.add(boneSunPivot);
    boneSunDeclination = new THREE.Group();
    boneSunPivot.add(boneSunDeclination);

    skyboxSunMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(sunCfg.size / 4, sunCfg.size / 4),
        new THREE.MeshBasicMaterial({ color: 0xffffee, transparent: true, opacity: 1.0, side: THREE.DoubleSide, depthWrite: false })
    );
    skyboxSunMesh.position.set(0, -25, 0); 
    boneSunDeclination.add(skyboxSunMesh);

    boneMoonPivot = new THREE.Group();
    latitudeAnchor.add(boneMoonPivot);
    boneMoonDeclination = new THREE.Group();
    boneMoonPivot.add(boneMoonDeclination);

    skyboxMoonMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(12, 12),
        new THREE.MeshBasicMaterial({ color: 0xddddff, transparent: true, opacity: 1.0, side: THREE.DoubleSide, depthWrite: false })
    );
    skyboxMoonMesh.position.set(0, -25, 0);
    boneMoonDeclination.add(skyboxMoonMesh);

    createSkyQuads();
    createCelestialSystem();
    rebuildAnalemma(); 
    
    setupBottomControls();
    setupRaycasting();
    setupTextureUpload();
    animate();
}

function easeInOut(t) { return t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t; }

function animate() {
    requestAnimationFrame(animate);
    const now   = performance.now();
    const delta = (now - lastTime) / 1000;
    lastTime = now;

    if (isPlaying) {
        let tod   = parseFloat(document.getElementById('tod').value);
        let day   = parseFloat(document.getElementById('day').value);
        const spd = parseFloat(document.getElementById('speed').value);
        tod += (delta / 60) * spd;
        if (tod >= 1.0) { tod -= 1.0; day = (day % 365) + 1; document.getElementById('day').value = day; }
        document.getElementById('tod').value = tod;
    }

    if (camTransition) {
        camTransition.t = Math.min(camTransition.t + delta / camTransition.dur, 1);
        const ease = easeInOut(camTransition.t);
        camera.position.lerpVectors(camTransition.startPos, camTransition.endPos, ease);
        controls.target.lerpVectors(camTransition.startTarget, camTransition.endTarget, ease);
        if (camTransition.t >= 1) { camTransition = null; controls.enabled = true; }
    }

    updateMoLang();
    controls.update();
    renderer.render(scene, camera);
    updateWorldLabels();
    updateDebugOverlay();
}

// Eel Bindings & Control logic
document.getElementById('magLimit').addEventListener('input', function() {
    document.getElementById('magv').textContent = parseFloat(this.value).toFixed(1);
});

async function generateTextures() {
    const mag = parseFloat(document.getElementById('magLimit').value);
    const btn = document.getElementById('genBtn');
    btn.innerText = 'GENERATING…'; btn.disabled = true;
    await eel.generate_skybox(mag)();
    btn.innerText = 'RENDER STARS'; btn.disabled = false;
    reloadTextures();
}

function toggleConstellations() {
    showConstellations = !showConstellations;
    const btn = document.getElementById('constBtn');
    btn.innerText  = showConstellations ? 'CONSTELLATIONS: ON' : 'CONSTELLATIONS: OFF';
    btn.className  = showConstellations ? 'bottom-btn on' : 'bottom-btn';
    reloadTextures();
}

function reloadTextures() {
    const loader = new THREE.TextureLoader();
    loader.setPath('previews/');
    const prefix = showConstellations ? 'const_' : 'normal_';
    const bust = `?v=${Date.now()}`;
    
    axialTiltGroup.children.forEach((plane, i) => {
        if (!faceNames[i]) return;
        loader.load(`${prefix}${faceNames[i]}.png${bust}`, tex => {
            if(plane.material) {
                tex.magFilter = THREE.NearestFilter;
                tex.minFilter = THREE.NearestFilter;
                plane.material.map = tex;
                plane.material.needsUpdate = true;
            }
        });
    });
}

async function runExport() {
    debugLog("Initiating export process...");
    let start = performance.now();

    const name = document.getElementById('packName').value.replace(/\s+/g, '_');
    const btn  = document.getElementById('exportBtn');
    btn.innerText = 'EXPORTING…'; btn.disabled = true;
    
    const ok = await eel.export_resource_pack(name)();
    
    let duration = (performance.now() - start).toFixed(2);
    debugLog(`Export completed in ${duration}ms`, { success: ok });

    if (ok) {
        btn.innerText = 'EXPORT COMPLETE!';
        setTimeout(() => { btn.innerText = 'EXPORT PACK'; btn.disabled = false; }, 2200);
    }
}

function setupBottomControls() {
    const playBtn = document.getElementById('playBtn');
    playBtn.onclick = () => {
        isPlaying = !isPlaying;
        playBtn.textContent = isPlaying ? 'AUTO PLAY: ON' : 'AUTO PLAY: OFF';
        playBtn.className   = isPlaying ? 'bottom-btn active' : 'bottom-btn';
        lastTime = performance.now();
    };

    document.getElementById('new-planet-defr').addEventListener('input', function() {
        document.getElementById('new-defr-v').textContent = this.value;
    });
    document.getElementById('new-planet-defp').addEventListener('input', function() {
        document.getElementById('new-defp-v').textContent = this.value;
    });
    document.getElementById('new-planet-epir').addEventListener('input', function() {
        document.getElementById('new-epir-v').textContent = this.value;
    });
    document.getElementById('new-planet-size').addEventListener('input', function() {
        document.getElementById('new-size-v').textContent = this.value;
    });
}

function updateDebugOverlay() {
    if (!APP_DEBUG) return;
    const debugPos = document.getElementById('debug-pos');
    if (debugPos) {
        debugPos.innerText = `Cam: ${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}`;
    }
}

window.addEventListener('keydown', (e) => {
    if (e.key === 'F2') {
        const overlay = document.getElementById('debug-overlay');
        if (overlay) overlay.style.display = overlay.style.display === 'none' ? 'block' : 'none';
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// START
init();