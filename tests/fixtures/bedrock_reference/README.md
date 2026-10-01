# bedrock_reference (Phase 0 — LOCKED)

Frozen behavioral reference of the working Minestronomy sky system.

**Do not edit any file in this folder after Phase 0 is accepted.**

## Purpose

This is the single source of truth for “what Minecraft currently receives” for the dynamic sky.
Later phases (Bedrock runtime, Molang evaluator, differential tests) load these exact files.

## Contents

- `models/entity/star.geo.json` — bone hierarchy (sky_anchor → latitude → skybox / sun / moon)
- `animations/star.animation.json` — `animation.astrum.sky_rotation` (Ptolemaic expressions)
- `animation_controllers/star_emitter.json` — stars_only ↔ constellations + particle locators
- `render_controllers/star.render_controller.json`
- `particles/` — sun, moon, and all six faces × (stars | const)
- `textures/` — cubemap faces + sun/moon
- `materials/`
- `entity/player.entity.json` — reference for how the geometry/animation/controller are attached
- `manifest.json` — so the folder can be packaged as a resource pack for verification

## Acceptance criteria (Phase 0 complete)

1. A clean copy of this folder, packaged as a resource pack, produces the same sky behavior in Minecraft that the original `public/PACK` produces.
2. No files outside this folder are required for the sky to appear.
3. The README and file list above match the actual contents.

Once the above is verified in-game, mark Phase 0 **LOCKED** in the plan and never modify these files.