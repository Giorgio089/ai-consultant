import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('firefox manifest includes gecko id and data collection declaration', async () => {
  const raw = await fs.readFile(
    new URL('../extension/manifest.firefox.json', import.meta.url),
    'utf8',
  );
  const manifest = JSON.parse(raw);

  assert.ok(manifest.browser_specific_settings?.gecko?.id);
  assert.ok(Array.isArray(manifest.data_collection_permissions));
});
