// ═══════════════════════════════════════════════════════
//  SKYBOX QUADS
// ═══════════════════════════════════════════════════════
function createSkyQuads() {
    const size = 512, dist = 255.8;
    const configs = [
        { pos: [ dist, 0, 0], rot: [0, -Math.PI/2, 0] },
        { pos: [-dist, 0, 0], rot: [0,  Math.PI/2, 0] },
        { pos: [0,  dist, 0], rot: [ Math.PI/2, 0, 0] },
        { pos: [0, -dist, 0], rot: [-Math.PI/2, 0, 0] },
        { pos: [0, 0,  dist], rot: [0, Math.PI, 0] },
        { pos: [0, 0, -dist], rot: [0, 0, 0] }
    ];
    configs.forEach(cfg => {
        const mat = new THREE.MeshBasicMaterial({
            side: THREE.DoubleSide, transparent: true, depthWrite: false, opacity: 0
        });
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
        plane.position.set(...cfg.pos);
        plane.rotation.set(...cfg.rot);
        axialTiltGroup.add(plane);
    });
    reloadTextures();
}

function makeParticleMaterial(color) {
    return new THREE.MeshBasicMaterial({
        color, transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: 1.0
    });
}

// ═══════════════════════════════════════════════════════
//  CELESTIAL SYSTEM
// ═══════════════════════════════════════════════════════
function createCelestialSystem() {
    celestialRoot = new THREE.Group();
    celestialRoot.visible = false;
    scene.add(celestialRoot);

    // Earth Group
    earthGroup = new THREE.Group();
    celestialRoot.add(earthGroup);

    earthTiltGroup = new THREE.Group();
    earthTiltGroup.rotation.z = D2R * earthCfg.tilt;
    earthGroup.add(earthTiltGroup);

    const E = EARTH_SIZE;
    const earthGeo = new THREE.BoxGeometry(E * 2, E * 2, E * 2);
    const dirtColor    = new THREE.Color(0x7B5D3D);
    const grassColor   = new THREE.Color(0x3D8B37);
    const bedrockColor = new THREE.Color(0x1F1F1F);

    earthMesh = new THREE.Mesh(earthGeo, [
        new THREE.MeshPhongMaterial({ color: dirtColor, emissive: 0x080400 }),
        new THREE.MeshPhongMaterial({ color: dirtColor, emissive: 0x080400 }),
        new THREE.MeshPhongMaterial({ color: grassColor, emissive: 0x020800 }),
        new THREE.MeshPhongMaterial({ color: bedrockColor, emissive: 0x000000 }),
        new THREE.MeshPhongMaterial({ color: dirtColor, emissive: 0x080400 }),
        new THREE.MeshPhongMaterial({ color: dirtColor, emissive: 0x080400 }),
    ]);
    earthTiltGroup.add(earthMesh);

    // Generate Ptolemaic Bodies
    Object.keys(ptolemyBodies).forEach(id => {
        const body = ptolemyBodies[id];

        body.inclinationGroup = new THREE.Group();
        body.inclinationGroup.rotation.x = D2R * body.inclination;
        celestialRoot.add(body.inclinationGroup);

        body.group = new THREE.Group();
        body.inclinationGroup.add(body.group);

        const defPts = [];
        for (let i = 0; i <= 128; i++) {
            const a = (i / 128) * Math.PI * 2;
            defPts.push(new THREE.Vector3(Math.sin(a) * body.deferentR, 0, Math.cos(a) * body.deferentR));
        }
        const defRing = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(defPts),
            new THREE.LineBasicMaterial({ color: 0x003800, transparent: true, opacity: 0.6 })
        );
        defRing.userData.deferentOf = id;
        body.inclinationGroup.add(defRing);

        if (body.epicycleR > 0) {
            const epiPts = [];
            for (let i = 0; i <= 64; i++) {
                const a = (i / 64) * Math.PI * 2;
                epiPts.push(new THREE.Vector3(Math.sin(a) * body.epicycleR, 0, Math.cos(a) * body.epicycleR));
            }
            body.epiRing = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(epiPts),
                new THREE.LineBasicMaterial({ color: 0x550000, transparent: true, opacity: 0.8 })
            );
            body.inclinationGroup.add(body.epiRing);
        }

        const baseColor = id === 'mars' ? 0xff5533 : (id === 'moon' ? 0xddddff : 0xffffee);
        body.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), makeParticleMaterial(baseColor));
        body.mesh.name = id;
        body.mesh.userData = { id };
        body.mesh.renderOrder = 1;

        if (id === 'sun') sunMesh = body.mesh; 
        else if (id === 'moon') moonMesh = body.mesh; 
        body.group.add(body.mesh);

        if (id !== 'sun' && id !== 'moon') {
            const skyColor = id === 'mars' ? 0xff5533 : 0x88ddff;
            const skyMesh = new THREE.Mesh(
                new THREE.PlaneGeometry(8, 8),
                new THREE.MeshBasicMaterial({ color: skyColor, transparent: true, opacity: 1.0, side: THREE.DoubleSide, depthWrite: false })
            );
            skyMesh.position.set(0, -25, 0);
            
            const dailyPivot = new THREE.Group();
            const inclinationGroup = new THREE.Group(); 
            const deferentGroup = new THREE.Group();
            const epicycleGroup = new THREE.Group();

            dailyPivot.add(inclinationGroup);
            inclinationGroup.add(deferentGroup);
            deferentGroup.add(epicycleGroup);
            epicycleGroup.add(skyMesh);

            skyMesh.position.set(0, -(body.epicycleR + 25), 0);
            latitudeAnchor.add(dailyPivot);

            skyboxPlanetMeshes[id] = { mesh: skyMesh, dailyPivot, inclinationGroup, deferentGroup, epicycleGroup };
        }
    });

    generateCelestialListUI();
}

