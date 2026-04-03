import os, json, re

src_dir = r'c:\Users\HP\Documents\Capstone\Faithly\faithlyweb\src'

def guess_icon(context, svg):
    c = context.lower()
    # Strip javascript/react boilerplate from context that can poison heuristic matching
    c = re.sub(r'const\s*\{.*?\}.*?;', '', c)
    c = re.sub(r'useauth\(.*?\)', '', c)
    c = re.sub(r'import\s+.*?;', '', c)
    c = re.sub(r'import\s*\{.*?\}.*?;', '', c, flags=re.DOTALL)
    c = re.sub(r'classname=(["\'][^"\']+["\'])', '', c)
    c = re.sub(r'<[^>]+>', '', c)  # optionally strip tags from context
    c += " " + svg.lower()
    
    if 'search' in c: return 'Search'
    if 'edit' in c or 'pencil' in c: return 'Edit'
    if 'trash' in c or 'delete' in c: return 'Trash2'
    if 'close' in c or 'dismiss' in c or 'x-btn' in c or 'brand' in c: return 'X'
    if 'approve' in c or 'check' in c or 'confirm' in c or 'success' in c or 'done' in c or 'verified' in c: return 'CheckCircle'
    if 'reject' in c or 'cancel' in c or 'error' in c: return 'XCircle'
    
    if 'att' in c or 'servic' in c or 'calendar' in c or 'event' in c or 'date' in c or 'schedule' in c: return 'CalendarDays'
    if 'donat' in c or 'fund' in c or 'amount' in c or 'peso' in c or 'heart' in c: return 'Heart'
    if 'loan' in c or 'disburs' in c or 'payment' in c or 'repay' in c: return 'Banknote'
    if 'saving' in c or 'goal' in c or 'target' in c: return 'PiggyBank'
    
    if 'print' in c or 'export' in c or 'pdf' in c: return 'Printer'
    if 'receipt' in c or 'proof' in c or 'upload' in c or 'document' in c or 'file' in c or 'report' in c: return 'FileText'
    
    if 'user' in c or 'member' in c or 'officer' in c or 'avatar' in c or 'profile' in c:
        if 'total' in c or 'users' in c: return 'Users'
        return 'User'
        
    if 'branch' in c or 'pin' in c or 'loc' in c: return 'MapPin'
    if 'notif' in c or 'alert' in c: return 'Bell'
    if 'set' in c or 'gear' in c: return 'Settings'
    if 'dash' in c or 'home' in c: return 'LayoutDashboard'
    if 'log' in c or 'sign' in c: return 'LogIn'
    if 'chat' in c or 'msg' in c or 'bot' in c or 'ask' in c: return 'MessageCircle'
    
    if 'pass' in c or 'secur' in c or 'lock' in c: return 'Lock'
    if 'mail' in c or 'email' in c: return 'Mail'
    if 'phone' in c: return 'Phone'
    
    if 'add' in c or 'plus' in c or 'new' in c: return 'PlusCircle'
    if 'back' in c or 'prev' in c: return 'ArrowLeft'
    if 'next' in c or 'forward' in c or 'chevron' in c: return 'ChevronRight'
    if 'menu' in c or 'bar' in c: return 'Menu'
    
    return 'Circle'

svg_pattern = re.compile(r'(<svg([^>]*)>.*?</svg>)', re.IGNORECASE | re.DOTALL)
class_pattern = re.compile(r'className=(["\'][^"\']+["\'])', re.IGNORECASE)
# Added \b so it doesn't match strokeWidth
width_pattern = re.compile(r'\bwidth=(["\']?.*?["\']?)[\s>]', re.IGNORECASE)
height_pattern = re.compile(r'\bheight=(["\']?.*?["\']?)[\s>]', re.IGNORECASE)
stroke_pattern = re.compile(r'stroke=(["\'][^"\']+["\'])', re.IGNORECASE)
fill_pattern = re.compile(r'fill=(["\'][^"\']+["\'])', re.IGNORECASE)

files_changed = 0

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.js') or file.endswith('.jsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                original_content = f.read()
            
            content = original_content
            used_icons = set()
            
            offset = 0
            new_content = ""
            last_end = 0
            
            for m in svg_pattern.finditer(original_content):
                svg_code = m.group(1)
                svg_attrs = m.group(2)
                
                # Get close context strictly from JSX body (to avoid high-level file declarations like useAuth)
                # Let's peek backwards until we hit a > or a < to stay inside the tag tree or text block
                start_idx = max(0, m.start() - 120)
                end_idx = min(len(original_content), m.end() + 60)
                context = original_content[start_idx:end_idx].strip()
                
                icon_name = guess_icon(context, svg_code)
                used_icons.add(icon_name)
                
                props = []
                
                # Extract className
                cls_match = class_pattern.search(svg_attrs)
                if cls_match: props.append(f"className={cls_match.group(1)}")
                    
                # Extract width/height carefully
                w_match = width_pattern.search(svg_attrs + " ")
                h_match = height_pattern.search(svg_attrs + " ")
                size_val = "20"
                if w_match:
                    val = w_match.group(1).strip('"\'')
                    if val.isdigit() or val.replace('.','').isdigit():
                        size_val = val
                elif h_match:
                    val = h_match.group(1).strip('"\'')
                    if val.isdigit() or val.replace('.','').isdigit():
                        size_val = val
                props.append(f"size={{{size_val}}}")
                
                # Extract stroke (maps to color in Lucide)
                s_match = stroke_pattern.search(svg_code) 
                if s_match and s_match.group(1).strip('"\'') != 'currentColor':
                    props.append(f"color={s_match.group(1)}")
                    
                # Extract fill
                f_match = fill_pattern.search(svg_code)
                if f_match and f_match.group(1).strip('"\'') != 'none':
                    props.append(f"fill={f_match.group(1)}")
                
                props_str = " ".join(props)
                replacement = f"<{icon_name} {props_str} />"
                
                new_content += original_content[last_end:m.start()] + replacement
                last_end = m.end()
            
            new_content += original_content[last_end:]
            
            if new_content != original_content:
                # handle imports
                import_stmt = f"import {{ {', '.join(sorted(used_icons))} }} from 'lucide-react';\n"
                lucide_match = re.search(r'import\s+\{([^}]+)\}\s+from\s+[\'"]lucide-react[\'"];?', new_content)
                if lucide_match:
                    existing_icons = {i.strip() for i in lucide_match.group(1).split(',')}
                    all_icons = sorted(existing_icons.union(used_icons))
                    new_import = f"import {{ {', '.join(all_icons)} }} from 'lucide-react';"
                    new_content = new_content[:lucide_match.start()] + new_import + new_content[lucide_match.end():]
                else:
                    # insert after last import
                    last_import_match = list(re.finditer(r'^import .*?;?$', new_content, re.MULTILINE))
                    if last_import_match:
                        last_import_end = last_import_match[-1].end()
                        new_content = new_content[:last_import_end] + "\n" + import_stmt + new_content[last_import_end:]
                    else:
                        new_content = import_stmt + new_content
                        
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                files_changed += 1

print(f"Codemod v3 applied to {files_changed} files.")
