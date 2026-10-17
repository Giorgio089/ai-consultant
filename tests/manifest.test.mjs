import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('manifest uses minimal permissions for store submission', async () => {
    const rawManifest = await fs.readFile(
        new URL('../extension/manifest.json', import.meta.url),
        'utf8',
    );
    const manifest = JSON.parse(rawManifest);

    assert.equal(manifest.version, '0.2.0');
    assert.deepEqual(manifest.permissions, ['activeTab', 'scripting', 'storage']);
    assert.equal('host_permissions' in manifest, false);
    assert.equal('background' in manifest, false);
    assert.ok(manifest.browser_specific_settings?.gecko?.id);
    assert.deepEqual(
        manifest.browser_specific_settings?.gecko?.data_collection_permissions?.required,
        ['none'],
    );
    assert.deepEqual(
        manifest.browser_specific_settings?.gecko?.data_collection_permissions?.optional,
        ['browsingActivity'],
    );
    assert.equal('data_collection_permissions' in manifest, false);
});

test('firefox manifest includes gecko id and data collection declaration', async () => {
  const raw = await fs.readFile(
    new URL('../extension/manifest.firefox.json', import.meta.url),
    'utf8',
  );
  const manifest = JSON.parse(raw);

  assert.equal(manifest.version, '0.2.0');
  assert.ok(manifest.browser_specific_settings?.gecko?.id);
  assert.equal('background' in manifest, false);
  assert.deepEqual(
    manifest.browser_specific_settings?.gecko?.data_collection_permissions?.required,
    ['none'],
  );
  assert.deepEqual(
    manifest.browser_specific_settings?.gecko?.data_collection_permissions?.optional,
    ['browsingActivity'],
  );
  assert.equal(manifest.browser_specific_settings.gecko.strict_min_version, '140.0');
  // data_collection_permissions needs Firefox for Android 142+.
  assert.equal(manifest.browser_specific_settings.gecko_android?.strict_min_version, '142.0');
  assert.equal('data_collection_permissions' in manifest, false);
  assert.equal('host_permissions' in manifest, false);
});

test('chrome manifest uses minimal permissions', async () => {
  const raw = await fs.readFile(
    new URL('../extension/manifest.chrome.json', import.meta.url),
    'utf8',
  );
  const manifest = JSON.parse(raw);

  assert.equal(manifest.version, '0.2.0');
  assert.deepEqual(manifest.permissions, ['activeTab', 'scripting', 'storage']);
  assert.equal('host_permissions' in manifest, false);
  assert.equal('background' in manifest, false);
});

const readManifest = async (name) =>
  JSON.parse(await fs.readFile(new URL(`../extension/${name}`, import.meta.url), 'utf8'));

test('dev manifest mirrors the firefox manifest', async () => {
  assert.deepEqual(await readManifest('manifest.json'), await readManifest('manifest.firefox.json'));
});

test('store descriptions fit the Chrome Web Store limit of 132 characters', async () => {
  for (const name of ['manifest.json', 'manifest.chrome.json', 'manifest.firefox.json']) {
    const { description } = await readManifest(name);
    assert.ok(description.length <= 132, `${name} description has ${description.length} characters`);
  }
});
