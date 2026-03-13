import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { checkBasicSEO } from '../extension/audit/runAudit.js';

test('checkBasicSEO identifies optimal basic SEO tags', () => {
    // 30 characters title
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Optimal Title Tag Length 30 Ch</title>
            <meta name="description" content="This is an optimal meta description that is carefully written to be between 120 and 160 characters long, ensuring maximum visibility and click-through rates.">
        </head>
        <body>
            <h1>Main Heading</h1>
            <h2>Subheading 1</h2>
            <h2>Subheading 2</h2>
        </body>
        </html>
    `;
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const result = checkBasicSEO(doc);

    // Title
    assert.equal(result.title.exists, true);
    assert.equal(result.title.optimal, true);
    assert.equal(result.title.recommendation, null);

    // Meta Description
    assert.equal(result.metaDescription.exists, true);
    assert.equal(result.metaDescription.optimal, true);
    assert.equal(result.metaDescription.recommendation, null);

    // H1
    assert.equal(result.h1.exists, true);
    assert.equal(result.h1.optimal, true);
    assert.equal(result.h1.count, 1);
    assert.equal(result.h1.recommendation, null);

    // H2
    assert.equal(result.h2.exists, true);
    assert.equal(result.h2.optimal, true);
    assert.ok(result.h2.count >= 2);
    assert.equal(result.h2.recommendation, null);
});
