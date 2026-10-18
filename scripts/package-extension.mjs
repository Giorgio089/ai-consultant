import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

/**
 * Builds a store-ready copy of the extension.
 *
 * Usage: node scripts/package-extension.mjs --browser=chrome|firefox [--out=<dir>] [--zip]
 *   --out  target directory (default: dist/)
 *   --zip  also writes <out>/geo-page-audit-<version>-<browser>.zip for store upload
 */

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const extensionDir = path.join(rootDir, 'extension');

const argValue = (name) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=')[1];
const browser = argValue('browser');
const distDir = path.resolve(argValue('out') ?? path.join(rootDir, 'dist'));
const withZip = process.argv.includes('--zip');

if (!['chrome', 'firefox'].includes(browser)) {
  throw new Error('Usage: node scripts/package-extension.mjs --browser=chrome|firefox [--out=<dir>] [--zip]');
}

// All manifests must agree on the version, otherwise the stores get mismatched builds.
const manifestNames = ['manifest.json', 'manifest.chrome.json', 'manifest.firefox.json'];
const versions = await Promise.all(
  manifestNames.map(async (name) => JSON.parse(await fs.readFile(path.join(extensionDir, name), 'utf8')).version),
);
if (new Set(versions).size !== 1) {
  throw new Error(`Manifest versions differ: ${manifestNames.map((n, i) => `${n}=${versions[i]}`).join(', ')}`);
}
const version = versions[0];

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

    if (basename === '.DS_Store') return false;
    if (basename === 'package.json') return false;
    if (basename === 'manifest.chrome.json') return false;
    if (basename === 'manifest.firefox.json') return false;

    return true;
  },
});

const manifest = await fs.readFile(sourceManifestPath, 'utf8');
await fs.writeFile(targetManifestPath, manifest);

if (withZip) {
  const zipPath = path.join(distDir, `geo-page-audit-${version}-${browser}.zip`);
  await fs.rm(zipPath, { force: true });
  // -X drops extra file attributes so the archive is reproducible across machines.
  await execFileAsync('zip', ['-r', '-X', '-q', zipPath, '.'], { cwd: targetDir });
  console.log(zipPath);
}
