import fs from 'fs';
import path from 'path';

const ROOT = 'C:/Users/evgen/.gemini/antigravity/scratch/car-detailing-studio';

function walk(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', '.git'].includes(entry.name)) {
        results.push(...walk(full));
      }
    } else {
      results.push(full);
    }
  }
  return results;
}

const all = walk(ROOT);

// 1. lib-code.txt: src/lib and src/types *.ts
const libFiles = all.filter((f) => {
  return (f.includes('/src/lib/') || f.includes('/src/types/')) && f.endsWith('.ts');
});

let libText = '';
for (const f of libFiles) {
  const rel = path.relative(ROOT, f).replace(/\\/g, '/');
  libText += `=== FILE: ${rel} ===\n`;
  libText += fs.readFileSync(f, 'utf8') + '\n\n';
}

fs.writeFileSync(`${ROOT}/lib-code.txt`, libText, 'utf8');
fs.writeFileSync('C:/Users/evgen/Desktop/lib-code.txt', libText, 'utf8');
console.log(`✓ lib-code.txt: ${libFiles.length} files (${(libText.length / 1024).toFixed(1)} KB)`);

// 2. updated-code.txt: prisma/ and src/ (*.prisma, *.ts, *.tsx)
const updatedFiles = all.filter((f) => {
  return (
    (f.includes('/prisma/') || f.includes('/src/')) &&
    (f.endsWith('.prisma') || f.endsWith('.ts') || f.endsWith('.tsx'))
  );
});

let updatedText = '';
for (const f of updatedFiles) {
  const rel = path.relative(ROOT, f).replace(/\\/g, '/');
  updatedText += `=== FILE: ${rel} ===\n`;
  updatedText += fs.readFileSync(f, 'utf8') + '\n\n';
}

fs.writeFileSync(`${ROOT}/updated-code.txt`, updatedText, 'utf8');
fs.writeFileSync('C:/Users/evgen/Desktop/updated-code.txt', updatedText, 'utf8');
console.log(`✓ updated-code.txt: ${updatedFiles.length} files (${(updatedText.length / 1024).toFixed(1)} KB)`);
