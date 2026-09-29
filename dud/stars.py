import os
import pandas as pd
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import math
import json
import random

# CONFIGURATION
FACE_SIZE = 1024
FACE_NAMES = ["px", "nx", "py", "ny", "pz", "nz"]
GLOW_MAG_LIMIT = 5.0
DSO_MAG_LIMIT = 9.5        
ZODIAC_IAU = ["Ari", "Tau", "Gem", "Cnc", "Leo", "Vir", "Lib", "Sco", "Sgr", "Cap", "Aqr", "Psc"]

def ra_dec_to_xyz(ra_hours, dec_deg):
    """
    Mapping for User's Coordinate System:
    North = +Z (Dec = 90)
    East = +X (RA = 0, Dec = 0)
    Up = +Y (RA = 6h, Dec = 0)
    """
    ra_rad = math.radians(ra_hours * 15.0)
    dec_rad = math.radians(dec_deg)
    
    # North is Z (Dec determines Z)
    z = math.sin(dec_rad)
    # The equator is the XY plane
    x = math.cos(dec_rad) * math.cos(ra_rad) # East
    y = math.cos(dec_rad) * math.sin(ra_rad) # Up
    
    return np.array([x, y, z])

def get_face_coords(v):
    """
    Determines cube face and UV mapping for: North=+Z, East=+X, Up=+Y.
    Faces: 0:px (+X/East), 1:nx (-X/West), 2:py (+Y/Up), 3:ny (-Y/Down), 4:pz (+Z/North), 5:nz (-Z/South)
    """
    ax, ay, az = abs(v[0]), abs(v[1]), abs(v[2])
    
    # East (+X) / West (-X)
    if ax >= ay and ax >= az:
        if v[0] > 0: return 0, -v[2]/ax, -v[1]/ax  # px (East): Top is North (+Z)
        else:        return 1,  v[2]/ax, -v[1]/ax  # nx (West): Top is North (+Z)
    # Up (+Y) / Down (-Y)
    elif ay >= ax and ay >= az:
        if v[1] > 0: return 2,  v[0]/ay, -v[2]/ay  # py (Up): Top is North (+Z)
        else:        return 3,  v[0]/ay,  v[2]/ay  # ny (Down): Top is South (-Z)
    # North (+Z) / South (-Z)
    else:
        if v[2] > 0: return 4,  v[0]/az, -v[1]/az  # pz (North): Top is Up (+Y)
        else:        return 5, -v[0]/az, -v[1]/az  # nz (South): Top is Up (+Y)

def uv_to_pixel(u, v_coord):
    # Map [-1, 1] UV space to [0, FACE_SIZE] pixel space
    px = (u + 1) * 0.5 * FACE_SIZE
    py = (v_coord + 1) * 0.5 * FACE_SIZE
    return px, py

def draw_dso(image, x, y, maj_ax, min_ax, pos_ang, type_code, mag):
    scale = FACE_SIZE / 90.0 / 60.0
    maj_val = maj_ax if not pd.isna(maj_ax) else 3.0
    min_val = min_ax if not pd.isna(min_ax) else maj_val
    r_maj = max(3, int(maj_val * scale))
    r_min = max(3, int(min_val * scale))
    
    color = (200, 200, 200)
    if type_code == 'G': color = (240, 230, 200)
    elif 'N' in type_code: color = (255, 120, 180)
    elif 'C' in type_code: color = (180, 200, 255)
    
    alpha_base = max(0.04, min(0.35, 1.0 - (mag / DSO_MAG_LIMIT)))
    mask_size = int(r_maj * 5) + 20
    mask = Image.new('RGBA', (mask_size, mask_size), (0,0,0,0))
    mdraw = ImageDraw.Draw(mask)
    center = mask_size // 2

    for i in range(3):
        curr_r_maj, curr_r_min = r_maj - (i * 2), r_min - (i * 2)
        if curr_r_maj > 0 and curr_r_min > 0:
            mdraw.ellipse([center-curr_r_maj, center-curr_r_min, center+curr_r_maj, center+curr_r_min], 
                          fill=(*color, int(255 * alpha_base * 0.15)))

    for _ in range(12):
        jx, jy = (random.random()-0.5)*r_maj*0.8, (random.random()-0.5)*r_min*0.8
        pr_maj, pr_min = r_maj*random.uniform(0.2,0.5), r_min*random.uniform(0.2,0.5)
        mdraw.ellipse([center+jx-pr_maj, center+jy-pr_min, center+jx+pr_maj, center+jy+pr_min], 
                      fill=(*color, int(255*alpha_base*random.uniform(0.1,0.3))))

    if not pd.isna(pos_ang): mask = mask.rotate(pos_ang)
    mask = mask.filter(ImageFilter.GaussianBlur(radius=max(1, r_maj * 0.25)))
    image.alpha_composite(mask, dest=(int(x)-center, int(y)-center))

