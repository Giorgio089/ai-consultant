import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { checkLLMReadability } from '../extension/audit/runAudit.js';

test('checkLLMReadability ignores JSON-LD and counts executable scripts', () => {
    const jsonLd = JSON.stringify({ '@type': 'FAQPage', text: 'x'.repeat(4000) });
    const html = `<html><head><script type="application/ld+json">${jsonLd}</script>` +
        '<script type="module">init()</script></head>' +
        `<body><p>${'Plain readable text. '.repeat(20)}</p><script>track()</script></body></html>`;
    const doc = new JSDOM(html).window.document;
    const result = checkLLMReadability(html, doc);

    assert.equal(result.scriptContentLength, 'init()'.length + 'track()'.length);
    assert.equal(result.llmFriendly, true);
});