// ═══════════════════════════════════════════════════════
//  ANALEMMA & MATH
// ═══════════════════════════════════════════════════════
function computeSunWorldPosition(day, tod, lat, year) {
    const eot = sunCfg.analemmaStrength * (
        Math.sin(D2R * (((day - 2) / (year / 2)) * 360)) * -7.65
        + Math.sin(D2R * (((day - 12) / year) * 360)) * -9.87
    );
    const dec = Math.sin(D2R * (((day - 80) / year) * 360)) * 23.5;

    const sunPivotEuler = new THREE.Euler(0, 0, D2R * ((tod * -360) + eot), 'XYZ');
    const sunDeclEuler  = new THREE.Euler(D2R * dec, 0, 0, 'XYZ');

    const pos = new THREE.Vector3(0, -250, 0);
    pos.applyEuler(sunDeclEuler);
    pos.applyEuler(sunPivotEuler);
    return pos;
}

function computeMoonWorldPosition(day, tod, lat, year, moonSid, moonInc) {
    const moonPiv = (tod * -360) + (((day + tod) / moonSid) * 360) + 180;
    const moonDec = Math.sin(D2R * ((((day - 80) / year) * 360) + 180 + (((day + tod) / moonSid) * 360))) * (moonInc + Math.cos(D2R * (((day + tod) / 6793.5) * 360)) * 5.14);

    const moonPivotEuler = new THREE.Euler(0, 0, D2R * moonPiv, 'XYZ');
    const moonDeclEuler = new THREE.Euler(D2R * moonDec, 0, 0, 'XYZ');

    const pos = new THREE.Vector3(0, -250, 0);
    pos.applyEuler(moonDeclEuler);
    pos.applyEuler(moonPivotEuler);
    return pos;
}

function computePlanetSkyPosition(id, day, tod, lat, year) {
    const body = ptolemyBodies[id];
    if (!body) return new THREE.Vector3(0, -250, 0);

    const inc        = D2R * body.inclination;
    const defAngle   = D2R * ((day / body.deferentPeriod) * 360 + body.startingPhaseAngle);
    const epiAngle   = D2R * ((day / body.epicyclePeriod) * 360 + body.startingPhaseAngle);
    const dailyAngle = D2R * (tod * -360);

    const pos = new THREE.Vector3(0, -(body.epicycleR + 25), 0);
    pos.applyEuler(new THREE.Euler(0, 0, epiAngle));
    pos.y -= body.deferentR;
    pos.applyEuler(new THREE.Euler(0, 0, defAngle));
    pos.applyEuler(new THREE.Euler(inc, 0, 0));
    pos.applyEuler(new THREE.Euler(0, 0, dailyAngle));
    pos.normalize().multiplyScalar(250);
    return pos;
}

