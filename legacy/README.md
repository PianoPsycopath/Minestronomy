# legacy

Old Eel/Python shell kept for reference until the rewrite plan (docs/plan.md) reaches
Phase 26 (remove the Ptolemaic system).

- `main.py` — Eel app + template-based pack export. Its frontend (`web/`) has been removed, so it no longer runs as-is.
- `molang.py` — Ptolemaic deferent/epicycle Molang generator (to be replaced by the astronomy engine + generator).

Star/cubemap generation lives on in `tools/stars.py`.
