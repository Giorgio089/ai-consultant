import test from 'node:test';
import assert from 'node:assert/strict';

const { checkStructuredData } = await import('../extension/audit/runAudit.js');

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