function rebuildAnalemma() {
    if (analemmaLine) { latitudeAnchor.remove(analemmaLine); analemmaLine = null; }
    latitudeAnchor.children.filter(c => c.userData && c.userData.isOrbitalTrace).forEach(c => latitudeAnchor.remove(c));

    if (renderMode !== 'skybox') return;
    if (!sunCfg.analemmaOn) return;

    const target = selectedCelestial;
    if (!target || !ptolemyBodies[target]) return;
    if (target === 'sun' && !sunCfg.analemmaOn) return;

    const year = parseFloat(document.getElementById('year').value);
    const lat = parseFloat(document.getElementById('lat').value);
    const tod = parseFloat(document.getElementById('tod').value);
    const day = parseFloat(document.getElementById('day').value);
    const moonSid = parseFloat(document.getElementById('moonSid').value);
    const moonInc = parseFloat(document.getElementById('moonInc').value);

    const color = target === 'moon' ? 0x8888ff : (target === 'mars' ? 0xff5533 : 0xffaa00);
    const pts = [];
    const steps = Math.max(1, Math.round(year));

    for (let i = 0; i < steps; i++) {
        const currentDay = 1 + i;
        let skyPos;
        if (target === 'sun') {
            skyPos = computeSunWorldPosition(currentDay, tod, lat, year);
        } else if (target === 'moon') {
            skyPos = computeMoonWorldPosition(currentDay, tod, lat, year, moonSid, moonInc);
        } else {
            skyPos = computePlanetSkyPosition(target, currentDay, tod, lat, year);
        }
        pts.push(skyPos);
    }

    if (target === 'sun' && pts.length > 0) pts.push(pts[0]); 

    analemmaLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8 })
    );
    
    analemmaLine.visible = true;
    latitudeAnchor.add(analemmaLine);
    
    analemmaCache = { 
        target, year, lat, tod, day, moonSid, moonInc, 
        targetInc: ptolemyBodies[target]?.inclination, 
        targetPhase: ptolemyBodies[target]?.startingPhaseAngle,
        defR: ptolemyBodies[target]?.deferentR,
        epiR: ptolemyBodies[target]?.epicycleR,
        defP: ptolemyBodies[target]?.deferentPeriod,
        epiP: ptolemyBodies[target]?.epicyclePeriod
    };
}

