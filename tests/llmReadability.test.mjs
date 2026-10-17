import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { checkLLMReadability, detectFramework } from '../extension/audit/runAudit.js';

const audit = (html) => checkLLMReadability(html, new JSDOM(html).window.document);
const TEXT = 'Plain readable text. '.repeat(20).trim();

test('checkLLMReadability ignores JSON-LD and counts executable scripts', () => {
    const jsonLd = JSON.stringify({ '@type': 'FAQPage', text: 'x'.repeat(4000) });
    const html = `<html><head><script type="application/ld+json">${jsonLd}</script>` +
        '<script type="module">init()</script></head>' +
        `<body><p>${TEXT}</p><script>track()</script></body></html>`;
    const result = audit(html);

    assert.equal(result.scriptContentLength, 'init()'.length + 'track()'.length);
    assert.equal(result.llmFriendly, true);
});

test('text length excludes script/style/noscript/template/svg inside body', () => {
    const noise = 'x'.repeat(1000);
    const html = `<html><body><p>${TEXT}</p>` +
        `<script type="application/ld+json">{"a":"${noise}"}</script>` +
        `<style>.a{content:"${noise}"}</style><noscript>${noise}</noscript>` +
        `<template><p>${noise}</p></template><svg><text>${noise}</text></svg></body></html>`;
    const result = audit(html);
    assert.equal(result.textContentLength, TEXT.length);
});

test('whitespace is collapsed when measuring text', () => {
    const result = audit('<html><body><p>  a  \n\n  b  </p></body></html>');
    assert.equal(result.textContentLength, 3);
});

test('empty SPA shell with external bundle is not LLM-friendly', () => {
    const result = audit('<html><head><script src="/app.js"></script></head><body><div id="root"></div><script src="/vendor.js" defer></script></body></html>');
    assert.equal(result.textContentLength, 0);
    assert.equal(result.externalScriptCount, 2);
    assert.equal(result.scriptContentLength, 0);
    assert.equal(result.appShell, true);
    assert.equal(result.thinContent, true);
    assert.equal(result.llmFriendly, false);
    assert.match(result.recommendation, /2 external script/);
});

test('thin page without scripts is friendly but flagged as thin', () => {
    const result = audit('<html><body><h1>Example Domain</h1><p>Short text.</p></body></html>');
    assert.equal(result.thinContent, true);
    assert.equal(result.appShell, false);
    assert.equal(result.llmFriendly, true);
    assert.ok(result.recommendation);
});

test('content-rich page with external scripts is fine', () => {
    const result = audit(`<html><body><p>${TEXT}</p><script src="/analytics.js"></script></body></html>`);
    assert.equal(result.appShell, false);
    assert.equal(result.llmFriendly, true);
    assert.equal(result.externalScriptCount, 1);
});

test('mainContentLength uses main/article when present', () => {
    const withMain = audit(`<html><body><nav>Home About Contact</nav><main><p>${TEXT}</p></main><footer>Footer</footer></body></html>`);
    assert.equal(withMain.mainContentLength, TEXT.length);
    assert.ok(withMain.textContentLength > withMain.mainContentLength);

    const withArticle = audit(`<html><body><article> ${TEXT} <script>x()</script></article></body></html>`);
    assert.equal(withArticle.mainContentLength, TEXT.length);

    assert.equal(audit(`<html><body><p>${TEXT}</p></body></html>`).mainContentLength, null);
});

test('detectFramework: specific framework names, no false positives', () => {
    assert.equal(detectFramework('<script id="__NEXT_DATA__" type="application/json">{}</script>'), 'Next.js');
    assert.equal(detectFramework('<script src="/_next/static/chunks/main.js"></script>'), 'Next.js');
    assert.equal(detectFramework('<script>window.__NUXT__={}</script>'), 'Nuxt');
    assert.equal(detectFramework('<app-root ng-version="17.0.0"></app-root>'), 'Angular');
    assert.equal(detectFramework('<div id="app" data-v-app=""><p data-v-7ba5bd90>x</p></div>'), 'Vue');
    assert.equal(detectFramework('<div data-reactroot="">x</div>'), 'React');
    assert.equal(detectFramework('<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>'), 'React');
    assert.equal(detectFramework('<div id="___gatsby"></div>'), 'Gatsby');
    assert.equal(detectFramework('<astro-island uid="1"></astro-island>'), 'Astro');

    // Plain mentions of "react" / "vue" in text or JSON are not framework markers.
    assert.equal(detectFramework('<p>We love "react" and \'vue\' tutorials.</p><script>var lib = "react";</script>'), null);
    assert.equal(detectFramework('<p>data-v-ish text</p>'), null);
});

test('framework is mentioned in the recommendation only for JS-heavy pages', () => {
    const shell = audit('<html><body><div id="__next"></div><script id="__NEXT_DATA__" type="application/json">{}</script><script src="/_next/static/chunks/main.js"></script></body></html>');
    assert.equal(shell.frameworkName, 'Next.js');
    assert.equal(shell.jsFrameworkDetected, true);
    assert.match(shell.recommendation, /Detected framework: Next\.js/);
});
