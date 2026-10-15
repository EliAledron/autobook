from PIL import Image, ImageFilter
import math

def generate_background():
    img_path = "public/autobook-bg.png"
    out_path = "public/autobook-onboarding-bg-edited.png"
    
    print("Loading image...")
    img = Image.open(img_path).convert("RGBA")
    
    # High resolution for print (4K)
    target_w, target_h = 3840, 2160
    
    # 1. Scale and crop to 16:9
    print("Scaling and cropping...")
    img_w, img_h = img.size
    scale = max(target_w / img_w, target_h / img_h)
    
    new_w = int(img_w * scale)
    new_h = int(img_h * scale)
    img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    left = (new_w - target_w) / 2
    top = (new_h - target_h) / 2
    right = (new_w + target_w) / 2
    bottom = (new_h + target_h) / 2
    img = img.crop((left, top, right, bottom))
    
    # 2. Apply Blur
    print("Applying blur...")
    img = img.filter(ImageFilter.GaussianBlur(radius=16))
    
    # Scale by 1.1 to hide edges (matching CSS transform: scale(1.1))
    big_w = int(target_w * 1.1)
    big_h = int(target_h * 1.1)
    img = img.resize((big_w, big_h), Image.Resampling.LANCZOS)
    left = (big_w - target_w) / 2
    top = (big_h - target_h) / 2
    right = (big_w + target_w) / 2
    bottom = (big_h + target_h) / 2
    img = img.crop((left, top, right, bottom))
    
    # 3. Create Gradient Overlay
    print("Creating gradient...")
    c1 = (15, 38, 64, int(255 * 0.65))
    c2 = (42, 82, 152, int(255 * 0.45))
    
    # Create a 1D gradient
    grad = Image.new("RGBA", (1, 1000))
    for y in range(1000):
        t = y / 999.0
        r = int(c1[0] * (1 - t) + c2[0] * t)
        g = int(c1[1] * (1 - t) + c2[1] * t)
        b = int(c1[2] * (1 - t) + c2[2] * t)
        a = int(c1[3] * (1 - t) + c2[3] * t)
        grad.putpixel((0, y), (r, g, b, a))
        
    # Resize and rotate to match 160deg
    grad = grad.resize((target_w * 2, target_h * 2), Image.Resampling.BILINEAR)
    grad = grad.rotate(-20, resample=Image.Resampling.BICUBIC)
    
    left = (grad.width - target_w) / 2
    top = (grad.height - target_h) / 2
    grad = grad.crop((left, top, left + target_w, top + target_h))
    
    # 4. Composite
    print("Compositing...")
    final_img = Image.alpha_composite(img, grad)
    
    print("Saving...")
    final_img.save(out_path, "PNG")
    print(f"Successfully saved edited image to {out_path}")

if __name__ == "__main__":
    generate_background()
