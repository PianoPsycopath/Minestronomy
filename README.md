# Minestronomy

Client-side astronomy editor for Minecraft Bedrock. Being rebuilt per [docs/plan.md](docs/plan.md).

- `src/`, `index.html` — current Vite/Three.js workbench (to be replaced by the Bedrock runtime)
- `public/PACK/` — working resource pack; the runtime reference (do not edit)
- `tests/fixtures/bedrock_reference/` — frozen sky-only copy of PACK (Phase 0)
- `tools/` — star/cubemap generation (`stars.py`) and its tests
- `data/` — HYG / NGC catalogs
- `template/`, `exports/` — pack export template and generated packs
- `legacy/` — old Eel shell + Ptolemaic Molang generator, kept until Phase 26
