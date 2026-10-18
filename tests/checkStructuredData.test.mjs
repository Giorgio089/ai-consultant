import test from 'node:test';
import assert from 'node:assert/strict';

import { JSDOM } from 'jsdom';

const { checkStructuredData, calculateScore } = await import('../extension/audit/runAudit.js');

function createMockDoc(elements) {
    return {
        querySelectorAll(selector) {
            return elements[selector] || [];
        }
    };
}

test('checkStructuredData identifies json-ld types', () => {
    const doc = createMockDoc({
        'script[type="application/ld+json"]': [
            { textContent: JSON.stringify({ '@type': 'Article', headline: 'Test' }) }
        ],
        '[itemscope]': [],
        'meta[property^="og:"]': [],
        'meta[name^="twitter:"]': []
    });

    const result = checkStructuredData(doc);
    assert.equal(result.jsonLd.exists, true);
    assert.equal(result.jsonLd.count, 1);
    assert.deepEqual(result.jsonLd.types, ['Article']);
    assert.equal(result.jsonLd.errors, 0);
    assert.equal(result.overallAssessment, 'Good');
});

test('checkStructuredData handles @graph arrays in json-ld', () => {
    const doc = createMockDoc({
        'script[type="application/ld+json"]': [
            { textContent: JSON.stringify({ '@graph': [{ '@type': 'WebSite' }, { '@type': 'WebPage' }] }) }
        ],
        '[itemscope]': [],
        'meta[property^="og:"]': [],
        'meta[name^="twitter:"]': []
    });

    const result = checkStructuredData(doc);
    assert.deepEqual(result.jsonLd.types, ['WebSite', 'WebPage']);
});

test('checkStructuredData identifies microdata', () => {
    const doc = createMockDoc({
        'script[type="application/ld+json"]': [],
        '[itemscope]': [{}, {}],
        'meta[property^="og:"]': [],
        'meta[name^="twitter:"]': []
    });

    const result = checkStructuredData(doc);
    assert.equal(result.microdata.exists, true);
    assert.equal(result.microdata.count, 2);
    assert.equal(result.overallAssessment, 'Good');
});

test('checkStructuredData identifies open graph tags', () => {
    const doc = createMockDoc({
        'script[type="application/ld+json"]': [],
        '[itemscope]': [],
        'meta[property^="og:"]': [{}, {}, {}],
        'meta[name^="twitter:"]': []
    });

    const result = checkStructuredData(doc);
    assert.equal(result.openGraph.exists, true);
    assert.equal(result.openGraph.count, 3);
});

test('checkStructuredData identifies twitter tags', () => {
    const doc = createMockDoc({
        'script[type="application/ld+json"]': [],
        '[itemscope]': [],
        'meta[property^="og:"]': [],
        'meta[name^="twitter:"]': [{}, {}]
    });

    const result = checkStructuredData(doc);
    assert.equal(result.twitterCards.exists, true);
    assert.equal(result.twitterCards.count, 2);
});

test('checkStructuredData detects malformed json-ld', () => {
    const doc = createMockDoc({
        'script[type="application/ld+json"]': [
            { textContent: 'invalid json' },
            { textContent: JSON.stringify({ '@type': 'Person' }) }
        ],
        '[itemscope]': [],
        'meta[property^="og:"]': [],
        'meta[name^="twitter:"]': []
    });

    const result = checkStructuredData(doc);
    assert.equal(result.jsonLd.errors, 1);
    assert.deepEqual(result.jsonLd.types, ['Person']);
    assert.match(result.recommendation, /1 JSON-LD block\(s\) contain invalid JSON\./);
});

test('checkStructuredData generates correct recommendations for missing tags', () => {
    const doc = createMockDoc({
        'script[type="application/ld+json"]': [],
        '[itemscope]': [],
        'meta[property^="og:"]': [],
        'meta[name^="twitter:"]': []
    });

    const result = checkStructuredData(doc);
    assert.equal(result.overallAssessment, 'Missing');
    assert.match(result.recommendation, /Add JSON-LD schema markup, Open Graph tags, Twitter Card tags/);
});

// ─── jsdom-based tests for structured-data fixes ────────────────────

const sd = (head, body = '') =>
    checkStructuredData(new JSDOM(`<html><head>${head}</head><body>${body}</body></html>`).window.document);
const ld = (obj) => `<script type="application/ld+json">${typeof obj === 'string' ? obj : JSON.stringify(obj)}</script>`;

