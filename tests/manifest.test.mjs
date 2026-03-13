import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('manifest uses minimal permissions for store submission', async () => {
    const rawManifest = await fs.readFile(
        new URL('../extension/manifest.json', import.meta.url),
        'utf8',
    );
    const manifest = JSON.parse(rawManifest);

    assert.equal(manifest.version, '0.1.1');
    assert.deepEqual(manifest.permissions, ['activeTab', 'scripting']);
    assert.equal('host_permissions' in manifest, false);
});
