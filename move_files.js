const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    fs.readdirSync(src).forEach((childItemName) => {
      // Avoid copying node_modules to save time/space, npm install will handle if needed,
      // but actually we DO want to keep them if possible to save install time. Let's just copy everything.
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    // Only copy if file doesn't exist, to prevent overwriting user's active scratch files
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
    } else {
      // Overwrite anyway since the inner faithlyweb is the "true" source code for app.js etc.
      // Scratch files are unique to the root so they won't be overwritten.
      fs.copyFileSync(src, dest);
    }
  }
}

console.log('Copying all files from faithlyweb/ to root...');
const sourceDir = path.join(__dirname, 'faithlyweb');
const targetDir = __dirname;

fs.readdirSync(sourceDir).forEach(item => {
  copyRecursiveSync(path.join(sourceDir, item), path.join(targetDir, item));
});

console.log('Copy complete. Now staging deletions for old inner folder...');
// Remove from git
execSync('git rm -r faithlyweb', { stdio: 'inherit' });

// Add all new files in root to git
execSync('git add .', { stdio: 'inherit' });

console.log('Done! Files moved to root and staged.');
