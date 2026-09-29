// ═══════════════════════════════════════════════════════
//  UI, INTERACTION & DOM BINDINGS
// ═══════════════════════════════════════════════════════

function setupRaycasting() {
    renderer.domElement.addEventListener('click', onCanvasClick);
}

function onCanvasClick(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    let hits = [];
    if (renderMode === 'celestial') {
        const allMeshes = [earthMesh, ...Object.values(ptolemyBodies).map(b => b.mesh).filter(Boolean)];
        hits = raycaster.intersectObjects(allMeshes);
        if (hits.length > 0) {
            const obj = hits[0].object;
            if (obj === earthMesh) {
                selectCelestial('earth', document.getElementById('card-earth'));
            } else {
                for (const [id, body] of Object.entries(ptolemyBodies)) {
                    if (obj === body.mesh) {
                        selectCelestial(id, document.getElementById('card-' + id));
                        break;
                    }
                }
            }
        }
    } else {
        hits = raycaster.intersectObjects([skyboxSunMesh, skyboxMoonMesh]);
        if (hits.length > 0) {
            let name = '';
            const obj = hits[0].object;
            if (obj === skyboxSunMesh)  name = 'sun';
            else if (obj === skyboxMoonMesh) name = 'moon';
            if (name) selectCelestial(name, document.getElementById('card-' + name));
        }
    }
}

function selectCelestial(name, cardEl) {
    document.querySelectorAll('.celestial-card').forEach(c => c.classList.remove('selected'));
    if (cardEl) cardEl.classList.add('selected');

    document.getElementById('props-earth').style.display = name === 'earth' ? 'block' : 'none';
    document.getElementById('props-sun').style.display   = name === 'sun'   ? 'block' : 'none';
    document.getElementById('props-moon').style.display  = name === 'moon'  ? 'block' : 'none';
    const marsPanel = document.getElementById('props-mars');
    if (marsPanel) marsPanel.style.display = name === 'mars' ? 'block' : 'none';
    
    document.querySelectorAll('[id^="props-custom-"]').forEach(p => p.style.display = 'none');
    if (name && ptolemyBodies[name] && ptolemyBodies[name].type === 'custom') {
        const custPanelId = 'props-custom-' + name;
        let custPanel = document.getElementById(custPanelId);
        if (!custPanel) {
            custPanel = createCustomPlanetPanel(name);
            document.getElementById('properties-panel').appendChild(custPanel);
        }
        custPanel.style.display = 'block';
    }
    
    document.getElementById('properties-panel').style.display = 'block';
    document.getElementById('no-selection-hint').style.display = 'none';

    selectedCelestial = name;
    
    if (earthMesh.material && Array.isArray(earthMesh.material)) {
        const em = name === 'earth' ? 0x001a00 : 0x000000;
        earthMesh.material.forEach(m => m.emissive && m.emissive.setHex(em));
    }
    updateMoLangReadout();
    rebuildAnalemma();
}

