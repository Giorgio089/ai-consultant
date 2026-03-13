import test from 'node:test';
import assert from 'node:assert/strict';

test('getBrowserApi prefers browser and falls back to chrome', async () => {
  globalThis.browser = { tabs: {}, scripting: {} };
  globalThis.chrome = { tabs: { legacy: true }, scripting: { legacy: true } };

  const { getBrowserApi } = await import('../extension/lib/browserApi.js');

  assert.equal(getBrowserApi(), globalThis.browser);

  delete globalThis.browser;
  delete globalThis.chrome;
});
