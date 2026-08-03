import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = fileURLToPath(new URL('../dist/', import.meta.url));

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : path;
  }));
  return files.flat();
}

const allFiles = (await walk(distDir))
  .filter(path => !path.endsWith('sw.js') && !path.endsWith('precache-manifest.json'))
  .sort();
const hash = createHash('sha256');

for (const path of allFiles) {
  hash.update(relative(distDir, path));
  hash.update(await readFile(path));
}

const version = hash.digest('hex').slice(0, 16);
const coreFiles = allFiles
  .map(path => `/${relative(distDir, path).split(sep).join('/')}`)
  .filter(path => path.endsWith('.html')
    || path.startsWith('/assets/')
    || path === '/favicon.svg'
    || path === '/icons.svg');

await writeFile(join(distDir, 'precache-manifest.json'), `${JSON.stringify({ version, files: coreFiles }, null, 2)}\n`);

const serviceWorkerPath = join(distDir, 'sw.js');
const serviceWorker = await readFile(serviceWorkerPath, 'utf8');
if (!serviceWorker.includes('__BUILD_ID__')) throw new Error('Service Worker build ID placeholder missing.');
await writeFile(serviceWorkerPath, serviceWorker.replaceAll('__BUILD_ID__', version));

console.log(`Precache manifest: ${coreFiles.length} files, version ${version}`);
