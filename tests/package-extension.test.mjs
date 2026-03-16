import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

test('packaging script creates firefox manifest in dist target', async () => {
  await execFileAsync('node', ['scripts/package-extension.mjs', '--browser=firefox']);
  const manifest = JSON.parse(await fs.readFile('dist/firefox/manifest.json', 'utf8'));
  assert.ok(manifest.browser_specific_settings?.gecko?.id);
  assert.deepEqual(manifest.background.scripts, ['background.js']);
  assert.equal(manifest.background.service_worker, 'background.js');
  assert.deepEqual(
    manifest.browser_specific_settings?.gecko?.data_collection_permissions?.required,
    ['none'],
  );
  assert.equal('data_collection_permissions' in manifest, false);
  assert.equal('host_permissions' in manifest, false);
  await assert.rejects(fs.access('dist/firefox/.DS_Store'));
});
