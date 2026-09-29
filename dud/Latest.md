# Astrum Domini — Dynamic Skybox for Minecraft Bedrock

**Advanced Client-Side Resource Pack with Real Astronomical Modeling**

A highly technical Minecraft Bedrock resource pack featuring a fully dynamic skybox with realistic celestial mechanics, procedural starfields, latitude-aware solar positioning, and animated lunar phases.

---

## Project Overview

**Astrum** is a sophisticated astronomy simulation packaged as a Minecraft Bedrock resource pack. It replaces the default sky with a physically-inspired dynamic system that responds to:

- Player latitude (`query.position(2)`)
- Time of day & day of year (`query.time_of_day`, `query.day`)
- Spyglass toggle for constellation overlay
- Real orbital mechanics (Ptolemaic deferent/epicycle model)

### Core Features
- **Procedural 6-face starfield** with 100,000+ stars and DSOs rendered via Python
- **Annual starbox rotation** with proper axial tilt
- **Sun** following the **analemma path** + latitude-adjusted declination
- **Moon** with accurate **synodic cycle** and animated phase UV mapping
- **Live Three.js previewer** with real-time MoLang debugging
- Full resource pack export pipeline

---

## Current Architecture (Refactored)
astrum-skybox/
├── main.py                    # Eel web app + export orchestration
├── stars.py                   # Pure starfield / DSO rendering logic
├── molang.py                  # Clean MoLang + bone hierarchy generation
├── test_logic.py              # Unit tests
├── web/
│   ├── index.html             # Three.js previewer (needs modularization)
│   └── previews/
├── data/                      # HYG star catalog, NGC, constellations
└── exports/

### Key Improvements Already Implemented

- **Separation of Concerns**: Star rendering moved to `stars.py`
- **MoLang Abstraction**: `MoLangGenerator` class in `molang.py`
- **Better Logging & Error Handling**
- **Pathlib-ready structure** (partial)
- Cleaner export pipeline using the new Molang class

---

## Professional Improvement Plan

### Phase 1: Code Quality & Maintainability (High Priority)

1. **Modularize the Frontend**
   - Split the massive `index.html` (~87KB) into separate files:
     - `ui.js` — UI controls & panels
     - `preview.js` — Three.js scene, camera, celestial bodies
     - `molang-preview.js` — Real-time MoLang evaluation
     - `export.js` — Pack export handling

2. **Enhance `molang.py`**
   - Make `CelestialBody` a proper class with configurable behavior
   - Support custom planets from the web UI
   - Add eclipse detection logic
   - Generate particle locators automatically

3. **Python Modernization**
   - Switch fully to `pathlib.Path`
   - Add configuration file (`config.yaml` or `settings.json`)
   - Improve error messages with user-friendly feedback

### Phase 2: Features & Realism

- Full dynamic planet support from UI → export
- Proper eclipse calculation (lunar/solar)
- Better particle performance (LOD, graphics mode detection)
- Optional high-resolution texture mode (2048px)
- Constellation names as floating labels (advanced)

### Phase 3: Portfolio Polish

- **Documentation**
  - Complete README with architecture diagram
  - Wiki-style technical explanation of coordinate system
  - Molang formula documentation with derivations

- **Demo Assets**
  - 30–60 second time-lapse video (1 year compressed)
  - Screenshots at different latitudes & seasons
  - Before/after comparison with vanilla

- **Testing**
  - Expand `test_logic.py` with MoLang string validation
  - Add integration tests for full export

---

## Specific Code Suggestions

### 1. `stars.py`
- Consider making `generate_skybox_textures` accept a config object
- Add progress callbacks for large renders
- Cache constellation lines (they rarely change)

### 2. `molang.py`
Current version is good. Next step:
```python
class CelestialBody:
    def get_pivot_molang(self) -> str:
    def get_declination_molang(self) -> str:
    def build_bone_chain(self) -> list: