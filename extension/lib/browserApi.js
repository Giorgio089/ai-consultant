export function getBrowserApi() {
  if (globalThis.browser) return globalThis.browser;
  if (globalThis.chrome) return globalThis.chrome;
  throw new Error('Browser extension API is not available.');
}
