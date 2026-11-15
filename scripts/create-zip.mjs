import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const srcDir = path.resolve('.');
const destZip = 'C:\\Users\\evgen\\Desktop\\car-detailing-studio-latest.zip';
const tempDir = path.join(process.env.TEMP || '.', `detailing-pkg-${Date.now()}`);

console.log('Packaging project to', destZip);

// Копируем файлы без node_modules, .next, .git
fs.mkdirSync(tempDir, { recursive: true });

const ignored = new Set(['node_modules', '.next', '.git']);

function copyDir(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDir(srcDir, tempDir);

// Сжимаем через встроенную команду PowerShell
try {
  if (fs.existsSync(destZip)) {
    fs.unlinkSync(destZip);
  }
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${tempDir}\\*' -DestinationPath '${destZip}' -Force"`, { stdio: 'inherit' });
  const stat = fs.statSync(destZip);
  console.log(`Successfully created ${destZip} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
