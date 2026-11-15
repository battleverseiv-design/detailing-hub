const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const outputFile = 'C:/Users/evgen/Desktop/all-code.txt';

const extensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.prisma', '.json', '.css', '.md']);
const excludeDirs = new Set(['node_modules', '.next', '.git', 'dist', 'build', '.vscode', '.idea']);

let totalFiles = 0;
let output = '=== CAR DETAILING STUDIO - FULL CODEBASE ===\n\n';

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (excludeDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (extensions.has(ext) && entry.name !== 'package-lock.json' && entry.name !== 'tsconfig.tsbuildinfo') {
        const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          output += '\n\n========================================\nFILE: ' + relPath + '\n========================================\n\n' + content;
          totalFiles++;
        } catch (err) {
          console.error('Error reading', relPath, err.message);
        }
      }
    }
  }
}

walk(rootDir);
fs.writeFileSync(outputFile, output, 'utf8');
console.log('Saved', totalFiles, 'files to', outputFile, 'size:', (fs.statSync(outputFile).size / 1024).toFixed(1), 'KB');