def draw_star_shape(draw, x, y, size, color, is_anchor=False):
    x, y = int(x), int(y)
    if size <= 1: draw.point((x, y), fill=color)
    elif size <= 2: draw.rectangle([x-1, y-1, x, y], fill=color)
    elif size <= 3:
        if is_anchor:
            draw.line([(x-1, y), (x+1, y)], fill=color); draw.line([(x, y-1), (x, y+1)], fill=color)
        else: draw.rectangle([x-1, y-1, x+1, y+1], fill=color)
    else:
        draw.line([(x-2, y), (x+2, y)], fill=color); draw.line([(x, y-2), (x, y+2)], fill=color)
        if size > 4:
            draw.line([(x-2, y-2), (x+2, y+2)], fill=color); draw.line([(x+2, y-2), (x-2, y+2)], fill=color)

def get_star_appearance(mag, ci, is_constellation_star, visible_mag_limit):
    alpha = max(1, int(255 * (1.0 if mag <= 0 else 1.0 - (mag / visible_mag_limit) * 0.9)))
    size = max(1, min(5, round(1.0 + (visible_mag_limit - mag) / (visible_mag_limit + 1.5) * 4.0)))
    if is_constellation_star: 
        alpha = max(alpha, 200)
        size = min(5, size + 1)
    
    if pd.isna(ci): base = (255, 255, 255)
    elif ci < -0.1: base = (200, 220, 255)
    elif ci < 0.5:  base = (255, 255, 255)
    elif ci < 1.0:  base = (255, 255, 200)
    else:           base = (255, 210, 190)
    return (*base, alpha), size

def parse_coords(r_str, d_str):
    try:
        h, m, s = map(float, r_str.split(':'))
        ra_h = h + m/60.0 + s/3600.0
        sign = -1 if '-' in d_str else 1
        d, m, s = map(float, d_str.replace('+','').replace('-','').split(':'))
        return ra_h, sign * (d + m/60.0 + s/3600.0)
    except: return None, None

