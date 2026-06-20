import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('manifest uses minimal permissions for store submission', async () => {
    const rawManifest = await fs.readFile(
        new URL('../extension/manifest.json', import.meta.url),
        'utf8',
    );
    const manifest = JSON.parse(rawManifest);

    assert.equal(manifest.version, '0.1.2');
    assert.deepEqual(manifest.permissions, ['activeTab', 'scripting']);
    assert.equal('host_permissions' in manifest, false);
    assert.deepEqual(manifest.background.scripts, ['background.js']);
    assert.equal(manifest.background.service_worker, 'background.js');
    assert.ok(manifest.browser_specific_settings?.gecko?.id);
    assert.deepEqual(
        manifest.browser_specific_settings?.gecko?.data_collection_permissions?.required,
        ['none'],
    );
    assert.equal('data_collection_permissions' in manifest, false);
});

test('firefox manifest includes gecko id and data collection declaration', async () => {
  const raw = await fs.readFile(
    new URL('../extension/manifest.firefox.json', import.meta.url),
    'utf8',
  );
  const manifest = JSON.parse(raw);

  assert.equal(manifest.version, '0.1.2');
  assert.ok(manifest.browser_specific_settings?.gecko?.id);
  assert.deepEqual(manifest.background.scripts, ['background.js']);
  assert.equal(manifest.background.service_worker, 'background.js');
  assert.deepEqual(
    manifest.browser_specific_settings?.gecko?.data_collection_permissions?.required,
    ['none'],
  );
  assert.equal('data_collection_permissions' in manifest, false);
  assert.equal('host_permissions' in manifest, false);
});

test('chrome manifest uses minimal permissions', async () => {
  const raw = await fs.readFile(
    new URL('../extension/manifest.chrome.json', import.meta.url),
    'utf8',
  );
  const manifest = JSON.parse(raw);

  assert.equal(manifest.version, '0.1.2');
  assert.deepEqual(manifest.permissions, ['activeTab', 'scripting']);
  assert.equal('host_permissions' in manifest, false);
  assert.equal(manifest.background.service_worker, 'background.js');
});