function createCustomPlanetPanel(id) {
    const body = ptolemyBodies[id];
    const panel = document.createElement('div');
    panel.id = 'props-custom-' + id;
    panel.innerHTML = `
        <hr>
        <h4>◆ ${body.name}</h4>
        <div class="prop-row">
            <label>Custom Texture</label>
            <input type="file" id="${id}TexUpload" accept="image/png, image/jpeg" style="font-size:0.55vw;">
        </div>
        <div class="prop-row">
            <div class="label-row"><label>Billboard Size</label><span class="prop-value-display" id="${id}Sizev">${body.size}</span></div>
            <input type="range" id="${id}SizeSlider" min="1" max="40" value="${body.size}" step="0.5" oninput="updateBodySize('${id}')">
        </div>
        <div class="prop-row">
            <div class="label-row"><label>Deferent Radius</label><span class="prop-value-display" id="${id}DefRv">${body.deferentR}</span></div>
            <input type="range" id="${id}DefR" min="50" max="400" value="${body.deferentR}" step="1" oninput="updateBodyOrbit('${id}')">
        </div>
        <div class="prop-row">
            <div class="label-row"><label>Epicycle Radius</label><span class="prop-value-display" id="${id}EpiRv">${body.epicycleR}</span></div>
            <input type="range" id="${id}EpiR" min="0" max="150" value="${body.epicycleR}" step="1" oninput="updateBodyOrbit('${id}')">
        </div>
        <div class="prop-row">
            <div class="label-row"><label>Orbital Period (days)</label><span class="prop-value-display" id="${id}DefPv">${body.deferentPeriod}</span></div>
            <input type="range" id="${id}DefP" min="100" max="3000" value="${body.deferentPeriod}" step="1" oninput="updateBodyOrbit('${id}')">
        </div>
        <div class="prop-row">
            <div class="label-row"><label>Epicycle Period (days)</label><span class="prop-value-display" id="${id}EpiPv">${body.epicyclePeriod}</span></div>
            <input type="range" id="${id}EpiP" min="100" max="3000" value="${body.epicyclePeriod}" step="1" oninput="updateBodyOrbit('${id}')">
        </div>
        <div class="prop-row">
            <div class="label-row"><label>Inclination (deg)</label><span class="prop-value-display" id="${id}Incv">${body.inclination.toFixed(2)}</span></div>
            <input type="range" id="${id}Inc" min="-90" max="90" value="${body.inclination}" step="0.1" oninput="updateBodyInclination('${id}')">
        </div>
        <div class="prop-row">
            <div class="label-row"><label>Starting Phase Angle (deg)</label><span class="prop-value-display" id="${id}Phasev">${body.startingPhaseAngle.toFixed(1)}</span></div>
            <input type="range" id="${id}Phase" min="0" max="360" value="${body.startingPhaseAngle}" step="1" oninput="updateBodyPhaseAngle('${id}')">
        </div>
        <button class="action-btn" style="background: #f00; margin-top: 8px;" onclick="removePlanet('${id}')">DELETE PLANET</button>
    `;
    
    setTimeout(() => {
        const texInput = panel.querySelector(`#${id}TexUpload`);
        if (texInput) {
            texInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = function(evt) {
                    const img = new Image();
                    img.onload = function() {
                        const tex = new THREE.Texture(img);
                        tex.magFilter = THREE.NearestFilter;
                        tex.minFilter = THREE.NearestFilter;
                        tex.needsUpdate = true;
                        const m = ptolemyBodies[id].mesh;
                        if (m && m.material) {
                            m.material.map = tex;
                            m.material.color.setHex(0xffffff);
                            m.material.needsUpdate = true;
                        }
                    };
                    img.src = evt.target.result;
                };
                reader.readAsDataURL(file);
            });
        }
    }, 0);
    return panel;
}

function updateMoLangReadout() {
    const codeEl = document.getElementById('molang-code');
    if (!selectedCelestial) { codeEl.innerText = "-- Select an object --"; return; }

    if (selectedCelestial === 'sun') {
        codeEl.innerText = `bone_sun_pivot  rot.Z:\n(q.time_of_day * -360) + eot_correction\n\nbone_sun_declination  rot.X:\nmath.sin(((q.day - 80) / 365.0) * 360) * 23.5`;
    } else if (selectedCelestial === 'moon') {
        codeEl.innerText = `bone_moon_pivot  rot.Z:\n(q.time_of_day * -360)\n  + (((q.day + q.time_of_day) / ${moonCfg.sid.toFixed(2)}) * 360) + 180\n\nbone_moon_declination  rot.X:\nmath.sin(orbital_phase) * (${moonCfg.inc.toFixed(1)} + nodal_prec)`;
    } else if (selectedCelestial === 'earth') {
        codeEl.innerText = `Orbit Y (Celestial Only):\n(((q.day - 80) / 365.25) * 360)\n\nLocal Y Rotation:\nq.time_of_day * 360`;
    } else if (selectedCelestial && ptolemyBodies[selectedCelestial]) {
        const body = ptolemyBodies[selectedCelestial];
        codeEl.innerText = `[Ptolemaic — ${body.name}]\n\nDeferent (bone_${selectedCelestial}_pivot)  rot.Z:\n(q.day / ${body.deferentPeriod}) * 360\n\nEpicycle (bone_${selectedCelestial}_epi)  rot.Z:\n(q.day / ${body.epicyclePeriod}) * 360`;
    } else {
        codeEl.innerText = `-- Select an object --`;
    }
}

