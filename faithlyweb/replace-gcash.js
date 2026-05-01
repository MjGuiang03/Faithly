const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'src');
const serverSrcPath = path.join(__dirname, 'server', 'src');

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // For css class names, keep them lowercase but replace gcash with e-wallet
    if (filePath.endsWith('.css')) {
        content = content.replace(/gcash/g, 'e-wallet');
        content = content.replace(/GCash/g, 'E-Wallet');
    } else {
        // UI Text and Variables
        content = content.replace(/GCash/g, 'E-Wallet');
        
        // Lowercase identifiers except paymongo.js
        if (!filePath.endsWith('paymongo.js') && !filePath.endsWith('loans.js')) {
             content = content.replace(/'gcash'/g, "'e-wallet'");
             content = content.replace(/"gcash"/g, '"e-wallet"');
             content = content.replace(/gcash-/g, 'e-wallet-');
             content = content.replace(/gcashLogo/g, 'ewalletLogo');
        }
    }

    // specific fix for Paymongo integration in paymongo.js: 
    // If it was modified accidentally, we'll restore it later, but we skipped it above.
    
    // specific fix for loans.js:
    if (filePath.endsWith('loans.js')) {
        // We need to map 'e-wallet' to 'gcash' for paymongo
        content = content.replace(/'gcash'/g, "'e-wallet'");
        content = content.replace(/paymentMethod === 'e-wallet'/g, "paymentMethod === 'e-wallet'");
        // But for PayMongo, we must ensure it uses 'gcash' or 'paymaya' internally.
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated:', filePath);
    }
}

function walkDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.css')) {
            replaceInFile(fullPath);
        }
    });
}

walkDir(srcPath);
walkDir(serverSrcPath);
console.log('Done.');