test('top-level JSON-LD arrays are handled (array → items → @graph)', () => {
    const result = sd(ld([
        { '@type': 'Article', headline: 'h' },
        { '@graph': [{ '@type': 'WebSite' }, [{ '@type': 'BreadcrumbList' }]] },
        null,
        'string',
        42,
    ]));
    assert.deepEqual(result.jsonLd.types, ['Article', 'WebSite', 'BreadcrumbList']);
    assert.equal(result.jsonLd.validCount, 1);
    assert.equal(result.jsonLd.errors, 0);
});

test('JSON "null" / empty array is valid JSON but counted as empty, not as parse error', () => {
    const result = sd(ld('null') + ld('[]'));
    assert.equal(result.jsonLd.count, 2);
    assert.equal(result.jsonLd.errors, 0);
    assert.equal(result.jsonLd.empty, 2);
    assert.equal(result.jsonLd.validCount, 0);
    assert.deepEqual(result.jsonLd.types, []);
    assert.equal(result.overallAssessment, 'Missing');
    assert.match(result.recommendation, /2 JSON-LD block\(s\) contain no data/);
});

test('no JSON-LD points when all blocks are invalid', () => {
    const result = sd(ld('{broken') + ld('null'));
    assert.equal(result.jsonLd.exists, true);
    assert.equal(result.jsonLd.validCount, 0);
    const checks = {
        basicSEO: { title: {}, metaDescription: {}, h1: {}, h2: {} },
        llmReadability: { llmFriendly: false, textContentLength: 0 },
        structuredData: result,
    };
    assert.equal(calculateScore(checks).breakdown.structuredData.score, 0);
});

test('author/date signals from JSON-LD', () => {
    const result = sd(ld({
        '@type': 'BlogPosting', headline: 'h', author: [{ '@type': 'Person', name: 'Ada' }],
        datePublished: '2026-03-01', dateModified: '2026-04-01',
    }));
    assert.deepEqual(result.authorDate, {
        datePublished: '2026-03-01', dateModified: '2026-04-01', author: 'Ada', hasDate: true, hasAuthor: true,
    });
    assert.deepEqual(result.requiredFields.issues, []);
    assert.equal(result.requiredFields.checked, 1);
});

test('author/date signals from meta tags and microdata', () => {
    const meta = sd('<meta property="article:published_time" content="2026-05-05T10:00:00Z"><meta name="author" content="Bob">');
    assert.equal(meta.authorDate.datePublished, '2026-05-05T10:00:00Z');
    assert.equal(meta.authorDate.author, 'Bob');

    const micro = sd('', '<div itemscope><time itemprop="dateModified" datetime="2026-06-06">June</time></div>');
    assert.equal(micro.authorDate.dateModified, '2026-06-06');
    assert.equal(micro.authorDate.hasAuthor, false);

    const none = sd('');
    assert.equal(none.authorDate.hasDate, false);
    assert.equal(none.authorDate.hasAuthor, false);
});

test('required fields are reported per type', () => {
    const result = sd(ld({
        '@graph': [
            { '@type': 'NewsArticle', headline: 'x' },
            { '@type': 'Organization', name: 'ACME' },
            { '@type': 'Product', name: 'Widget' },
            { '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'Q?' }] },
            { '@type': 'WebSite', name: 'not checked' },
        ],
    }));
    assert.equal(result.requiredFields.checked, 4);
    assert.deepEqual(result.requiredFields.issues, [
        { type: 'NewsArticle', missing: ['author', 'datePublished'] },
        { type: 'Organization', missing: ['url'] },
        { type: 'Product', missing: ['offers|review|aggregateRating'] },
        { type: 'FAQPage', missing: ['mainEntity.acceptedAnswer'] },
    ]);
    assert.match(result.recommendation, /Missing schema fields: NewsArticle \(author, datePublished\)/);
});

test('complete Product and FAQPage pass the required-field check', () => {
    const result = sd(ld([
        { '@type': 'Product', name: 'W', aggregateRating: { '@type': 'AggregateRating', ratingValue: 4 } },
        { '@type': 'FAQPage', mainEntity: { '@type': 'Question', name: 'Q', acceptedAnswer: { '@type': 'Answer', text: 'A' } } },
        { '@type': ['Organization', 'Brand'], name: 'O', url: 'https://o.example' },
    ]));
    assert.deepEqual(result.requiredFields.issues, []);
    assert.equal(result.requiredFields.checked, 3);
    assert.deepEqual(result.jsonLd.types, ['Product', 'FAQPage', 'Organization, Brand']);

    const noEntity = sd(ld({ '@type': 'FAQPage' }));
    assert.deepEqual(noEntity.requiredFields.issues, [{ type: 'FAQPage', missing: ['mainEntity'] }]);
});
