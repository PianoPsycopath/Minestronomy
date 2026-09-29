# molang.py
from typing import Dict, Any, List

class CelestialBody:
    """Represents a single celestial body with its orbital parameters and MoLang logic."""
    
    def __init__(self, 
                 body_id: str,
                 deferent_period: float,
                 epicycle_period: float = 1.0,
                 inclination: float = 0.0,
                 starting_phase: float = 0.0,
                 is_sun: bool = False,
                 is_moon: bool = False,
                 **kwargs):
        
        self.id = body_id
        self.deferent_period = deferent_period
        self.epicycle_period = epicycle_period
        self.inclination = inclination
        self.starting_phase = starting_phase
        self.is_sun = is_sun
        self.is_moon = is_moon
        self.extra = kwargs  # for future extensions (size, color, etc.)

    def get_pivot_molang(self) -> str:
        """Returns MoLang for daily rotation (right ascension / hour angle)"""
        if self.is_sun:
            b_calc = "((query.day - 81) / 365.25) * 360"
            return f"(query.time_of_day * -360) + ((math.sin(2 * {b_calc}) * 9.87 + math.cos({b_calc}) * -7.53 + math.sin({b_calc}) * -1.5) / 4.0)"
        
        elif self.is_moon:
            return "(query.time_of_day * -360) + (((query.day + query.time_of_day) / 29.53) * 360) + 180"
        
        else:
            return (f"(query.time_of_day * -360) + "
                   f"(((query.day / {self.deferent_period}) * 360) + "
                   f"((query.day / {self.epicycle_period}) * 360)) + {self.starting_phase}")

    def get_declination_molang(self) -> str:
        """Returns MoLang for seasonal elevation (declination)"""
        if self.is_sun:
            return "math.sin(((query.day - 80) / 365.25) * 360) * 23.5"
        
        elif self.is_moon:
            moon_anom = "(((query.day - 80) / 365.25) * 360) + 180 + (((query.day + query.time_of_day) / 29.53) * 360)"
            node = "(((query.day + query.time_of_day) / 6793.5) * 360)"
            return f"(math.sin({moon_anom}) * (23.5 + math.cos({node}) * 5.14)) + (query.position(2) / 63710 * 2.9)"
        
        else:
            # Generic planet — can be extended later with orbital inclination effects
            return "0"

    def get_bone_definitions(self) -> List[Dict]:
        """Returns the bone hierarchy entries for this body"""
        return [
            {"name": f"bone_{self.id}_pivot", "parent": "latitude_anchor", "pivot": [0, 0, 0]},
            {"name": f"bone_{self.id}_declination", "parent": f"bone_{self.id}_pivot", "pivot": [0, 0, 0]},
            {"name": f"bone_{self.id}_inclination", "parent": f"bone_{self.id}_declination", "pivot": [0, 0, 0]},
            {"name": f"bone_{self.id}", "parent": f"bone_{self.id}_inclination", "pivot": [0, 0, 0],
             "locators": {f"locator_{self.id}": [0, 0, -250]}}
        ]

    def get_animation_definitions(self) -> Dict:
        """Returns the animation MoLang for this body"""
        return {
            f"bone_{self.id}_pivot": {"rotation": [0, 0, self.get_pivot_molang()]},
            f"bone_{self.id}_declination": {"rotation": [self.get_declination_molang(), 0, 0]},
            f"bone_{self.id}_inclination": {"rotation": [0, 0, self.inclination]}
        }


class MoLangGenerator:
    """Orchestrates bone hierarchy and animations for all celestial bodies."""
    
    def __init__(self, bodies_config: Dict[str, Dict]):
        self.bodies = {}
        for body_id, cfg in bodies_config.items():
            self.bodies[body_id] = CelestialBody(
                body_id=body_id,
                deferent_period=cfg.get('deferentPeriod', 365.25),
                epicycle_period=cfg.get('epicyclePeriod', 1.0),
                inclination=cfg.get('inclination', 0.0),
                starting_phase=cfg.get('startingPhaseAngle', 0.0),
                is_sun=(body_id == 'sun'),
                is_moon=(body_id == 'moon')
            )

    def build_bone_hierarchy(self) -> List[Dict]:
        """Full bone list for geometry.star_field.json"""
        bones = [
            {"name": "sky_anchor", "pivot": [0, 0, 0]},
            {"name": "latitude_anchor", "parent": "sky_anchor", "pivot": [0, 0, 0]},
            {"name": "bone_skybox", "parent": "latitude_anchor", "pivot": [0, 0, 0], 
             "rotation": [90, 0, 0], "locators": {"locator": [0, 0, 0]}},
            {"name": "axial_tilt", "parent": "bone_skybox", "pivot": [0, 0, 0], 
             "rotation": [23.5, 0, 0]}
        ]

        for body in self.bodies.values():
            bones.extend(body.get_bone_definitions())
        
        return bones

    def build_animations(self) -> Dict:
        """Full animation dictionary for astrum_sky.json"""
        animations = {
            "sky_anchor": {"rotation": ["-this", "-this - query.body_y_rotation", "-this"]},
            "latitude_anchor": {"rotation": ["(math.clamp(query.position(2) / 63710, -1, 1) * -90)", 0, 0]},
            "bone_skybox": {"rotation": [90, 0, "(query.time_of_day * -360) + (query.day / 365.25 * -360)"]},
            "axial_tilt": {"rotation": [23.5, 0, 0]}
        }

        for body in self.bodies.values():
            animations.update(body.get_animation_definitions())
        
        return animations