function updateWorldLabels() {
    if (renderMode !== 'celestial') return;
    projectLabel('label-earth', earthMesh, 0, earthCfg.size + 3, 0);
    for (const [id, body] of Object.entries(ptolemyBodies)) {
        const labelEl = document.getElementById('label-' + id);
        if (body.mesh && labelEl) projectLabel('label-' + id, body.mesh, 0, body.size + 2, 0);
    }
}

function generateCelestialListUI() {
    const listContainer = document.getElementById('celestial-list');
    listContainer.innerHTML = `
        <div class="celestial-card" id="card-earth" onclick="selectCelestial('earth', this)">
            <span class="icon">🌍</span> EARTH
            <span class="tag">CENTER</span>
        </div>
    `;
    
    Object.keys(ptolemyBodies).forEach(id => {
        const body = ptolemyBodies[id];
        const isCustom = body.type === 'custom';
        const removeBtn = isCustom ? `<button style="margin-left: auto; background: #f00; color: #fff; border: none; padding: 2px 4px; font-size: 0.5vw; cursor: pointer;" onclick="removePlanet('${id}'); event.stopPropagation();">✕</button>` : '';
        listContainer.innerHTML += `
            <div class="celestial-card" id="card-${id}" onclick="selectCelestial('${id}', this)" style="position: relative;">
                <span class="icon">${body.icon}</span> ${body.name}
                <span class="tag">${body.type.toUpperCase()}</span>
                ${removeBtn}
            </div>
        `;
    });
}

function projectLabel(id, mesh, ox, oy, oz) {
    const el = document.getElementById(id);
    const wp = new THREE.Vector3();
    mesh.getWorldPosition(wp);
    wp.x += ox; wp.y += oy; wp.z += oz;
    wp.project(camera);
    if (wp.z > 1) { el.style.display = 'none'; return; }
    const w = renderer.domElement.clientWidth;
    const h = renderer.domElement.clientHeight;
    el.style.left    = (( wp.x * 0.5 + 0.5) * w + 6) + 'px';
    el.style.top     = ((-wp.y * 0.5 + 0.5) * h    ) + 'px';
    el.style.display = 'block';
}

function updateSunProps() {
    sunCfg.size = parseFloat(document.getElementById('sunSizeSlider').value);
    sunCfg.analemmaStrength = parseFloat(document.getElementById('anaStrSlider').value);
    document.getElementById('sunSizev').textContent = sunCfg.size;
    document.getElementById('anaStrv').textContent  = sunCfg.analemmaStrength.toFixed(2) + '×';
    
    const scaleFactor = sunCfg.size / 80;
    skyboxSunMesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
    ptolemyBodies.sun.size = 16 * scaleFactor;
    rebuildAnalemma();
}

function toggleAnalemma() {
    sunCfg.analemmaOn = !sunCfg.analemmaOn;
    const btn = document.getElementById('analemmaBtn');
    btn.textContent = sunCfg.analemmaOn ? 'ENABLED' : 'DISABLED';
    btn.className   = sunCfg.analemmaOn ? 'toggle-btn on' : 'toggle-btn';
    document.getElementById('anaStrRow').style.opacity = sunCfg.analemmaOn ? '1' : '0.3';
    rebuildAnalemma();
}

function updateEarthProps() {
    earthCfg.size = parseFloat(document.getElementById('earthSize').value);
    earthCfg.tilt = parseFloat(document.getElementById('earthTilt').value);
    document.getElementById('earthSizev').textContent = earthCfg.size.toFixed(1);
    document.getElementById('tiltv').textContent = earthCfg.tilt;
}

function updateYear() { rebuildAnalemma(); }

