import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { calculateScore, checkBasicSEO, runAudit } from '../extension/audit/runAudit.js';
import { SCHEMA_VERSION } from '../extension/audit/schema.js';

const parse = (html) => new JSDOM(html).window.document;

const OPTIMAL_TITLE = 'Optimal Title Tag Length 30 Ch';
const OPTIMAL_DESC = 'This is an optimal meta description that is carefully written to be between 120 and 160 characters long, ensuring maximum visibility and click-through rates.';

// ─── checkBasicSEO ──────────────────────────────────────────────────

test('checkBasicSEO identifies optimal basic SEO tags', () => {
    const doc = parse(`<!DOCTYPE html><html lang="en"><head>
        <title>${OPTIMAL_TITLE}</title>
        <meta name="description" content="${OPTIMAL_DESC}">
        <link rel="canonical" href="https://example.com/page">
        </head><body><h1>Main Heading</h1><h2>Subheading 1</h2><h2>Subheading 2</h2></body></html>`);
    const result = checkBasicSEO(doc, 'https://example.com/page');

    assert.equal(result.title.exists, true);
    assert.equal(result.title.optimal, true);
    assert.equal(result.title.recommendation, null);
    assert.equal(result.metaDescription.optimal, true);
    assert.equal(result.metaDescription.recommendation, null);
    assert.equal(result.h1.optimal, true);
    assert.equal(result.h1.count, 1);
    assert.equal(result.h2.optimal, true);
    assert.equal(result.robots.status, 'good');
    assert.equal(result.canonical.status, 'good');
    assert.equal(result.canonical.pointsElsewhere, false);
    assert.equal(result.lang.exists, true);
    assert.equal(result.lang.value, 'en');
    assert.equal(result.headingStructure.optimal, true);
    assert.equal(result.images.optimal, true);
});

test('title ignores SVG <title> in body and measures collapsed whitespace', () => {
    const doc = parse(`<html><head><title>
        Real   page
        title   </title></head><body><svg><title>Icon label</title></svg></body></html>`);
    const result = checkBasicSEO(doc);
    assert.equal(result.title.content, 'Real page title');
    assert.equal(result.title.length, 'Real page title'.length);

    const svgOnly = parse('<html><head></head><body><svg><title>Icon label</title></svg></body></html>');
    assert.equal(checkBasicSEO(svgOnly).title.exists, false);
});

test('meta description length is measured after trimming/collapsing', () => {
    const padded = `   ${OPTIMAL_DESC.replace(/ /g, '   ')}   `;
    const doc = parse(`<html><head><meta name="Description" content="${padded}"></head><body></body></html>`);
    const result = checkBasicSEO(doc);
    assert.equal(result.metaDescription.exists, true);
    assert.equal(result.metaDescription.length, OPTIMAL_DESC.length);
    assert.equal(result.metaDescription.optimal, true);
});

test('robots: noindex / nosnippet / max-snippet:0 are bad, small max-snippet warns', () => {
    const robots = (content) =>
        checkBasicSEO(parse(`<html><head><meta name="robots" content="${content}"></head><body></body></html>`)).robots;

    assert.equal(robots('noindex, follow').status, 'bad');
    assert.equal(robots('noindex, follow').noindex, true);
    assert.equal(robots('none').noindex, true);
    assert.equal(robots('nosnippet').status, 'bad');
    assert.equal(robots('max-snippet:0').status, 'bad');
    assert.equal(robots('max-snippet:0').maxSnippet, 0);
    assert.equal(robots('max-snippet:20').status, 'warn');
    assert.equal(robots('max-snippet:-1, max-image-preview:large').status, 'good');
    assert.equal(robots('index, follow').status, 'good');

    const googlebot = checkBasicSEO(parse('<html><head><meta name="googlebot" content="nosnippet"></head><body></body></html>'));
    assert.equal(googlebot.robots.status, 'bad');

    const dataNosnippet = checkBasicSEO(parse('<html><body><p data-nosnippet>secret</p><div data-nosnippet></div></body></html>'));
    assert.equal(dataNosnippet.robots.dataNosnippetCount, 2);
    assert.equal(dataNosnippet.robots.status, 'good');
    assert.equal(dataNosnippet.robots.exists, false);
});

