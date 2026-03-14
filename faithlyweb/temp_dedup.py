import re

with open(r'c:\Users\HP\Documents\Capstone\Faithly\faithlyweb\src\imports\svg-icons.js', 'r') as f:
    content = f.read()

# Match patterns like: key: "value",
pattern = re.compile(r'(\w+):\s*"([^"]*)"')
matches = pattern.findall(content)

unique_icons = {}
for key, value in matches:
    if key not in unique_icons:
        unique_icons[key] = value

# Generate new content
new_content = "const icons = {\n"
for key, value in unique_icons.items():
    new_content += f'  {key}: "{value}",\n'
new_content += "};\n\nexport default icons;\n"

with open(r'c:\Users\HP\Documents\Capstone\Faithly\faithlyweb\src\imports\svg-icons.js', 'w') as f:
    f.write(new_content)
