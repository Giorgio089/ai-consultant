import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { JSDOM } from 'jsdom';

// Loads the real popup.html, mocks the extension APIs and drives popup.js through its buttons.

const PAGE_HTML = `<!doctype html><html lang="en"><head><title>A sufficiently long page title for testing</title>
<meta name="description" content="x"></head><body><h1>Hello</h1><p>Some visible text.</p></body></html>`;

const html = await fs.readFile(new URL('../extension/popup.html', import.meta.url), 'utf8');
const dom = new JSDOM(html, { url: 'chrome-extension://test/popup.html' });
const { document } = dom.window;

globalThis.document = document;
globalThis.DOMParser = dom.window.DOMParser;

const storage = { apiKey: 'dd_test' };
globalThis.chrome = {
    runtime: { id: 'test-runtime-id' },
    tabs: { query: async () => [{ id: 1, url: 'https://example.com/' }] },
    scripting: { executeScript: async () => [{ result: { html: PAGE_HTML, textLength: 18 } }] },
    storage: {
        local: {
            get: async () => ({ ...storage }),
            set: async (v) => Object.assign(storage, v),
            remove: async (k) => { delete storage[k]; },
        },
    },
};

const fetchCalls = [];
let respond = null;
globalThis.fetch = (url, init) => {
    fetchCalls.push({ url, init });
    return new Promise((resolve) => { respond = resolve; });
};

const popup = await import('../extension/popup.js');
const $ = (sel) => document.querySelector(sel);

async function waitFor(condition, what) {
    for (let i = 0; i < 200; i++) {
        if (condition()) return;
        await new Promise((r) => setTimeout(r, 5));
    }
    throw new Error(`Timed out waiting for ${what}`);
}

function jsonResponse(body) {
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

test('popup markup is emoji-free and branded', () => {
    assert.doesNotMatch(html, /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u);
    const brand = $('a.brand');
    assert.equal(brand.getAttribute('href'), 'https://datadetective.app/');
    assert.equal($('a.brand img').getAttribute('src'), 'icons/logo.svg');
    assert.equal($('#analyzeBtn').textContent, 'Investigate this page');
    const foot = $('#app > footer.foot');
    assert.ok(foot, 'footer lives inside #app');
    assert.equal(foot.previousElementSibling.id, 'results');
    for (const link of document.querySelectorAll('a[target="_blank"]')) {
        assert.match(link.getAttribute('rel') ?? '', /noopener/);
    }
});

test('popup source has no emoji strings', async () => {
    const source = await fs.readFile(new URL('../extension/popup.js', import.meta.url), 'utf8');
    assert.doesNotMatch(source, /[\u{1F000}-\u{1FAFF}\u{2600}-\u{26FF}\u{2705}\u{274C}\u{FE0F}]/u);
});

test('score helpers use the noir palette and labels', () => {
    assert.equal(popup.getScoreClass(80), 'score-good');
    assert.equal(popup.getScoreClass(60), 'score-warn');
    assert.equal(popup.getScoreClass(59), 'score-bad');
    assert.equal(popup.getScoreLabel(95), 'Case closed. Clean.');
    assert.equal(popup.getScoreLabel(65), 'A few loose ends.');
    assert.equal(popup.getScoreLabel(10), "Something's off here.");
});

test('analysis renders a score and offers to investigate again', async () => {
    $('#analyzeBtn').click();
    await waitFor(() => !$('#results').classList.contains('hidden'), 'results');

    const value = Number($('#scoreValue').textContent);
    const cls = popup.getScoreClass(value);
    assert.ok($('#scoreCircle').classList.contains(cls));
    assert.ok($('#scoreValue').classList.contains(cls));
    assert.equal($('#scoreLabel').textContent, popup.getScoreLabel(value));
    assert.equal($('#status').classList.contains('hidden'), false);
    assert.equal($('#analyzeBtn').textContent, 'Investigate again');
    await waitFor(() => !$('#analyzeBtn').disabled, 'analyze button re-enabled');
});

test('a double click on the detective triggers only one paid call', async () => {
    $('#detectiveBtn').click();
    $('#detectiveBtn').click();
    await waitFor(() => fetchCalls.length > 0, 'fetch');
    $('#detectiveBtn').click();
    await new Promise((r) => setTimeout(r, 20));

    assert.equal(fetchCalls.length, 1);
    assert.equal(fetchCalls[0].url, 'https://datadetective.app/api/clue/bot-view');
    assert.equal($('#detectiveBtn').disabled, true);
    assert.equal($('#analyzeBtn').disabled, true, 'no re-analysis while the detective is out');

    respond(jsonResponse({ findings: [] }));
    await waitFor(() => !$('#detectiveBtn').disabled, 'detective button re-enabled');
    assert.equal($('#detectiveLoading').classList.contains('hidden'), true);
    assert.equal($('#detectiveError').classList.contains('hidden'), true);
    assert.match($('#detectiveResults').textContent, /Nothing suspicious/);
    assert.equal($('#analyzeBtn').disabled, false);
});

test('an unexpected answer is shown as an error and the button recovers', async () => {
    $('#detectiveBtn').click();
    await waitFor(() => fetchCalls.length === 2, 'second fetch');
    respond(new Response('<html>oops</html>', { status: 200, headers: { 'content-type': 'text/html' } }));
    await waitFor(() => !$('#detectiveBtn').disabled, 'detective button re-enabled');
    assert.equal($('#detectiveError').classList.contains('hidden'), false);
    assert.equal($('#detectiveError').textContent, 'Unexpected answer from datadetective.app.');
});

test('unexpected exceptions land in #detectiveError', async () => {
    const original = chrome.storage.local.get;
    chrome.storage.local.get = async () => { throw new Error('storage exploded'); };
    try {
        $('#detectiveBtn').click();
        await waitFor(() => !$('#detectiveBtn').disabled, 'detective button re-enabled');
        assert.match($('#detectiveError').textContent, /storage exploded/);
        assert.equal($('#detectiveLoading').classList.contains('hidden'), true);
    } finally {
        chrome.storage.local.get = original;
    }
});

test('renderBotView tolerates missing fields and never prints NaN', () => {
    popup.renderBotView({ findings: [{ severity: 'warning', message: 'Hmm' }], rawVisibilityRatio: undefined });
    let text = $('#detectiveResults').textContent;
    assert.doesNotMatch(text, /NaN|undefined/);
    assert.doesNotMatch(text, /Visible without JavaScript/);
    assert.match(text, /Hmm/);

    popup.renderBotView({});
    text = $('#detectiveResults').textContent;
    assert.match(text, /Nothing suspicious/);
    assert.doesNotMatch(text, /NaN|undefined/);

    popup.renderBotView({
        findings: [{}],
        rawVisibilityRatio: Number.NaN,
        bots: [{ token: 'GPTBot' }, null, { token: 'ClaudeBot', robots: { allowed: false }, fetch: { tested: true, status: 200 } }],
    });
    text = $('#detectiveResults').textContent;
    assert.doesNotMatch(text, /NaN|undefined/);
    assert.match(text, /GPTBot/);
    assert.match(text, /ClaudeBot/);

    popup.renderBotView({ findings: [], rawVisibilityRatio: 0.42 });
    assert.match($('#detectiveResults').textContent, /42 % of the rendered text/);
});
