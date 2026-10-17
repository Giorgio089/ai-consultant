import test from 'node:test';
import assert from 'node:assert/strict';
import {
    callBotView, getSettings, normalizeApiBase, requestDataConsent, DEFAULT_API_BASE,
} from '../extension/lib/detective.js';

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

function fakeFetch(status, body, headers = JSON_HEADERS) {
    const calls = [];
    const impl = async (url, init) => {
        calls.push({ url, init });
        const payload = typeof body === 'string' ? body : JSON.stringify(body);
        return new Response(payload, { status, headers });
    };
    impl.calls = calls;
    return impl;
}

const call = (fetchImpl, extra = {}) => callBotView({ url: 'https://e.com/', apiKey: 'k', fetchImpl, ...extra });

test('callBotView sends only URL and rendered text length with the key', async () => {
    const fetchImpl = fakeFetch(200, { clue: 'bot-view', findings: [], bots: [] });
    const result = await callBotView({
        url: 'https://example.com/', renderedTextLength: 1234, apiKey: 'dd_x', fetchImpl,
    });

    assert.equal(result.ok, true);
    assert.equal(fetchImpl.calls[0].url, `${DEFAULT_API_BASE}/api/clue/bot-view`);
    assert.equal(fetchImpl.calls[0].init.headers.authorization, 'Bearer dd_x');
    assert.ok(fetchImpl.calls[0].init.signal, 'request carries a timeout signal');
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
        const result = await call(fakeFetch(status, {}));
        assert.equal(result.ok, false, String(status));
        assert.equal(result.reason, reason, String(status));
        assert.equal(typeof result.message, 'string');
    }
    const offline = await call(async () => { throw new Error('offline'); });
    assert.equal(offline.reason, 'error');
    assert.match(offline.message, /offline/);
});

test('callBotView uses the server message for 402 and generic errors', async () => {
    const paid = await call(fakeFetch(402, { message: 'Buy credits first.' }));
    assert.deepEqual(paid, { ok: false, reason: 'no_key', message: 'Buy credits first.' });
    const broken = await call(fakeFetch(500, { message: 'Database on fire.' }));
    assert.equal(broken.message, 'Database on fire.');
});

test('callBotView survives non-JSON error bodies', async () => {
    const html = '<html><body>Bad gateway</body></html>';
    for (const status of [401, 402, 429, 502]) {
        const result = await call(fakeFetch(status, html, { 'content-type': 'text/html' }));
        assert.equal(result.ok, false, String(status));
    }
    const gateway = await call(fakeFetch(502, html, { 'content-type': 'text/html' }));
    assert.equal(gateway.message, 'datadetective.app answered 502.');
    // Claims JSON but isn't.
    const lying = await call(fakeFetch(500, 'not json', JSON_HEADERS));
    assert.equal(lying.message, 'datadetective.app answered 500.');
});

test('callBotView rejects a 200 that is not JSON', async () => {
    const result = await call(fakeFetch(200, '<html>captive portal</html>', { 'content-type': 'text/html' }));
    assert.deepEqual(result, { ok: false, reason: 'error', message: 'Unexpected answer from datadetective.app.' });
    const broken = await call(fakeFetch(200, '{"findings": [', JSON_HEADERS));
    assert.equal(broken.message, 'Unexpected answer from datadetective.app.');
});

test('callBotView rejects a 200 without findings or with malformed bots', async () => {
    for (const body of [{}, { findings: 'none' }, [], null, 42, { findings: [], bots: 'x' }]) {
        const result = await call(fakeFetch(200, body));
        assert.equal(result.ok, false, JSON.stringify(body));
        assert.equal(result.message, 'Unexpected answer from datadetective.app.');
    }
    const minimal = await call(fakeFetch(200, { findings: [] }));
    assert.equal(minimal.ok, true);
});

test('callBotView gives up after the timeout', async () => {
    let seenSignal;
    const hanging = (url, init) => new Promise((_, reject) => {
        seenSignal = init.signal;
        init.signal.addEventListener('abort', () => reject(init.signal.reason));
    });
    // AbortSignal.timeout uses an unref'd timer in Node; keep the loop alive meanwhile.
    const keepAlive = setInterval(() => {}, 1000);
    const started = Date.now();
    const result = await call(hanging, { timeoutMs: 30 }).finally(() => clearInterval(keepAlive));
    assert.ok(seenSignal?.aborted);
    assert.ok(Date.now() - started < 5000);
    assert.deepEqual(result, { ok: false, reason: 'timeout', message: 'The detective took too long. Try again.' });
});

test('callBotView treats an AbortError as a timeout', async () => {
    const result = await call(async () => {
        throw Object.assign(new Error('aborted'), { name: 'AbortError' });
    });
    assert.equal(result.reason, 'timeout');
    assert.equal(result.message, 'The detective took too long. Try again.');
});

test('callBotView works without AbortSignal.timeout', async () => {
    const original = AbortSignal.timeout;
    AbortSignal.timeout = undefined;
    try {
        const hanging = (url, init) => new Promise((_, reject) => {
            init.signal.addEventListener('abort', () => reject(init.signal.reason));
        });
        const result = await call(hanging, { timeoutMs: 20 });
        assert.equal(result.reason, 'timeout');
    } finally {
        AbortSignal.timeout = original;
    }
});

test('callBotView never sends the key to a foreign apiBase', async () => {
    const fetchImpl = fakeFetch(200, { findings: [] });
    await call(fetchImpl, { apiBase: 'https://evil.example' });
    assert.equal(fetchImpl.calls[0].url, `${DEFAULT_API_BASE}/api/clue/bot-view`);
});

test('normalizeApiBase allows only production and local dev servers', () => {
    const allowed = {
        'https://datadetective.app': 'https://datadetective.app',
        'https://datadetective.app/': 'https://datadetective.app',
        'http://localhost:8787': 'http://localhost:8787',
        'http://127.0.0.1:3000/': 'http://127.0.0.1:3000',
    };
    for (const [input, expected] of Object.entries(allowed)) {
        assert.equal(normalizeApiBase(input), expected, input);
    }
    const rejected = [
        undefined, null, '', 42, 'not a url',
        'http://datadetective.app',
        'https://datadetective.app.evil.com',
        'https://evil.com/datadetective.app',
        'https://user:pw@datadetective.app',
        'https://datadetective.app:8443',
        'https://datadetective.app/api',
        'https://datadetective.app/?x=1',
        'http://localhost',
        'https://localhost:8787',
        'http://localhost.evil.com:8787',
        'http://192.168.1.2:8787',
        'javascript:alert(1)',
    ];
    for (const input of rejected) {
        assert.equal(normalizeApiBase(input), DEFAULT_API_BASE, String(input));
    }
});

test('getSettings falls back to the production API', async () => {
    const storage = { get: async () => ({ apiKey: 'dd_y' }) };
    assert.deepEqual(await getSettings(storage), { apiKey: 'dd_y', apiBase: DEFAULT_API_BASE });
});

test('getSettings ignores a foreign apiBase but keeps local dev servers', async () => {
    const foreign = { get: async () => ({ apiKey: 'dd_y', apiBase: 'https://attacker.example' }) };
    assert.equal((await getSettings(foreign)).apiBase, DEFAULT_API_BASE);
    const local = { get: async () => ({ apiKey: 'dd_y', apiBase: 'http://localhost:8787' }) };
    assert.equal((await getSettings(local)).apiBase, 'http://localhost:8787');
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
