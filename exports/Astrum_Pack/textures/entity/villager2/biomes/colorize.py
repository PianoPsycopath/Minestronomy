from PIL import Image
import os
import colorsys

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def rotate_hue(r, g, b, degrees):
    h, l, s = colorsys.rgb_to_hls(r/255, g/255, b/255)
    h = (h + degrees / 360.0) % 1.0
    r2, g2, b2 = colorsys.hls_to_rgb(h, l, s)
    return int(r2 * 255), int(g2 * 255), int(b2 * 255)

def colorize_image(grayscale, target_rgb):
    colored = Image.new("RGBA", grayscale.size)
    for y in range(grayscale.height):
        for x in range(grayscale.width):
            gray, _, _, alpha = grayscale.getpixel((x, y))
            r = int(gray / 255 * target_rgb[0])
            g = int(gray / 255 * target_rgb[1])
            b = int(gray / 255 * target_rgb[2])
            colored.putpixel((x, y), (r, g, b, alpha))
    return colored

def colorize_and_overlay(grayscale_path, overlay_path, output_folder, palette):
    base = Image.open(grayscale_path).convert("RGBA")
    name_root = os.path.splitext(grayscale_path)[0]
    secondary_path = f"{name_root}secondary.png"
    ternary_path = f"{name_root}ternary.png"

    secondary = Image.open(secondary_path).convert("RGBA") if os.path.exists(secondary_path) else None
    ternary = Image.open(ternary_path).convert("RGBA") if os.path.exists(ternary_path) else None

    overlay = Image.open(overlay_path).convert("RGBA")
    os.makedirs(output_folder, exist_ok=True)

    for name, hex_color in palette.items():
        base_color = hex_to_rgb(hex_color)

        # Colorize main, secondary, and ternary
        main_colored = colorize_image(base, base_color)

        if secondary:
            sec_color = rotate_hue(*base_color, -14)
            sec_colored = colorize_image(secondary, sec_color)
            main_colored = Image.alpha_composite(main_colored, sec_colored)

        if ternary:
            ter_color = rotate_hue(*base_color, 91)
            ter_colored = colorize_image(ternary, ter_color)
            main_colored = Image.alpha_composite(main_colored, ter_colored)

        # Overlay static image
        main_colored.alpha_composite(overlay)

        out_path = os.path.join(output_folder, f"{name}.png")
        main_colored.save(out_path)
        print(f"Saved: {out_path}")


palette = {
    "biome_swamp-white": "#ede5f8",
    "biome_swamp-very-light-blonde": "#efe1bb",
    "biome_swamp-medium-light-blonde": "#fbe28a",
    "biome_swamp-light-blonde": "#dfbe7a",
    "biome_swamp-medium-blonde": "#c7962d",
    "biome_swamp-dark-blonde": "#ad7a49",
    "biome_swamp-vibrant-orange": "#eb983f",
    "biome_swamp-soft-blonde": "#e99027",
    "biome_swamp-soft-magenta": "#8a6294",
    "biome_swamp-copper-red": "#a1570b",
    "biome_swamp-light-red": "#933f1e",
    "biome_swamp-auburn-red": "#6e2800",
    "biome_swamp-dark-red": "#441600",
    "biome_swamp-light-brown": "#7b5028",
    "biome_swamp-medium-brown": "#654529",
    "biome_swamp-dark-brown": "#442711",
    "biome_swamp-deep-brown": "#2e180e",
    "biome_swamp-soft-black": "#2f2f2f",
    "biome_swamp-reddish-black": "#2c1a1a",
    "biome_swamp-blueish-black": "#202832",
    "biome_swamp-purpleish-black": "#281928",
    "biome_swamp-deep-black": "#1b110d",
    "biome_swamp-dark-gray": "#646775",
    "biome_swamp-light-gray": "#9698a2",
    "biome_swamp-pink": "#ed8dac",
    "biome_swamp-magenta": "#ed8dac",
    "biome_swamp-purple": "#792aac",
    "biome_swamp-blue": "#35399d",
    "biome_swamp-light-blue": "#3aafd9",
    "biome_swamp-cyan": "#158991",
    "biome_swamp-green": "#546d1b",
    "biome_swamp-lime-green": "#70b919",
    "biome_swamp-yellow": "#f8c627",
    "biome_swamp-orange": "#d87d3e",
    "biome_swamp-red": "#a12722"
}

colorize_and_overlay(
    grayscale_path="biome_swamp-.png",
    output_folder="biome_swamp",
    overlay_path="biome_swamp-shoes.png",
    palette=palette
)
