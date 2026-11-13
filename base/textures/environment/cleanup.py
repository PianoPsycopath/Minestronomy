from PIL import Image
import os

def fix_moon_alpha(input_path, output_path):
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return

    img = Image.open(input_path).convert("RGBA")
    pixels = img.load()

    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = pixels[x, y]

            # 1. Skip already fully transparent background pixels
            if a == 0:
                continue

            # 2. Calculate pixel brightness
            brightness = (r + g + b) / 3

            # 3. Target the dark side of the moon
            if brightness < 60: 
                # Set RGB to pure black to prevent bloom glitches
                # Set Alpha very low (e.g., 20 out of 255) so it's highly transparent
                # This allows the blue sky to bleed through during the day
                pixels[x, y] = (0, 0, 0, 20) 

    img.save(output_path)
    print(f"Texture scrubbed and saved to: {output_path}")

fix_moon_alpha("moon_phasesASTRUM.png", "moon_phasesASTRUM.png")