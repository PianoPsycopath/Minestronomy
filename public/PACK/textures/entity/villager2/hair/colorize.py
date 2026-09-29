from PIL import Image
import os

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def colorize_grayscale_image(input_path, output_folder, palette):
    base = Image.open(input_path).convert("RGBA")
    os.makedirs(output_folder, exist_ok=True)

    for name, hex_color in palette.items():
        color = hex_to_rgb(hex_color)
        colored = Image.new("RGBA", base.size)

        for y in range(base.height):
            for x in range(base.width):
                gray, _, _, alpha = base.getpixel((x, y))  # grab gray + alpha
                r = int(gray / 255 * color[0])
                g = int(gray / 255 * color[1])
                b = int(gray / 255 * color[2])
                a = alpha  # ✅ preserve original transparency
                colored.putpixel((x, y), (r, g, b, a))

        out_path = os.path.join(output_folder, f"{name}.png")
        colored.save(out_path)
        print(f"Saved: {out_path}")


palette = {
    "sunny-white": "#ede5f8",
    "sunny-very-light-blonde": "#efe1bb",
    "sunny-medium-light-blonde": "#fbe28a",
    "sunny-light-blonde": "#dfbe7a",
    "sunny-medium-blonde": "#c7962d",
    "sunny-dark-blonde": "#ad7a49",

    "sunny-vibrant-orange": "#eb983f",
    "sunny-soft-blonde": "#e99027",
    "sunny-soft-magenta": "#8a6294",
    "sunny-copper-red": "#a1570b",
    "sunny-light-red": "#933f1e",
    "sunny-auburn-red": "#6e2800",

    "sunny-dark-red": "#441600",
    "sunny-light-brown": "#7b5028",
    "sunny-medium-brown": "#654529",
    "sunny-dark-brown": "#442711",
    "sunny-deep-brown": "#2e180e",
    "sunny-soft-black": "#2f2f2f",

    "sunny-reddish-black": "#2c1a1a",
    "sunny-blueish-black": "#202832",
    "sunny-purpleish-black": "#281928",
    "sunny-deep-black": "#1b110d",
    "sunny-dark-gray": "#646775",
    "sunny-light-gray": "#9698a2",

    "sunny-pink": "#ed8dac",
    "sunny-magenta": "#ed8dac",
    "sunny-purple": "#792aac",
    "sunny-blue": "#35399d",
    "sunny-light-blue": "#3aafd9",
    "sunny-cyan": "#158991",

    "sunny-green": "#546d1b",
    "sunny-lime-green": "#70b919",
    "sunny-yellow": "#f8c627",
    "sunny-orange": "#d87d3e",
    "sunny-red": "#a12722"
}

colorize_grayscale_image(
    input_path="Sunny_hair_head.png",
    output_folder="colored_hairs",
    palette=palette
)