// ═══════════════════════════════════════════════════════
//  UPDATE SYSTEM & BONES
// ═══════════════════════════════════════════════════════
function updateMoLang() {
    const day = parseFloat(document.getElementById('day').value);
    const tod = parseFloat(document.getElementById('tod').value);
    const lat = parseFloat(document.getElementById('lat').value);
    const year = parseFloat(document.getElementById('year').value);
    const moonSid = parseFloat(document.getElementById('moonSid').value);
    const moonInc = parseFloat(document.getElementById('moonInc').value);

    document.getElementById('dayv').textContent  = Math.floor(day);
    document.getElementById('todv').textContent  = tod.toFixed(4);
    document.getElementById('latv').textContent  = lat;
    document.getElementById('yearv').textContent = year;
    document.getElementById('speedv').textContent= document.getElementById('speed').value;

    earthCfg.size = parseFloat(document.getElementById('earthSize').value);
    earthCfg.tilt = parseFloat(document.getElementById('earthTilt').value);
    document.getElementById('earthSizev').textContent = earthCfg.size.toFixed(1);
    document.getElementById('tiltv').textContent = earthCfg.tilt;
    document.getElementById('moonSidv').textContent = moonSid.toFixed(2);
    document.getElementById('moonIncv').textContent = moonInc.toFixed(1);

    const shiftedTod = tod >= 0.25 ? tod - 0.25 : tod + 0.75;
    const fade1    = THREE.MathUtils.clamp((shiftedTod - 13/24) / (1/24), 0, 1);
    const fade2    = THREE.MathUtils.clamp((23/24 - shiftedTod) / (1/24), 0, 1);
    const starAlpha = Math.min(fade1, fade2);
    const daylight  = 1 - starAlpha;

    axialTiltGroup.children.forEach(m => { if (m.material) m.material.opacity = starAlpha; });

    if (renderMode === 'skybox') {
        scene.background = new THREE.Color(0x000000).lerp(new THREE.Color(0x87CEEB), daylight);
        mainSunLight.position.set(0, 1, 0);
        mainSunLight.intensity = daylight * 1.5;
        ambientLight.intensity = 0.3 + daylight * 0.5;
        skyboxSunMesh.lookAt(camera.position);
        skyboxMoonMesh.lookAt(camera.position);
    } else {
        scene.background = new THREE.Color(0x010109);
        ambientLight.intensity = 0.5; 
    }

    latitudeAnchor.rotation.set(D2R * -lat, 0, 0);
    const zRot = (tod * -360) + (day / year * -360);
    boneSkybox.rotation.set(D2R * 90, 0, D2R * zRot);

    const B = D2R * (((day - 81) / year) * 360);
    const eotMinutes = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
    const eot = sunCfg.analemmaStrength * (eotMinutes / 4.0);
    boneSunPivot.rotation.z = D2R * ((tod * -360) + eot);
    
    const dec = Math.sin(D2R * (((day - 80) / year) * 360)) * 23.5;
    boneSunDeclination.rotation.x = D2R * dec;

    const moonPiv = (tod * -360) + (((day + tod) / moonSid) * 360) + 180;
    boneMoonPivot.rotation.z = D2R * moonPiv;

    const moonDec = Math.sin(D2R * ((((day - 80) / year) * 360) + 180 + (((day + tod) / moonSid) * 360))) * (moonInc + Math.cos(D2R * (((day + tod) / 6793.5) * 360)) * 5.14);
    boneMoonDeclination.rotation.x = D2R * moonDec;

    if (renderMode === 'skybox') {
        Object.keys(skyboxPlanetMeshes).forEach(id => {
            const body = ptolemyBodies[id];
            const entry = skyboxPlanetMeshes[id];

            const dailyAngle   = tod * -360;
            const deferentAngle = (day / body.deferentPeriod) * 360 + body.startingPhaseAngle;
            const epicycleAngle = (day / body.epicyclePeriod) * 360 + body.startingPhaseAngle;

            entry.dailyPivot.rotation.z      = D2R * dailyAngle;
            entry.inclinationGroup.rotation.x = D2R * body.inclination; 
            entry.deferentGroup.rotation.z    = D2R * deferentAngle;
            entry.epicycleGroup.position.set(0, -body.deferentR, 0);
            entry.epicycleGroup.rotation.z    = D2R * epicycleAngle;
            entry.mesh.position.set(0, -(body.epicycleR + 25), 0);
            entry.mesh.lookAt(camera.position);
        });
    }

    if (renderMode === 'celestial') {
        ptolemyBodies.sun.deferentPeriod  = year;
        ptolemyBodies.moon.deferentPeriod = moonSid;
        ptolemyBodies.moon.inclination    = moonInc;

        earthGroup.position.set(0, 0, 0);
        earthTiltGroup.rotation.z = D2R * earthCfg.tilt;
        earthMesh.scale.setScalar(earthCfg.size / 5);
        earthMesh.rotation.y = D2R * tod * 360;

        Object.keys(ptolemyBodies).forEach(id => {
            const body = ptolemyBodies[id];
            if (!body.inclinationGroup) return;
            
            body.inclinationGroup.rotation.x = D2R * body.inclination;

            const defAngle = D2R * ((day / body.deferentPeriod) * 360 + body.startingPhaseAngle);
            const defX = Math.sin(defAngle) * body.deferentR;
            const defZ = Math.cos(defAngle) * body.deferentR;

            let epiX = 0, epiZ = 0;
            if (body.epicycleR > 0) {
                const epiLocalAngle = D2R * ((day / body.epicyclePeriod) * 360 + body.startingPhaseAngle);
                const epiWorldAngle = defAngle + epiLocalAngle; 
                epiX = Math.sin(epiWorldAngle) * body.epicycleR;
                epiZ = Math.cos(epiWorldAngle) * body.epicycleR;
            }

            body.group.position.set(defX + epiX, 0, defZ + epiZ);

            if (id === 'sun') {
                mainSunLight.position.copy(body.group.getWorldPosition(new THREE.Vector3()));
            }
        });

        document.getElementById('label-earth-info').textContent = `tilt: ${earthCfg.tilt}°  size: ${earthCfg.size.toFixed(1)}`;
    }

    if (selectedCelestial && ptolemyBodies[selectedCelestial]) {
        const target = selectedCelestial;
        const body = ptolemyBodies[target];
        const needRefresh = analemmaCache.target !== target ||
                            analemmaCache.year !== year ||
                            analemmaCache.lat !== lat ||
                            analemmaCache.tod !== tod ||
                            analemmaCache.day !== day ||
                            analemmaCache.moonSid !== moonSid ||
                            analemmaCache.moonInc !== moonInc ||
                            analemmaCache.targetInc !== body.inclination ||
                            analemmaCache.targetPhase !== body.startingPhaseAngle ||
                            analemmaCache.defR !== body.deferentR ||
                            analemmaCache.epiR !== body.epicycleR ||
                            analemmaCache.defP !== body.deferentPeriod ||
                            analemmaCache.epiP !== body.epicyclePeriod;
        if (needRefresh) rebuildAnalemma();
    }
    
    const moon_lon = (((day / moonSid) * 360) + 180) % 360; 
    const sun_lon = ((day / year) * 360) % 360;

    let phase_angle = (moon_lon - sun_lon) % 360;
    if (phase_angle < 0) phase_angle += 360;

    const raw_idx = Math.floor(((phase_angle + 22.5) % 360) / 45);
    const phase = (raw_idx + 4) % 8;

    const col = phase % 4;
    const row = Math.floor(phase / 4);

    if (skyboxMoonMesh.material.map) {
        skyboxMoonMesh.material.map.offset.set(col * 0.25, row === 0 ? 0.5 : 0.0);
    }
    if (moonMesh.material && moonMesh.material.map) {
        moonMesh.material.map.offset.set(col * 0.25, row === 0 ? 0.5 : 0.0);
    }
    updateMoLangReadout();
}

