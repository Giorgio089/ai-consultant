import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const extensionDir = path.join(rootDir, 'extension');
const distDir = path.join(rootDir, 'dist');

const browserArg = process.argv.find((arg) => arg.startsWith('--browser='));
const browser = browserArg?.split('=')[1];

if (!['chrome', 'firefox'].includes(browser)) {
  throw new Error('Usage: node scripts/package-extension.mjs --browser=chrome|firefox');
}

const targetDir = path.join(distDir, browser);
const sourceManifestPath = path.join(extensionDir, `manifest.${browser}.json`);
const targetManifestPath = path.join(targetDir, 'manifest.json');

await fs.mkdir(distDir, { recursive: true });
await fs.rm(targetDir, { recursive: true, force: true });
await fs.mkdir(targetDir, { recursive: true });

await fs.cp(extensionDir, targetDir, {
  recursive: true,
  filter(source) {
    const basename = path.basename(source);

    if (basename === 'package.json') return false;
    if (basename === 'manifest.chrome.json') return false;
    if (basename === 'manifest.firefox.json') return false;

    return true;
  },
});

const manifest = await fs.readFile(sourceManifestPath, 'utf8');
await fs.writeFile(targetManifestPath, manifest);