function updateMoonProps() {
    moonCfg.sid  = parseFloat(document.getElementById('moonSid').value);
    moonCfg.inc  = parseFloat(document.getElementById('moonInc').value);
    moonCfg.size = parseFloat(document.getElementById('moonSizeSlider').value);
    
    document.getElementById('moonSidv').textContent = moonCfg.sid.toFixed(2);
    document.getElementById('moonIncv').textContent = moonCfg.inc.toFixed(1);
    document.getElementById('moonSizev').textContent = moonCfg.size;

    const scaleFactor = moonCfg.size / 80;
    skyboxMoonMesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
    ptolemyBodies.moon.size = 5 * scaleFactor;

    if (selectedCelestial === 'moon') rebuildAnalemma();
}

function updateBodySize(id) {
    const body = ptolemyBodies[id];
    if (!body) return;
    const slider = document.getElementById(id + 'SizeSlider');
    const display = document.getElementById(id + 'Sizev');
    if (slider) body.size = parseFloat(slider.value);
    if (display) display.textContent = body.size.toFixed(1);
}

function updateBodyOrbit(id) {
    const body = ptolemyBodies[id];
    if (!body) return;
    const defR = document.getElementById(id + 'DefR');
    const epiR = document.getElementById(id + 'EpiR');
    const defP = document.getElementById(id + 'DefP');
    const epiP = document.getElementById(id + 'EpiP');
    if (defR) { body.deferentR = parseFloat(defR.value); document.getElementById(id + 'DefRv').textContent = body.deferentR; }
    if (epiR) { body.epicycleR = parseFloat(epiR.value); document.getElementById(id + 'EpiRv').textContent = body.epicycleR; rebuildOrbitRing(id); }
    if (defP) { body.deferentPeriod = parseFloat(defP.value); document.getElementById(id + 'DefPv').textContent = body.deferentPeriod; }
    if (epiP) { body.epicyclePeriod = parseFloat(epiP.value); document.getElementById(id + 'EpiPv').textContent = body.epicyclePeriod; }
    rebuildDeferentRing(id);
}

function updateBodyInclination(id) {
    const body = ptolemyBodies[id];
    if (!body) return;
    const incSlider = document.getElementById(id + 'Inc');
    if (incSlider) {
        body.inclination = parseFloat(incSlider.value);
        document.getElementById(id + 'Incv').textContent = body.inclination.toFixed(2);
    }
}

function updateBodyPhaseAngle(id) {
    const body = ptolemyBodies[id];
    if (!body) return;
    const phaseSlider = document.getElementById(id + 'Phase');
    if (phaseSlider) {
        body.startingPhaseAngle = parseFloat(phaseSlider.value);
        document.getElementById(id + 'Phasev').textContent = body.startingPhaseAngle.toFixed(1);
    }
}

function updateMoonPhaseAngle() {
    const phaseSlider = document.getElementById('moonPhase');
    if (phaseSlider) {
        ptolemyBodies.moon.startingPhaseAngle = parseFloat(phaseSlider.value);
        document.getElementById('moonPhasev').textContent = ptolemyBodies.moon.startingPhaseAngle.toFixed(1);
    }
}

function showAddPlanetForm() { document.getElementById('add-planet-form').style.display = 'block'; }

function hideAddPlanetForm() {
    document.getElementById('add-planet-form').style.display = 'none';
    document.getElementById('new-planet-name').value = '';
    document.getElementById('new-planet-icon').value = '';
    document.getElementById('new-planet-defr').value = 150;
    document.getElementById('new-planet-defp').value = 500;
    document.getElementById('new-planet-epir').value = 30;
    document.getElementById('new-planet-size').value = 5;
}

