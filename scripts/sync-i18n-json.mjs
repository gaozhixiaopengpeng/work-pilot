import { mkdir, readdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const srcDir = path.join(projectRoot, 'src', 'i18n');
const distDir = path.join(projectRoot, 'dist', 'i18n');

async function main() {
  await mkdir(distDir, { recursive: true });
  const files = await readdir(srcDir);
  const jsonFiles = files.filter(
    (name) => name.startsWith('ui-strings.') && name.endsWith('.json')
  );

  await Promise.all(
    jsonFiles.map((name) =>
      copyFile(path.join(srcDir, name), path.join(distDir, name))
    )
  );
}

await main();
