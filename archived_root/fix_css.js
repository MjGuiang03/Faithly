const fs = require('fs');
const path = 'c:/Users/HP/Documents/Capstone/Faithly/faithlyweb/src/user/styles/Donation.css';
let content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');
// Keep up to line 1784 (index 1783)
const newLines = lines.slice(0, 1784);
newLines.push('.dark .user-donation-empty-category-name {');
newLines.push('  color: var(--foreground) !important;');
newLines.push('}');
newLines.push('');
newLines.push('.user-donation-manual-info-grid { display: grid; gap: 16px; margin-bottom: 16px; }');
newLines.push('.user-donation-input-group { display: flex; flex-direction: column; gap: 4px; }');
newLines.push('.user-donation-select { width: 100%; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; outline: none; transition: border-color 0.2s; }');
fs.writeFileSync(path, newLines.join('\n'), 'utf8');
console.log('File fixed correctly');