function createNewPlanet() {
    const name = document.getElementById('new-planet-name').value.trim().toUpperCase();
    const icon = document.getElementById('new-planet-icon').value.trim() || '●';
    const defR = parseFloat(document.getElementById('new-planet-defr').value);
    const defP = parseFloat(document.getElementById('new-planet-defp').value);
    const epiR = parseFloat(document.getElementById('new-planet-epir').value);
    const size = parseFloat(document.getElementById('new-planet-size').value);

    if (!name) { alert('Enter a name'); return; }

    const id = name.toLowerCase().replace(/\s+/g, '_');
    if (ptolemyBodies[id]) { alert('Planet already exists'); return; }

    ptolemyBodies[id] = {
        name, icon, type: 'custom',
        deferentR: defR, deferentPeriod: defP,
        epicycleR: epiR, epicyclePeriod: defP * 0.5,
        size, mesh: null, group: null, epiRing: null, inclination: 0, startingPhaseAngle: 0
    };

    const body = ptolemyBodies[id];
    body.group = new THREE.Group();
    celestialRoot.add(body.group);

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
    celestialRoot.add(defRing);

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
        celestialRoot.add(body.epiRing);
    }

    const baseColor = 0x88ddff;
    body.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), makeParticleMaterial(baseColor));
    body.mesh.name = id;
    body.mesh.userData = { id };
    body.mesh.renderOrder = 1;
    body.group.add(body.mesh);

    const skyColor = 0x88ddff;
    const skyMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(8, 8),
        new THREE.MeshBasicMaterial({ color: skyColor, transparent: true, opacity: 1.0, side: THREE.DoubleSide, depthWrite: false })
    );
    skyMesh.position.set(0, -25, 0);
    const dailyPivot = new THREE.Group();
    const deferentGroup = new THREE.Group();
    const epicycleGroup = new THREE.Group();
    const declGroup = new THREE.Group();

    dailyPivot.add(deferentGroup);
    deferentGroup.add(epicycleGroup);
    epicycleGroup.add(declGroup);
    declGroup.add(skyMesh);

    latitudeAnchor.add(dailyPivot);
    skyboxPlanetMeshes[id] = { mesh: skyMesh, dailyPivot, deferentGroup, epicycleGroup, declGroup, inclinationGroup: new THREE.Group() };

    const texContainer = document.getElementById('properties-panel');
    const texId = id + 'TexUpload';
    if (!document.getElementById(texId)) {
        const texInput = document.createElement('input');
        texInput.type = 'file';
        texInput.id = texId;
        texInput.accept = 'image/png, image/jpeg';
        texInput.style.display = 'none';
        texContainer.appendChild(texInput);

        texInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                const img = new Image();
                img.onload = function() {
                    const tex = new THREE.Texture(img);
                    tex.magFilter = THREE.NearestFilter;
                    tex.minFilter = THREE.NearestFilter;
                    tex.needsUpdate = true;
                    const m = ptolemyBodies[id].mesh;
                    if (m && m.material) {
                        m.material.map = tex;
                        m.material.color.setHex(0xffffff);
                        m.material.needsUpdate = true;
                    }
                };
                img.src = evt.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    generateCelestialListUI();
    hideAddPlanetForm();
}

function removePlanet(id) {
    if (!ptolemyBodies[id] || id === 'sun' || id === 'moon') { alert('Cannot remove this planet'); return; }

    const body = ptolemyBodies[id];
    if (body.group) celestialRoot.remove(body.group);
    if (body.epiRing) celestialRoot.remove(body.epiRing);
    
    celestialRoot.children.filter(c => c.userData.deferentOf === id).forEach(c => celestialRoot.remove(c));

    if (skyboxPlanetMeshes[id]) {
        latitudeAnchor.remove(skyboxPlanetMeshes[id].pivotGroup);
        delete skyboxPlanetMeshes[id];
    }

    delete ptolemyBodies[id];
    generateCelestialListUI();
    if (selectedCelestial === id) selectCelestial(null, null);
}

