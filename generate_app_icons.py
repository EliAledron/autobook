import os
from PIL import Image, ImageDraw

def create_adaptive_foreground(logo, size):
    # Android adaptive icon foreground is 108dp x 108dp.
    # Safe zone is central 72dp (66.7%).
    # We scale the logo to fit within ~68% of canvas size.
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    target_dim = int(size * 0.68)
    
    # Calculate scale preserving aspect ratio
    w_ratio = target_dim / logo.width
    h_ratio = target_dim / logo.height
    scale = min(w_ratio, h_ratio)
    
    new_w = int(logo.width * scale)
    new_h = int(logo.height * scale)
    scaled_logo = logo.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    pos_x = (size - new_w) // 2
    pos_y = (size - new_h) // 2
    canvas.paste(scaled_logo, (pos_x, pos_y), scaled_logo)
    return canvas

def create_legacy_icon(logo, size):
    # Legacy icon with clean rounded look or full fit
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
    # Round icon on a white circular base
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

def create_splash(logo, width, height):
    # Clean branded splash with #1a3a5c background and centered logo
    bg_color = (26, 58, 92, 255) # #1a3a5c
    canvas = Image.new("RGBA", (width, height), bg_color)
    
    # Scale logo to ~30% of the smaller dimension (min 120px)
    target_dim = max(120, int(min(width, height) * 0.32))
    scale = min(target_dim / logo.width, target_dim / logo.height)
    new_w = int(logo.width * scale)
    new_h = int(logo.height * scale)
    scaled = logo.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    pos_x = (width - new_w) // 2
    pos_y = (height - new_h) // 2
    canvas.paste(scaled, (pos_x, pos_y), scaled)
    return canvas

def main():
    logo_path = "public/autobook-logo.png"
    if not os.path.exists(logo_path):
        print("Error: Logo not found at", logo_path)
        return
        
    logo = Image.open(logo_path).convert("RGBA")
    print(f"Loaded logo from {logo_path}, dimensions: {logo.size}")
    
    res_base = "android/app/src/main/res"
    
    # Mipmap densities and sizes
    # (density, legacy_size, adaptive_size)
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
        
        # 1. Adaptive foreground
        fg = create_adaptive_foreground(logo, adapt_sz)
        fg.save(os.path.join(folder, "ic_launcher_foreground.png"), "PNG")
        
        # 2. Legacy square launcher
        sq = create_legacy_icon(logo, legacy_sz)
        sq.save(os.path.join(folder, "ic_launcher.png"), "PNG")
        
        # 3. Legacy round launcher
        rnd = create_round_icon(logo, legacy_sz)
        rnd.save(os.path.join(folder, "ic_launcher_round.png"), "PNG")
        
        print(f"Generated {density} icons (legacy: {legacy_sz}x{legacy_sz}, adaptive: {adapt_sz}x{adapt_sz})")
        
    # Remove drawable-v24/ic_launcher_foreground.xml if it exists to prevent Android from using the default robot vector
    robot_vector = os.path.join(res_base, "drawable-v24", "ic_launcher_foreground.xml")
    if os.path.exists(robot_vector):
        os.remove(robot_vector)
        print("Removed default vector drawable-v24/ic_launcher_foreground.xml")
        
    # Splash screens
    splash_configs = [
        ("drawable/splash.png", 480, 320),
        ("drawable-port-mdpi/splash.png", 320, 480),
        ("drawable-port-hdpi/splash.png", 480, 800),
        ("drawable-port-xhdpi/splash.png", 720, 1280),
        ("drawable-port-xxhdpi/splash.png", 960, 1600),
        ("drawable-port-xxxhdpi/splash.png", 1280, 1920),
        ("drawable-land-mdpi/splash.png", 480, 320),
        ("drawable-land-hdpi/splash.png", 800, 480),
        ("drawable-land-xhdpi/splash.png", 1280, 720),
        ("drawable-land-xxhdpi/splash.png", 1600, 960),
        ("drawable-land-xxxhdpi/splash.png", 1920, 1280),
    ]
    
    for rel_path, w, h in splash_configs:
        out_path = os.path.join(res_base, rel_path)
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        sp = create_splash(logo, w, h)
        sp.save(out_path, "PNG")
        print(f"Generated splash: {rel_path} ({w}x{h})")

    # Update web icons too
    p192 = logo.resize((192, 192), Image.Resampling.LANCZOS)
    p192.save("public/logo192.png", "PNG")
    p512 = logo.resize((512, 512), Image.Resampling.LANCZOS)
    p512.save("public/logo512.png", "PNG")
    print("Updated public/logo192.png and public/logo512.png")
    
    print("All app icons and splash assets successfully updated!")

if __name__ == "__main__":
    main()