test('canonical: missing, relative, multiple and pointing elsewhere', () => {
    const canon = (head, url = 'https://example.com/a') =>
        checkBasicSEO(parse(`<html><head>${head}</head><body></body></html>`), url).canonical;

    assert.equal(canon('').exists, false);
    assert.equal(canon('').status, 'warn');

    const relative = canon('<link rel="canonical" href="/a">');
    assert.equal(relative.absolute, false);
    assert.equal(relative.status, 'warn');
    assert.equal(relative.pointsElsewhere, false);

    assert.equal(canon('<link rel="canonical" href="https://example.com/a"><link rel="canonical" href="https://example.com/b">').status, 'warn');

    const elsewhere = canon('<link rel="canonical" href="https://example.com/other">');
    assert.equal(elsewhere.pointsElsewhere, true);
    assert.equal(elsewhere.status, 'info');

    assert.equal(canon('<link rel="canonical" href="https://example.com/a/">', 'https://example.com/a#x').pointsElsewhere, false);
});

test('lang attribute and hreflang count', () => {
    const doc = parse(`<html lang="de-AT"><head>
        <link rel="alternate" hreflang="en" href="https://example.com/en">
        <link rel="alternate" hreflang="x-default" href="https://example.com/">
        </head><body></body></html>`);
    const { lang } = checkBasicSEO(doc);
    assert.equal(lang.value, 'de-AT');
    assert.equal(lang.hreflangCount, 2);

    const noLang = checkBasicSEO(parse('<html><body></body></html>')).lang;
    assert.equal(noLang.exists, false);
    assert.ok(noLang.recommendation);
});

test('heading level skips are reported', () => {
    const doc = parse('<html><body><h1>a</h1><h3>b</h3><h2>c</h2><h3>d</h3><h5>e</h5></body></html>');
    const { headingStructure } = checkBasicSEO(doc);
    assert.deepEqual(headingStructure.skips, [{ from: 'h1', to: 'h3' }, { from: 'h3', to: 'h5' }]);
    assert.equal(headingStructure.optimal, false);
    assert.match(headingStructure.recommendation, /h1→h3/);
});

test('images without alt are counted (alt="" counts as present)', () => {
    const doc = parse('<html><body><img src="a.png"><img src="b.png" alt=""><img src="c.png" alt="Chart"><img src="d.png"></body></html>');
    const { images } = checkBasicSEO(doc);
    assert.equal(images.total, 4);
    assert.equal(images.missingAlt, 2);
    assert.equal(images.ratio, 0.5);
    assert.equal(images.optimal, false);
});

// ─── calculateScore ─────────────────────────────────────────────────

function fullChecks() {
    return {
        basicSEO: {
            title: { optimal: true, exists: true },
            metaDescription: { optimal: true, exists: true },
            h1: { optimal: true, exists: true },
            h2: { optimal: true, exists: true },
            robots: { status: 'good' },
            canonical: { exists: true, status: 'good' },
            lang: { exists: true },
        },
        llmReadability: { llmFriendly: true, thinContent: false, appShell: false, textContentLength: 1000 },
        structuredData: {
            jsonLd: { exists: true, count: 1, validCount: 1, errors: 0 },
            openGraph: { exists: true },
            twitterCards: { exists: true },
            requiredFields: { checked: 1, issues: [] },
            authorDate: { hasAuthor: true, hasDate: true },
        },
    };
}

test('calculateScore: max score is 100 with re-balanced categories', () => {
    const result = calculateScore(fullChecks());
    assert.equal(result.total, 100);
    assert.deepEqual(result.breakdown, {
        basicSEO: { score: 45, maxScore: 45 },
        llmReadability: { score: 30, maxScore: 30 },
        structuredData: { score: 25, maxScore: 25 },
    });
});

test('calculateScore: zero when nothing exists', () => {
    const result = calculateScore({
        basicSEO: {
            title: { exists: false }, metaDescription: { exists: false }, h1: { exists: false }, h2: { exists: false },
            robots: { status: 'bad' }, canonical: { exists: false, status: 'warn' }, lang: { exists: false },
        },
        llmReadability: { llmFriendly: false, textContentLength: 100 },
        structuredData: {
            jsonLd: { exists: false, count: 0, validCount: 0 }, openGraph: { exists: false }, twitterCards: { exists: false },
            requiredFields: { checked: 0, issues: [] }, authorDate: { hasAuthor: false, hasDate: false },
        },
    });
    assert.equal(result.total, 0);
});

test('calculateScore: partial basic SEO points', () => {
    const checks = fullChecks();
    checks.basicSEO.metaDescription = { optimal: false, exists: true }; // 5
    checks.basicSEO.h1 = { optimal: false, exists: false }; // 0
    checks.basicSEO.robots = { status: 'warn' }; // 1
    checks.basicSEO.canonical = { exists: true, status: 'warn' }; // 1
    checks.basicSEO.lang = { exists: false }; // 0
    assert.equal(calculateScore(checks).breakdown.basicSEO.score, 10 + 5 + 0 + 10 + 1 + 1);
});

