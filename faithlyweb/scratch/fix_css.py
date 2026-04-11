import re
import os

filepath = r"c:\Users\HP\Documents\Capstone\Faithly\faithlyweb\src\loanAdmin\styles\loanAdminLoanManagement.css"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update max-width
content = content.replace("max-width: 660px;", "max-width: 960px;")

# 2. Update dm-body and add dm-layout-grid
body_pattern = r"\.dm-body \{(.*?)\}"
body_replacement = r"""\.dm-body {
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

/* ── Layout Grid ── */
.dm-layout-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    align-items: start;
}

.dm-column-left,
.dm-column-right {
    display: flex;
    flex-direction: column;
    gap: 18px;
}"""
content = re.sub(body_pattern, body_replacement, content, flags=re.DOTALL)

# 3. Compact various elements (replace 24px with 16px or 12px)
content = content.replace("padding: 24px; /* Enhanced breathing room */", "padding: 16px; /* Compacted */")
# Special case for dm-ic and dm-doc-footer which we want even more compact (12px)
# But since I already did a global replace above, I'll refine them if they match.
content = content.replace(".dm-ic {\n    padding: 16px; /* Compacted */", ".dm-ic {\n    padding: 12px 16px; /* Compacted */")
content = content.replace(".dm-doc-footer {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    padding: 16px; /* Compacted */", ".dm-doc-footer {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    padding: 12px 16px; /* Compacted */")

# 4. Fix media query
content = content.replace('@media (max-width: 1024px) {\n    .loan-admin-mgmt-stats {\n        grid-template-columns: 1fr;\n    }\n}', 
                          '@media (max-width: 1024px) {\n    .loan-admin-mgmt-stats {\n        grid-template-columns: 1fr;\n    }\n    .dm-layout-grid {\n        grid-template-columns: 1fr;\n    }\n}')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Supposedly fixed CSS successfully.")
