const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, 'docs');
if (!fs.existsSync(dist)) fs.mkdirSync(dist);

// render ejs to static html
ejs.renderFile(path.join(__dirname, 'views/index.ejs'), {}, (err, html) => {
    if (err) throw err;
    fs.writeFileSync(path.join(dist, 'index.html'), html);
});

// copy static assets
function copyDir(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) copyDir(srcPath, destPath);
        else fs.copyFileSync(srcPath, destPath);
    }
}

copyDir(path.join(__dirname, 'public'), dist);
console.log('built to docs/');