function setupTextureUpload() {
    document.getElementById('sunTexUpload').addEventListener('change', function(e) {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            const img = new Image();
            img.onload = function() {
                const tex = new THREE.Texture(img);
                tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
                tex.needsUpdate = true;
                [skyboxSunMesh, ptolemyBodies.sun.mesh].forEach(m => {
                    if (m && m.material) { m.material.map = tex; m.material.color.setHex(0xffffff); m.material.needsUpdate = true; }
                });
            };
            img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
    });

    const moonUpload = document.getElementById('moonTexUpload');
    if (moonUpload) {
        moonUpload.addEventListener('change', function(e) {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                const img = new Image();
                img.onload = function() {
                    const tex = new THREE.Texture(img);
                    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
                    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
                    tex.repeat.set(0.25, 0.5); tex.needsUpdate = true;
                    [skyboxMoonMesh, ptolemyBodies.moon.mesh].forEach(m => {
                        if (m && m.material) { m.material.map = tex; m.material.color.setHex(0xffffff); m.material.needsUpdate = true; }
                    });
                };
                img.src = evt.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    const marsUpload = document.getElementById('marsTexUpload');
    if (marsUpload) {
        marsUpload.addEventListener('change', function(e) {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                const img = new Image();
                img.onload = function() {
                    const tex = new THREE.Texture(img);
                    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
                    tex.needsUpdate = true;
                    const m = ptolemyBodies.mars.mesh;
                    if (m && m.material) { m.material.map = tex; m.material.color.setHex(0xffffff); m.material.needsUpdate = true; }
                };
                img.src = evt.target.result;
            };
            reader.readAsDataURL(file);
        });
    }
}

function showView(viewId, btnElement) {
    document.querySelectorAll('.menu-view').forEach(v => v.style.display = 'none');
    document.getElementById(viewId).style.display = 'block';
    
    document.querySelectorAll('.menu-nav button').forEach(b => b.classList.remove('nav-active'));
    if (btnElement && btnElement.tagName === 'BUTTON') btnElement.classList.add('nav-active');

    if (viewId === 'celestial-view' || viewId === 'skybox-view') {
        document.getElementById('celestial-list').style.display = 'block';
        if (document.getElementById('properties-panel').style.display === 'block') {
            document.getElementById('properties-panel').style.display = 'block';
        }
    } else {
        document.getElementById('celestial-list').style.display = 'none';
        document.getElementById('properties-panel').style.display = 'none';
    }

    if (viewId === 'celestial-view') switchToCelestial();
    else if (viewId === 'skybox-view') switchToSkybox();
}

function switchToCelestial() {
    renderMode = 'celestial';
    celestialRoot.visible = true;
    groundMesh.visible = false;
    skyAnchor.visible = false;
    if (skyboxSunMesh) skyboxSunMesh.visible = false;
    if (skyboxMoonMesh) skyboxMoonMesh.visible = false;
    if(analemmaLine) analemmaLine.visible = false;
    
    document.getElementById('crosshair').style.display = 'none';
    document.getElementById('mode-indicator').textContent = 'CELESTIAL MODE';
    document.getElementById('label-earth').style.display = 'block';

    controls.minDistance = 5;
    controls.maxDistance = 500;
    controls.enablePan   = true;
    controls.enabled = false; 

    camTransition = {
        startPos:    camera.position.clone(),
        endPos:      new THREE.Vector3(60, SUN_ORBIT_R * 1.1, SUN_ORBIT_R * 2.8),
        startTarget: controls.target.clone(),
        endTarget:   new THREE.Vector3(0, 0, 0),
        t: 0, dur: 1.1
    };
}

function switchToSkybox() {
    renderMode = 'skybox';
    celestialRoot.visible = false;
    skyAnchor.visible = true;
    if (skyboxSunMesh) skyboxSunMesh.visible = true;
    if (skyboxMoonMesh) skyboxMoonMesh.visible = true;
    groundMesh.visible = true;
    if(analemmaLine) analemmaLine.visible = selectedCelestial && (selectedCelestial !== 'sun' || sunCfg.analemmaOn);
    
    document.getElementById('crosshair').style.display = 'block';
    document.getElementById('mode-indicator').textContent = 'SKYBOX MODE';

    controls.minDistance = 0.01;
    controls.maxDistance = 0.1;
    controls.enablePan   = false;
    controls.enabled = false;

    camTransition = {
        startPos:    camera.position.clone(),
        endPos:      new THREE.Vector3(0, 1.8, 0.001),
        startTarget: controls.target.clone(),
        endTarget:   new THREE.Vector3(0, 1.8, 0),
        t: 0, dur: 1.0
    };
}