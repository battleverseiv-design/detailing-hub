import path from 'path';
import { execSync } from 'child_process';

const pyScriptPath = path.resolve('scripts/create-zip.py');

try {
  execSync(`python "${pyScriptPath}"`, { stdio: 'inherit' });
} catch (err) {
  console.error('Error running zip script:', err);
  process.exit(1);
}