def generate_skybox_textures(visible_mag_limit, csv_file, ngc_file, json_file, out_dir):
    print(f"\n--- Starting Render | Magnitude Limit: {visible_mag_limit} ---")
    
    print("Loading data...")
    df_stars = pd.read_csv(csv_file)
    hip_map = df_stars.dropna(subset=['hip']).set_index('hip')
    df_ngc = pd.read_csv(ngc_file, sep=';')
    
    constellation_hips = set()
    try:
        with open(json_file, 'r') as f:
            data = json.load(f)
            for con in data.get('constellations', []):
                for line in con.get('lines', []):
                    for item in line:
                        if isinstance(item, list):
                            for sub in item: constellation_hips.add(sub)
                        elif isinstance(item, int): constellation_hips.add(item)
    except Exception as e:
        print(f"Warning: Could not parse constellations JSON properly - {e}")

    faces_stars = [Image.new('RGBA', (FACE_SIZE, FACE_SIZE), (0,0,0,0)) for _ in range(6)]
    faces_const = [Image.new('RGBA', (FACE_SIZE, FACE_SIZE), (0,0,0,0)) for _ in range(6)]

    # 1. Constellation Lines
    print("Drawing Constellation Lines...")
    try:
        with open(json_file, 'r') as f:
            data = json.load(f)
            for con in data.get('constellations', []):
                is_zodiac = con.get('iau') in ZODIAC_IAU
                line_color = (255, 255, 0, 120) if is_zodiac else (130, 130, 255, 90)
                draws_c = [ImageDraw.Draw(f) for f in faces_const]
                for line in con.get('lines', []):
                    for i in range(len(line)-1):
                        p1, p2 = line[i], line[i+1]
                        if isinstance(p1, int) and isinstance(p2, int) and p1 in hip_map.index and p2 in hip_map.index:
                            v1 = ra_dec_to_xyz(hip_map.loc[p1]['ra'], hip_map.loc[p1]['dec'])
                            v2 = ra_dec_to_xyz(hip_map.loc[p2]['ra'], hip_map.loc[p2]['dec'])
                            for step in range(150):
                                v = v1 + (v2-v1)*(step/150.0); v /= np.linalg.norm(v)
                                f_idx, u, vc = get_face_coords(v)
                                px, py = uv_to_pixel(u, vc)
                                draws_c[f_idx].point((px, py), fill=line_color)
    except: pass

    # 2. DSOs
    print("Painting Deep Sky Objects...")
    for _, dso in df_ngc.iterrows():
        ra_h, dec_d = parse_coords(str(dso['RA']), str(dso['Dec']))
        if ra_h is None: continue
        mag = dso['V-Mag'] if not pd.isna(dso['V-Mag']) else dso['B-Mag']
        if pd.isna(mag) or mag > DSO_MAG_LIMIT: continue
        v = ra_dec_to_xyz(ra_h, dec_d)
        f_idx, u, vc = get_face_coords(v)
        px, py = uv_to_pixel(u, vc)
        draw_dso(faces_stars[f_idx], px, py, dso['MajAx'], dso['MinAx'], dso['PosAng'], dso['Type'], mag)
        draw_dso(faces_const[f_idx], px, py, dso['MajAx'], dso['MinAx'], dso['PosAng'], dso['Type'], mag)

    # 3. Stars
    print("Rendering Stars...")
    df_sorted = df_stars[df_stars['mag'] <= visible_mag_limit].sort_values('mag', ascending=False)
    for _, star in df_sorted.iterrows():
        is_anchor = int(star['hip']) in constellation_hips if not pd.isna(star['hip']) else False
        v = ra_dec_to_xyz(star['ra'], star['dec'])
        f_idx, u, vc = get_face_coords(v)
        px, py = uv_to_pixel(u, vc)
        color, size = get_star_appearance(star['mag'], star['ci'], is_anchor, visible_mag_limit)
        
        # Explicit Console Output as requested
        if star['mag'] < 3.0: # Filter print statements slightly so it doesn't flood 100k lines
            hip_val = int(star['hip']) if not pd.isna(star['hip']) else "N/A"
            print(f"Drawing Star [HIP: {hip_val:^7}] | Mag: {star['mag']:>5.2f} | Face: {FACE_NAMES[f_idx]}")
        
        draw_star_shape(ImageDraw.Draw(faces_stars[f_idx]), px, py, size, color, is_anchor)
        draw_star_shape(ImageDraw.Draw(faces_const[f_idx]), px, py, size, color, is_anchor)

    # 4. Save
    print(f"\nSaving textures to {out_dir}...")
    for i in range(6):
        faces_stars[i].save(os.path.join(out_dir, f"normal_{FACE_NAMES[i]}.png"))
        faces_const[i].save(os.path.join(out_dir, f"const_{FACE_NAMES[i]}.png"))
    
    print("Success: North is now +Z, East is +X, Up is +Y.")
    print("--- Render Complete ---")
    return True