test('calculateScore: canonical pointing elsewhere (info) is not penalised', () => {
    const checks = fullChecks();
    checks.basicSEO.canonical = { exists: true, status: 'info' };
    assert.equal(calculateScore(checks).breakdown.basicSEO.score, 45);
});

test('calculateScore: LLM readability tiers', () => {
    const llm = (r) => {
        const checks = fullChecks();
        checks.llmReadability = r;
        return calculateScore(checks).breakdown.llmReadability.score;
    };
    assert.equal(llm({ llmFriendly: true, thinContent: false, textContentLength: 1000 }), 30);
    assert.equal(llm({ llmFriendly: true, thinContent: true, textContentLength: 100 }), 10);
    assert.equal(llm({ llmFriendly: false, appShell: true, thinContent: true, textContentLength: 0 }), 0);
    assert.equal(llm({ llmFriendly: false, textContentLength: 501 }), 15);
    assert.equal(llm({ llmFriendly: false, textContentLength: 400 }), 0);
});

test('calculateScore: JSON-LD points only for valid blocks', () => {
    const checks = fullChecks();
    checks.structuredData.jsonLd = { exists: true, count: 2, validCount: 0, errors: 2 };
    // only OG 8 + Twitter 2 + author/date 2
    assert.equal(calculateScore(checks).breakdown.structuredData.score, 12);

    // legacy shape without validCount: count - errors decides
    checks.structuredData.jsonLd = { exists: true, count: 1, errors: 1 };
    assert.equal(calculateScore(checks).breakdown.structuredData.score, 12);
});

test('calculateScore: missing required fields and author/date reduce structured score', () => {
    const checks = fullChecks();
    checks.structuredData.requiredFields = { checked: 1, issues: [{ type: 'Article', missing: ['author'] }] };
    checks.structuredData.authorDate = { hasAuthor: false, hasDate: true };
    checks.structuredData.twitterCards = { exists: false };
    assert.equal(calculateScore(checks).breakdown.structuredData.score, 10 + 0 + 1 + 8 + 0);
});

// ─── runAudit end-to-end ────────────────────────────────────────────

const FULL_PAGE = `<!DOCTYPE html><html lang="en"><head>
    <title>${OPTIMAL_TITLE}</title>
    <meta name="description" content="${OPTIMAL_DESC}">
    <meta name="robots" content="index, follow, max-snippet:-1">
    <link rel="canonical" href="https://example.com/post">
    <meta property="og:title" content="x"><meta name="twitter:card" content="summary">
    <script type="application/ld+json">[{"@type":"Article","headline":"H","author":{"@type":"Person","name":"Jane"},"datePublished":"2026-01-01"}]</script>
    </head><body><main><h1>Main</h1><h2>A</h2><p>${'Readable paragraph text. '.repeat(40)}</p><h2>B</h2>
    <img src="x.png" alt="x"></main></body></html>`;

test('runAudit returns full result with schema version and 100 score', () => {
    const result = runAudit(FULL_PAGE, parse(FULL_PAGE), 'https://example.com/post');
    assert.equal(result.schemaVersion, SCHEMA_VERSION);
    assert.equal(result.url, 'https://example.com/post');
    assert.equal(result.checks.structuredData.jsonLd.types[0], 'Article');
    assert.equal(result.checks.structuredData.authorDate.author, 'Jane');
    assert.equal(result.score.total, 100);
});

test('runAudit works on a linkedom-parsed document (worker runtime)', async (t) => {
    let parseHTML;
    try {
        ({ parseHTML } = await import('linkedom'));
    } catch {
        t.skip('linkedom not installed');
        return;
    }
    const { document } = parseHTML(FULL_PAGE);
    const result = runAudit(FULL_PAGE, document, 'https://example.com/post');
    const jsdomResult = runAudit(FULL_PAGE, parse(FULL_PAGE), 'https://example.com/post');
    assert.deepEqual(result.score, jsdomResult.score);
    assert.deepEqual(result.checks, jsdomResult.checks);

    const shell = '<!doctype html><html><head><title>App</title></head><body><svg><title>logo</title></svg><div id="root"></div><script src="/app.js"></script><script>window.x={"a":1}</script></body></html>';
    const ld = runAudit(shell, parseHTML(shell).document, 'https://example.com/');
    assert.equal(ld.checks.basicSEO.title.content, 'App');
    assert.equal(ld.checks.llmReadability.textContentLength, 0);
    assert.equal(ld.checks.llmReadability.appShell, true);
    assert.equal(ld.score.breakdown.llmReadability.score, 0);
});