function rebuildDeferentRing(id) {
    const body = ptolemyBodies[id];
    if (!body || !body.inclinationGroup) return;
    const oldRing = body.inclinationGroup.children.find(c => c.userData.deferentOf === id);
    if (oldRing) body.inclinationGroup.remove(oldRing);
    
    const defPts = [];
    for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        defPts.push(new THREE.Vector3(Math.sin(a) * body.deferentR, 0, Math.cos(a) * body.deferentR));
    }
    const ring = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(defPts),
        new THREE.LineBasicMaterial({ color: 0x003800, transparent: true, opacity: 0.6 })
    );
    ring.userData.deferentOf = id;
    body.inclinationGroup.add(ring);
}

function rebuildOrbitRing(id) {
    const body = ptolemyBodies[id];
    if (!body || !body.inclinationGroup) return;
    if (body.epiRing) { body.inclinationGroup.remove(body.epiRing); body.epiRing = null; }
    if (body.epicycleR <= 0) return;
    const epiPts = [];
    for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        epiPts.push(new THREE.Vector3(Math.sin(a) * body.epicycleR, 0, Math.cos(a) * body.epicycleR));
    }
    body.epiRing = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(epiPts),
        new THREE.LineBasicMaterial({ color: 0x550000, transparent: true, opacity: 0.8 })
    );
    body.inclinationGroup.add(body.epiRing);
}