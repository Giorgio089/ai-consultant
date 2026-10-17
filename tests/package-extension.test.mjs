import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// Build into a temp dir so running the tests leaves dist/ untouched.
async function buildInto(browser, ...extra) {
  const out = await fs.mkdtemp(path.join(os.tmpdir(), 'geo-audit-pkg-'));
  await execFileAsync('node', ['scripts/package-extension.mjs', `--browser=${browser}`, `--out=${out}`, ...extra]);
  return out;
}

test('packaging script creates firefox manifest in dist target', async () => {
  const out = await buildInto('firefox');
  const manifest = JSON.parse(await fs.readFile(path.join(out, 'firefox/manifest.json'), 'utf8'));
  assert.ok(manifest.browser_specific_settings?.gecko?.id);
  assert.deepEqual(
    manifest.browser_specific_settings?.gecko?.data_collection_permissions?.required,
    ['none'],
  );
  assert.equal('data_collection_permissions' in manifest, false);
  assert.equal('host_permissions' in manifest, false);
  await assert.rejects(fs.access(path.join(out, 'firefox/.DS_Store')));
  await assert.rejects(fs.access(path.join(out, 'firefox/manifest.chrome.json')));
  await fs.rm(out, { recursive: true, force: true });
});

test('packaging script writes a versioned zip with --zip', async () => {
  const out = await buildInto('chrome', '--zip');
  const { version } = JSON.parse(await fs.readFile('extension/manifest.chrome.json', 'utf8'));
  const zip = await fs.stat(path.join(out, `geo-page-audit-${version}-chrome.zip`));
  assert.ok(zip.size > 0);
  await fs.rm(out, { recursive: true, force: true });
});
