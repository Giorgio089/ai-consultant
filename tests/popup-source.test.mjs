import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('popup source avoids innerHTML assignments for marketplace linting', async () => {
  const source = await fs.readFile(
    new URL('../extension/popup.js', import.meta.url),
    'utf8',
  );

  assert.equal(source.includes('.innerHTML ='), false);
  assert.equal(source.includes('.innerHTML;'), false);
});
