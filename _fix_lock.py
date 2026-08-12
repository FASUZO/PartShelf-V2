"""Fix inventory_service.py - proper locking"""
with open('app/services/inventory_service.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the function start
func_start = None
for i, line in enumerate(lines):
    if 'def update_inventory_quantity(' in line:
        func_start = i
        break

if func_start is None:
    print("Function not found")
    exit(1)

# Find the function end (next @staticmethod or end of class)
func_end = None
for i in range(func_start + 1, len(lines)):
    if lines[i].strip().startswith('@staticmethod') or lines[i].strip().startswith('@classmethod'):
        func_end = i
        break
    if lines[i].strip() and not lines[i].startswith(' ' * 8) and not lines[i].startswith(' ' * 4) and not lines[i].startswith('#'):
        func_end = i
        break

if func_end is None:
    func_end = len(lines)

# Extract function header and body
func_lines = lines[func_start:func_end]

# Find the docstring end
docstring_end = None
in_docstring = False
for i, line in enumerate(func_lines):
    if '"""' in line:
        if in_docstring:
            docstring_end = i + 1
            break
        else:
            in_docstring = True

if docstring_end is None:
    print("Docstring not found")
    exit(1)

# Split into: header+docstring, body
header_and_doc = func_lines[:docstring_end]
body_lines = func_lines[docstring_end:]

# Remove any existing 'with _inventory_lock:' and its content
new_body = []
skip_indent = None
for line in body_lines:
    if 'with _inventory_lock:' in line:
        skip_indent = len(line) - len(line.lstrip())
        continue
    if skip_indent is not None:
        # Skip lines that are inside the old with block
        current_indent = len(line) - len(line.lstrip()) if line.strip() else 0
        if line.strip() == '' or current_indent > skip_indent:
            continue
        else:
            skip_indent = None
    new_body.append(line)

# Now indent all body lines by 4 spaces (to be inside with _inventory_lock:)
indented_body = []
for line in new_body:
    if line.strip() == '':
        indented_body.append(line)
    else:
        indented_body.append('    ' + line)

# Construct the new function
new_func = []
new_func.extend(header_and_doc)
new_func.append('        with _inventory_lock:\n')
new_func.extend(indented_body)

# Replace in the file
new_lines = lines[:func_start] + new_func + lines[func_end:]

with open('app/services/inventory_service.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Fixed! Total lines: %d -> %d" % (len(lines), len(new_lines)))
