from PIL import Image
import os

input_path = '/Users/tyler.le/Documents/School notes/SEG/Assignment 2/uottahack2026/website/src/assets/scope_pattern.png'
output_path = '/Users/tyler.le/Documents/School notes/SEG/Assignment 2/uottahack2026/website/src/assets/scope_pattern_spaced.png'

try:
    img = Image.open(input_path)
    width, height = img.size
    
    # 300% space implies the total tile should be larger. 
    # If icon is 1 unit, adding 400% space means gap is 4 units. Total tile = 5 units.
    scale_factor = 5
    
    new_width = width * scale_factor
    new_height = height * scale_factor
    
    # Create transparent background
    new_img = Image.new("RGBA", (new_width, new_height), (0, 0, 0, 0))
    
    # Center the original image
    offset_x = (new_width - width) // 2
    offset_y = (new_height - height) // 2
    
    new_img.paste(img, (offset_x, offset_y))
    
    new_img.save(output_path)
    print(f"Successfully created spaced image at {output_path}")
    print(f"Original size: {width}x{height}, New size: {new_width}x{new_height}")
    
except Exception as e:
    print(f"Error processing image: {e}")
