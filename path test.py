import os

base_dir = os.path.dirname(os.path.abspath(__file__))
preview_dir = os.path.join(base_dir, 'web', 'previews')

print(f"Checking for images in: {preview_dir}")

if not os.path.exists(preview_dir):
    print("❌ ERROR: The folder 'web/previews' DOES NOT EXIST!")
else:
    files = os.listdir(preview_dir)
    if len(files) == 0:
        print("❌ ERROR: The folder exists, but it is EMPTY!")
    else:
        print("✅ SUCCESS! Found these files:")
        for f in files:
            print(f"  - {f}")