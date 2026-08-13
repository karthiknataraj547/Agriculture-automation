from PIL import Image, ImageDraw
import os

def create_agriflow_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    margin = int(size * 0.05)
    bg_box = [margin, margin, size - margin, size - margin]
    radius = int(size * 0.22)
    
    draw.rounded_rectangle(bg_box, radius=radius, fill=(15, 23, 42, 255), outline=(124, 58, 237, 255), width=max(2, int(size * 0.02)))
    
    center = size // 2
    r_outer = int(size * 0.32)
    draw.ellipse([center - r_outer, center - r_outer, center + r_outer, center + r_outer], fill=(30, 27, 75, 255), outline=(16, 185, 129, 255), width=max(2, int(size * 0.015)))

    leaf1 = [
        (center, center + int(size * 0.18)),
        (center - int(size * 0.22), center - int(size * 0.05)),
        (center - int(size * 0.15), center - int(size * 0.22)),
        (center, center - int(size * 0.10))
    ]
    draw.polygon(leaf1, fill=(16, 185, 129, 255))

    leaf2 = [
        (center, center + int(size * 0.18)),
        (center + int(size * 0.22), center - int(size * 0.05)),
        (center + int(size * 0.15), center - int(size * 0.22)),
        (center, center - int(size * 0.10))
    ]
    draw.polygon(leaf2, fill=(167, 139, 250, 255))

    draw.line([center, center + int(size * 0.22), center, center - int(size * 0.20)], fill=(255, 255, 255, 255), width=max(2, int(size * 0.03)))

    return img

out_dir = r"d:\IrIgation\apps\frontend\public"
os.makedirs(out_dir, exist_ok=True)

icon192 = create_agriflow_icon(192)
icon192.save(os.path.join(out_dir, "icon-192.png"))

icon512 = create_agriflow_icon(512)
icon512.save(os.path.join(out_dir, "icon-512.png"))

print("Generated icon-192.png and icon-512.png successfully!")
