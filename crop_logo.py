from PIL import Image
import os

def process_logo(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()
    
    width, height = img.size
    
    new_data = []
    # Remove white background
    for y in range(height):
        for x in range(width):
            item = img.getpixel((x, y))
            # The word Autobook is at the bottom. The squircle is in the top 80%.
            # Let's completely remove the word AutoBook by hard cropping the bottom.
            # Usually the squircle takes up the top 80% of the generated image.
            if y > height * 0.8:
                new_data.append((255, 255, 255, 0))
                continue
                
            if item[0] > 230 and item[1] > 230 and item[2] > 230:
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(item)
            
    img.putdata(new_data)
    
    # Find bounding box of non-transparent pixels
    bbox = img.getbbox()
    if bbox:
        # Crop out the white space
        img = img.crop(bbox)
        
    # The image is a squircle, so removing white makes the corners transparent.
    img.save(output_path, "PNG")
    print(f"Saved transparent logo to {output_path}")

process_logo("public/autobook-logo.jpg", "public/autobook-logo.png")
