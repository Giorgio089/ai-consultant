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

// ─── AI policy (free) ───────────────────────────────────────────────

const POLICY = {
    check: 'ai-policy',
    url: 'https://example.com/',
    findings: [
        { severity: 'critical', message: 'AI search crawlers are blocked (PerplexityBot): the page cannot be cited in their answers.' },
        { severity: 'info', message: 'No llms.txt. It is optional and its effect is unproven.' },
    ],
    llmsTxt: { url: 'https://example.com/llms.txt', exists: false, status: 404 },
    robotsTxt: {
        url: 'https://example.com/robots.txt', status: 200, found: true, checked: true,
        bots: [
            { token: 'GPTBot', operator: 'OpenAI', purpose: 'training', allowed: false, rule: 'Disallow: /' },
            { token: 'PerplexityBot', operator: 'Perplexity', purpose: 'search', allowed: false, rule: 'Disallow: /' },
            { token: 'ClaudeBot', operator: 'Anthropic', purpose: 'training', allowed: true, rule: null },
            { token: 'Google-Extended', operator: 'Google', purpose: 'training (Gemini)', allowed: true, rule: null },
        ],
    },
    contentSignals: { search: 'yes', 'ai-input': 'yes', 'ai-train': 'no' },
    page: { status: 200 },
    xRobotsTag: null,
    metaRobots: 'max-snippet:-1',
    noindex: false,
    aiOptOut: [],
};

test('the AI policy check is free: one GET without key, results land in the case file', async () => {
    const before = fetchCalls.length;
    $('#policyBtn').click();
    $('#policyBtn').click();
    await waitFor(() => fetchCalls.length === before + 1, 'policy fetch');
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(fetchCalls.length, before + 1, 'a double click checks once');
    const call = fetchCalls.at(-1);
    assert.equal(call.url, 'https://datadetective.app/api/check/ai-policy?url=https%3A%2F%2Fexample.com%2F');
    assert.equal(call.init.headers.authorization, undefined, 'the stored API key is not sent');
    assert.equal($('#policyBtn').disabled, true);

    respond(jsonResponse(POLICY));
    await waitFor(() => !$('#policyBtn').disabled, 'policy button re-enabled');
    const text = $('#policyResults').textContent;
    assert.match(text, /Critical.*AI search crawlers are blocked/);
    assert.match(text, /llms\.txtNot found \(optional\)/);
    assert.match(text, /Allowed: ClaudeBot \(training\), Google-Extended \(training, Gemini\)/);
    assert.match(text, /Disallowed: GPTBot \(training\) – Disallow: \/; PerplexityBot \(search\) – Disallow: \//);
    assert.match(text, /search=yes, ai-input=yes, ai-train=no/);
    assert.match(text, /indexable · meta robots: max-snippet:-1/);
    assert.doesNotMatch(text, /NaN|undefined|null/);
    const robotsItem = [...$('#policyResults').querySelectorAll('.check-item')].find((el) => /AI crawlers in robots/.test(el.textContent));
    assert.ok(robotsItem.querySelector('.status-bad'), 'a blocked search crawler is shown as bad');
    assert.equal($('#policyError').classList.contains('hidden'), true);
});

test('a rate-limited check shows its message; investigating again clears the old result', async () => {
    const before = fetchCalls.length;
    $('#policyBtn').click();
    await waitFor(() => fetchCalls.length === before + 1, 'policy fetch');
    respond(new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429, headers: { 'content-type': 'application/json' } }));
    await waitFor(() => !$('#policyBtn').disabled, 'policy button re-enabled');
    assert.equal($('#policyError').textContent, 'Too many checks, try again in a minute.');

    $('#analyzeBtn').click();
    await waitFor(() => $('#policyResults').childElementCount === 0 && $('#policyError').classList.contains('hidden'), 'policy reset');
    await waitFor(() => !$('#analyzeBtn').disabled, 'analysis done');
});

test('renderAiPolicy tolerates missing fields', () => {
    popup.renderAiPolicy({});
    let text = $('#policyResults').textContent;
    assert.match(text, /Nothing to object to/);
    assert.doesNotMatch(text, /NaN|undefined|null/);

    popup.renderAiPolicy({
        findings: [{}], llmsTxt: { exists: true, valid: true, title: 'Example', links: 4, sections: 2, summary: true },
        robotsTxt: { checked: false, status: 503, bots: [null, { token: 'GPTBot' }] }, noindex: true, aiOptOut: ['noai'],
    });
    text = $('#policyResults').textContent;
    assert.doesNotMatch(text, /NaN|undefined|null/);
    assert.match(text, /"Example" · 4 link\(s\) · 2 section\(s\) · with summary/);
    assert.match(text, /robots.txt could not be read \(HTTP 503\)/);
    assert.match(text, /noindex · AI opt-out: noai/);

    popup.renderAiPolicy({ llmsTxt: { exists: false, servedHtml: true }, robotsTxt: { found: false, checked: true, bots: [{ token: 'GPTBot', allowed: true }] } });
    text = $('#policyResults').textContent;
    assert.match(text, /Answers with an HTML page/);
    assert.match(text, /no robots.txt, all allowed/);
    assert.doesNotMatch(text, /Content Signals/, 'no robots.txt, nothing to say about signals');
});
