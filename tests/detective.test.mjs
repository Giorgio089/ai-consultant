import test from 'node:test';
import assert from 'node:assert/strict';
import { callBotView, getSettings, requestDataConsent, DEFAULT_API_BASE } from '../extension/lib/detective.js';

function fakeFetch(status, body) {
    const calls = [];
    const impl = async (url, init) => {
        calls.push({ url, init });
        return new Response(JSON.stringify(body), { status });
    };
    impl.calls = calls;
    return impl;
}

test('callBotView sends only URL and rendered text length with the key', async () => {
    const fetchImpl = fakeFetch(200, { clue: 'bot-view', findings: [] });
    const result = await callBotView({
        url: 'https://example.com/', renderedTextLength: 1234, apiKey: 'dd_x', fetchImpl,
    });

    assert.equal(result.ok, true);
    assert.equal(fetchImpl.calls[0].url, `${DEFAULT_API_BASE}/api/clue/bot-view`);
    assert.equal(fetchImpl.calls[0].init.headers.authorization, 'Bearer dd_x');
    assert.deepEqual(JSON.parse(fetchImpl.calls[0].init.body), {
        url: 'https://example.com/', rendered: { textLength: 1234 },
    });
});

test('callBotView does not call the API without a key', async () => {
    const fetchImpl = fakeFetch(200, {});
    const result = await callBotView({ url: 'https://example.com/', apiKey: '', fetchImpl });
    assert.equal(result.reason, 'no_key');
    assert.equal(fetchImpl.calls.length, 0);
});

test('callBotView maps API errors', async () => {
    const cases = [[402, 'no_key'], [401, 'invalid_key'], [429, 'rate_limited'], [502, 'error']];
    for (const [status, reason] of cases) {
        const result = await callBotView({ url: 'https://e.com/', apiKey: 'k', fetchImpl: fakeFetch(status, {}) });
        assert.equal(result.reason, reason, String(status));
    }
    const offline = await callBotView({
        url: 'https://e.com/', apiKey: 'k', fetchImpl: async () => { throw new Error('offline'); },
    });
    assert.match(offline.message, /offline/);
});

test('getSettings falls back to the production API', async () => {
    const storage = { get: async () => ({ apiKey: 'dd_y' }) };
    assert.deepEqual(await getSettings(storage), { apiKey: 'dd_y', apiBase: DEFAULT_API_BASE });
});

test('requestDataConsent asks Firefox for browsingActivity and skips Chrome', async () => {
    assert.equal(await requestDataConsent(), true);

    let requested;
    globalThis.browser = {
        runtime: { getBrowserInfo: () => {} },
        permissions: { request: async (p) => { requested = p; return false; } },
    };
    try {
        assert.equal(await requestDataConsent(), false);
        assert.deepEqual(requested, { data_collection: ['browsingActivity'] });
    } finally {
        delete globalThis.browser;
    }
});
