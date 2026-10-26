import os
import shutil
from PIL import Image, ImageDraw

def create_adaptive_foreground(logo, size):
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    target_dim = int(size * 0.68)
    scale = min(target_dim / logo.width, target_dim / logo.height)
    new_w = int(logo.width * scale)
    new_h = int(logo.height * scale)
    scaled_logo = logo.resize((new_w, new_h), Image.Resampling.LANCZOS)
    pos_x = (size - new_w) // 2
    pos_y = (size - new_h) // 2
    canvas.paste(scaled_logo, (pos_x, pos_y), scaled_logo)
    return canvas

def create_legacy_icon(logo, size):
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    target_dim = int(size * 0.90)
    scale = min(target_dim / logo.width, target_dim / logo.height)
    new_w = int(logo.width * scale)
    new_h = int(logo.height * scale)
    scaled = logo.resize((new_w, new_h), Image.Resampling.LANCZOS)
    pos_x = (size - new_w) // 2
    pos_y = (size - new_h) // 2
    canvas.paste(scaled, (pos_x, pos_y), scaled)
    return canvas

def create_round_icon(logo, size):
    base = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(base)
    draw.ellipse((1, 1, size - 2, size - 2), fill=(255, 255, 255, 255))
    target_dim = int(size * 0.72)
    scale = min(target_dim / logo.width, target_dim / logo.height)
    new_w = int(logo.width * scale)
    new_h = int(logo.height * scale)
    scaled = logo.resize((new_w, new_h), Image.Resampling.LANCZOS)
    pos_x = (size - new_w) // 2
    pos_y = (size - new_h) // 2
    base.paste(scaled, (pos_x, pos_y), scaled)
    return base

def main():
    logo_path = "public/autobook-logo.png"
    if not os.path.exists(logo_path):
        print("Error: Logo not found at", logo_path)
        return
        
    logo = Image.open(logo_path).convert("RGBA")
    print(f"Loaded logo from {logo_path}, dimensions: {logo.size}")
    
    res_base = "android/app/src/main/res"
    
    # 1. Generate Mipmap Icons
    densities = [
        ("mdpi", 48, 108),
        ("hdpi", 72, 162),
        ("xhdpi", 96, 216),
        ("xxhdpi", 144, 324),
        ("xxxhdpi", 192, 432),
    ]
    
    for density, legacy_sz, adapt_sz in densities:
        folder = os.path.join(res_base, f"mipmap-{density}")
        os.makedirs(folder, exist_ok=True)
        
        # Adaptive foreground
        fg = create_adaptive_foreground(logo, adapt_sz)
        fg.save(os.path.join(folder, "ic_launcher_foreground.png"), "PNG")
        
        # Legacy square launcher
        sq = create_legacy_icon(logo, legacy_sz)
        sq.save(os.path.join(folder, "ic_launcher.png"), "PNG")
        
        # Legacy round launcher
        rnd = create_round_icon(logo, legacy_sz)
        rnd.save(os.path.join(folder, "ic_launcher_round.png"), "PNG")
        print(f"Generated {density} icons")

    # Remove any leftover vector template
    robot_vector = os.path.join(res_base, "drawable-v24", "ic_launcher_foreground.xml")
    if os.path.exists(robot_vector):
        os.remove(robot_vector)

    # 2. Clean up ALL old static full-screen splash PNGs (which were causing stretching!)
    for root, dirs, files in os.walk(res_base):
        for f in files:
            if f == "splash.png":
                path = os.path.join(root, f)
                os.remove(path)
                print(f"Removed stretched splash bitmap: {path}")

    # 3. Generate un-stretched splash_logo drawables for each density
    splash_logo_sizes = [
        ("drawable-mdpi", 140),
        ("drawable-hdpi", 210),
        ("drawable-xhdpi", 280),
        ("drawable-xxhdpi", 420),
        ("drawable-xxxhdpi", 560),
        ("drawable", 280),
    ]
    for folder_name, sz in splash_logo_sizes:
        folder = os.path.join(res_base, folder_name)
        os.makedirs(folder, exist_ok=True)
        out_img = logo.resize((sz, sz), Image.Resampling.LANCZOS)
        out_img.save(os.path.join(folder, "splash_logo.png"), "PNG")
        print(f"Generated {folder_name}/splash_logo.png ({sz}x{sz})")

    # 4. Create the sleek modern gradient background drawable
    gradient_xml = """<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <gradient
        android:angle="270"
        android:startColor="#0b1e36"
        android:centerColor="#143c68"
        android:endColor="#1d5999"
        android:type="linear" />
</shape>
"""
    with open(os.path.join(res_base, "drawable", "splash_background.xml"), "w", encoding="utf-8") as f:
        f.write(gradient_xml)
    print("Created drawable/splash_background.xml")

    # 5. Create the layer-list splash.xml (guarantees NO stretching on ANY phone aspect ratio!)
    splash_layer_xml = """<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@drawable/splash_background" />
    <item
        android:width="150dp"
        android:height="150dp"
        android:gravity="center">
        <bitmap
            android:gravity="center"
            android:src="@drawable/splash_logo" />
    </item>
</layer-list>
"""
    with open(os.path.join(res_base, "drawable", "splash.xml"), "w", encoding="utf-8") as f:
        f.write(splash_layer_xml)
    print("Created drawable/splash.xml (non-stretching layer-list)")

    # 6. Update web/pwa icons
    p192 = logo.resize((192, 192), Image.Resampling.LANCZOS)
    p192.save("public/logo192.png", "PNG")
    p512 = logo.resize((512, 512), Image.Resampling.LANCZOS)
    p512.save("public/logo512.png", "PNG")
    print("Updated public/logo192.png and public/logo512.png")
    
    print("\n--- ALL ASSETS SUCCESSFULLY REGENERATED ---")

if __name__ == "__main__":
    main()
