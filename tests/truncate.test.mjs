import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

test('truncate', async (t) => {
    // Setup minimal DOM required by popup.js
    const dom = new JSDOM(`<!DOCTYPE html>
    <div id="analyzeBtn"></div>
    <div id="loading"></div>
    <div id="error"></div>
    <div id="results"></div>
    <div id="status"></div>
    <div id="copyJsonBtn"></div>
    `);

    // Mock global browser APIs needed by popup.js on import
    globalThis.document = dom.window.document;
    globalThis.chrome = {
        runtime: { id: 'test-runtime-id' }
    };
    globalThis.browser = globalThis.chrome;

    // Dynamically import popup.js to get truncate function
    const { truncate } = await import('../extension/popup.js');

    await t.test('returns empty string for null/undefined/empty input', () => {
        assert.equal(truncate(null, 10), '');
        assert.equal(truncate(undefined, 10), '');
        assert.equal(truncate('', 10), '');
    });

    await t.test('returns original string if shorter than max length', () => {
        assert.equal(truncate('hello', 10), 'hello');
    });

    await t.test('returns original string if exactly max length', () => {
        assert.equal(truncate('hello', 5), 'hello');
    });

    await t.test('truncates string and appends ellipsis if longer than max length', () => {
        assert.equal(truncate('hello world', 5), 'hello…');
    });

    await t.test('normalizes multiple spaces and trims before checking length', () => {
        assert.equal(truncate('   hello    world   ', 20), 'hello world');
        assert.equal(truncate('   hello    world   ', 5), 'hello…');
    });
});
