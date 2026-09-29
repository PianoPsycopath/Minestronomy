import os
import eel
import json
import uuid
import shutil
import logging
from pathlib import Path

import stars
import molang

# ========================= CONFIG =========================
eel.init('web')

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

BASE_DIR = Path(__file__).parent
OUT_DIR = BASE_DIR / 'web' / 'previews'
EXPORT_BASE_PATH = BASE_DIR / 'exports'

# Default bodies (can be overridden by JS later)
DEFAULT_BODIES = {
    'sun': {
        'deferentPeriod': 365.25,
        'epicyclePeriod': 1.0,
        'inclination': 0.0,
        'startingPhaseAngle': 0.0
    },
    'moon': {
        'deferentPeriod': 27.32,
        'epicyclePeriod': 1.0,
        'inclination': 5.14,
        'startingPhaseAngle': 0.0
    },
    'mars': {
        'deferentPeriod': 687.0,
        'epicyclePeriod': 365.25,
        'inclination': 1.85,
        'startingPhaseAngle': 0.0
    }
}

# Ensure directories exist
OUT_DIR.mkdir(parents=True, exist_ok=True)
EXPORT_BASE_PATH.mkdir(parents=True, exist_ok=True)


@eel.expose
def generate_skybox(visible_mag_limit: float = 9.0):
    """Generate starfield textures."""
    logging.info(f"Starting starfield render at magnitude limit: {visible_mag_limit}")
    try:
        success = stars.generate_skybox_textures(
            visible_mag_limit,
            str(BASE_DIR / 'data' / 'hyg_v42.csv'),
            str(BASE_DIR / 'data' / 'NGC.csv'),
            str(BASE_DIR / 'data' / 'index.json'),
            str(OUT_DIR)
        )
        if success:
            logging.info("✅ Starfield textures generated successfully.")
        return success
    except Exception as e:
        logging.error(f"❌ Starfield generation failed: {e}", exc_info=True)
        return False


@eel.expose
def export_resource_pack(pack_name: str, bodies_dict: dict = None):
    """Export using template as base. Textures are defined in particle files."""
    if bodies_dict is None:
        bodies_dict = DEFAULT_BODIES

    target_path = EXPORT_BASE_PATH / pack_name
    target_path.mkdir(parents=True, exist_ok=True)

    # 1. Copy entire template (this brings all particle definitions + default textures)
    template_dir = BASE_DIR / "template"
    if template_dir.exists():
        shutil.copytree(template_dir, target_path, dirs_exist_ok=True)
        logging.info(f"✅ Copied template base to {target_path}")
    else:
        logging.error("template/ folder not found!")
        return False

    # 2. Update manifest version + name
    manifest_file = target_path / "manifest.json"
    if manifest_file.exists():
        try:
            data = json.loads(manifest_file.read_text(encoding="utf-8"))
            v = data["header"].get("version", [1, 0, 0])
            data["header"]["version"] = [v[0], v[1], v[2] + 1]
            data["header"]["name"] = pack_name
            data["header"]["description"] = "Astrum Domini — Dynamic Realistic Skybox"
            manifest_file.write_text(json.dumps(data, indent=2), encoding="utf-8")
        except Exception as e:
            logging.warning(f"Manifest update failed: {e}")

    # 3. Overwrite latest generated star textures
    tex_dir = target_path / "textures" / "astrum"
    tex_dir.mkdir(parents=True, exist_ok=True)

    for face in ["px", "nx", "py", "ny", "pz", "nz"]:
        for prefix in ["normal", "const"]:
            src = OUT_DIR / f"{prefix}_{face}.png"
            dest = tex_dir / f"{prefix}_{face}.png"
            if src.exists():
                shutil.copy2(src, dest)

    # 4. Generate dynamic MoLang files (bones + animations)
    ml_gen = molang.MoLangGenerator(bodies_dict)
    
    # Geometry (bones)
    with open(target_path / "models/entity/star_field.json", "w", encoding="utf-8") as f:
        json.dump({
            "format_version": "1.12.0",
            "minecraft:geometry": [{
                "description": {
                    "identifier": "geometry.star_field",
                    "texture_width": 3072,
                    "texture_height": 2048
                },
                "bones": ml_gen.build_bone_hierarchy()
            }]
        }, f, indent=2)

    # Animation
    with open(target_path / "animations/astrum_sky.json", "w", encoding="utf-8") as f:
        json.dump({
            "format_version": "1.8.0",
            "animations": {
                "animation.astrum.sky_rotation": {
                    "loop": True,
                    "bones": ml_gen.build_animations()
                }
            }
        }, f, indent=2)

    logging.info(f"✅ Successfully exported '{pack_name}' using template (textures defined in particles)")
    return True

if __name__ == "__main__":
    try:
        eel.start('index.html', mode='chrome', cmdline_args=['--start-fullscreen'], port=8000)
    except (SystemExit, KeyboardInterrupt):
        print("Astrum closed.")