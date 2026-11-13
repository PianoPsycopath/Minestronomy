from PIL import Image
import os

def create_mer_map(input_path, output_path, bloom_strength=0.3):
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return

    img = Image.open(input_path).convert("RGBA")
    r, g, b, a = img.split()
    
    # Convert to grayscale for the emissive base
    grayscale = img.convert("L")
    
    # Darken the grayscale image to reduce the bloom intensity
    # A bloom_strength of 0.3 means the brightest pixel will only emit at 30% power
    dimmed_emission = grayscale.point(lambda p: p * bloom_strength)
    
    black = Image.new("L", img.size, 0)
    
    # Merge using the dimmed emission in the Green channel
    mer_image = Image.merge("RGBA", (black, dimmed_emission, black, a))
    
    mer_image.save(output_path)
    print(f"Successfully generated: {output_path} at {bloom_strength*100}% emission")

input_filename = "moon_phasesASTRUM.png"
output_filename = "moon_phasesASTRUM_mer.png"

# Try setting this to 0.2 to 0.4 for a much softer lunar glow
create_mer_map(input_filename, output_filename, bloom_strength=0.3)