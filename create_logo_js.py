
import os

input_path = r'c:\Users\saksh\satva-organics\src\utils\logo_base64.txt'
output_path = r'c:\Users\saksh\satva-organics\src\utils\logo.js'

try:
    with open(input_path, 'r') as f:
        base64_str = f.read().strip()
    
    # Construct the JS content
    # We use a raw string for the base64 part just in case, though it shouldn't have special chars
    js_content = 'export const logoBase64 = "data:image/jpeg;base64,' + base64_str + '";'
    
    with open(output_path, 'w') as f:
        f.write(js_content)
        
    print(f'Successfully created {output_path}')
except Exception as e:
    print(f'Error: {e}')
