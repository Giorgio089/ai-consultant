/**
 * AI SEO Consultant — Audit Engine v0.1
 *
 * Standalone module that analyzes parsed HTML and returns a structured
 * audit result conforming to schema v0.1.
 *
 * Works in both browser (DOMParser) and Node.js (jsdom) environments.
 * Does NOT handle fetching — caller provides (html, url).
 */

import { SCHEMA_VERSION } from './schema.js';

// ─── Basic SEO ──────────────────────────────────────────────────────

/**
 * @param {Document} doc
 * @returns {import('./schema.js').BasicSEOResult}
 */
export function checkBasicSEO(doc) {
    const title = doc.querySelector('title');
    const metaDesc = doc.querySelector('meta[name="description"]');
    const h1s = doc.querySelectorAll('h1');
    const h1 = h1s[0];
    const h2s = doc.querySelectorAll('h2');

    const titleLen = title ? title.textContent.length : 0;
    const titleOptimal = !!title && titleLen >= 30 && titleLen <= 60;

    const descContent = metaDesc ? metaDesc.getAttribute('content') || '' : '';
    const descLen = descContent.length;
    const descOptimal = !!metaDesc && descLen >= 120 && descLen <= 160;

    const h1Count = h1s.length;
    const h1Optimal = h1Count === 1;

    const h2Count = h2s.length;
    const h2Optimal = h2Count >= 2;

    return {
        title: {
            exists: !!title,
            content: title ? title.textContent : '',
            length: titleLen,
            optimal: titleOptimal,
            recommendation: !title
                ? 'Missing title tag — add one immediately.'
                : !titleOptimal
                    ? `Title is ${titleLen} chars. Aim for 30–60.`
                    : null,
        },
        metaDescription: {
            exists: !!metaDesc,
            content: descContent,
            length: descLen,
            optimal: descOptimal,
            recommendation: !metaDesc
                ? 'Missing meta description — add one to improve click-through rates.'
                : !descOptimal
                    ? `Meta description is ${descLen} chars. Aim for 120–160.`
                    : null,
        },
        h1: {
            exists: h1Count > 0,
            count: h1Count,
            content: h1 ? h1.textContent : '',
            optimal: h1Optimal,
            recommendation:
                h1Count === 0
                    ? 'Missing H1 tag — add a clear main heading.'
                    : h1Count > 1
                        ? `Found ${h1Count} H1 tags. Use exactly 1.`
                        : null,
        },
        h2: {
            exists: h2Count > 0,
            count: h2Count,
            optimal: h2Optimal,
            recommendation: !h2Optimal
                ? `Only ${h2Count} H2 heading(s). Add 2+ to structure your content.`
                : null,
        },
    };
}

// ─── LLM Readability ────────────────────────────────────────────────

/**
 * @param {string} html - Raw HTML string
 * @param {Document} doc - Parsed document
 * @returns {import('./schema.js').LLMReadabilityResult}
 */
export function checkLLMReadability(html, doc) {
    const scriptTags = doc.querySelectorAll('script');
    let scriptContent = 0;
    for (const script of scriptTags) {
        scriptContent += script.textContent.length;
    }

    const body = doc.querySelector('body');
    const textContent = body ? body.textContent.trim().length : 0;

    // More specific framework detection to avoid false positives
    let frameworkName = null;
    let jsFrameworkDetected = false;

    // React: look for react-specific attributes or script references
    if (
        /data-react|__react|react-root|reactroot|_next\/static/i.test(html) ||
        /["']react["']/i.test(html)
    ) {
        frameworkName = 'React';
        jsFrameworkDetected = true;
    }
    // Vue: look for vue-specific attributes
    else if (/data-v-[a-f0-9]|__vue|v-cloak|vue\.runtime|vue\.global/i.test(html)) {
        frameworkName = 'Vue';
        jsFrameworkDetected = true;
    }
    // Angular: look for angular-specific attributes (ng-app, ng-controller, _ng)
    else if (/ng-app|ng-controller|ng-version|_nghost|_ngcontent/i.test(html)) {
        frameworkName = 'Angular';
        jsFrameworkDetected = true;
    }

    const jsToTextRatio =
        textContent > 0 ? parseFloat((scriptContent / textContent).toFixed(2)) : null;
    const jsHeavy = scriptContent > textContent * 0.5;

    // More nuanced: a page with very little text isn't necessarily unfriendly
    // if it also has little/no script content (e.g., example.com)
    const llmFriendly = !jsHeavy;

    let recommendation = null;
    if (!llmFriendly) {
        recommendation =
            'Site appears JavaScript-heavy. AI crawlers may have difficulty reading content. Consider SSR or SSG.';
        if (frameworkName) {
            recommendation += ` Detected framework: ${frameworkName}.`;
        }
    } else if (textContent < 500) {
        recommendation = 'Very little text content detected. Consider adding more descriptive content.';
    }

    return {
        textContentLength: textContent,
        scriptContentLength: scriptContent,
        jsToTextRatio,
        jsFrameworkDetected,
        frameworkName,
        assessment: jsHeavy ? 'JS-Heavy (Potential LLM Issues)' : 'HTML-Rich (LLM-Friendly)',
        llmFriendly,
        recommendation,
    };
}

// ─── Structured Data ────────────────────────────────────────────────

/**
 * Extracts @type values from a JSON-LD object, handling @graph arrays.
 * @param {Object} data
 * @returns {string[]}
 */
function extractJsonLdTypes(data) {
    const types = [];

    if (data['@type']) {
        types.push(Array.isArray(data['@type']) ? data['@type'].join(', ') : data['@type']);
    }

    // Handle @graph pattern (e.g., Stripe)
    if (Array.isArray(data['@graph'])) {
        for (const item of data['@graph']) {
            if (item['@type']) {
                types.push(Array.isArray(item['@type']) ? item['@type'].join(', ') : item['@type']);
            }
        }
    }

    return types;
}

/**
 * @param {Document} doc
 * @returns {import('./schema.js').StructuredDataResult}
 */
export function checkStructuredData(doc) {
    const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
    const microdata = doc.querySelectorAll('[itemscope]');
    const ogTags = doc.querySelectorAll('meta[property^="og:"]');
    const twitterTags = doc.querySelectorAll('meta[name^="twitter:"]');

    const structuredDataTypes = [];
    let jsonLdErrors = 0;

    jsonLdScripts.forEach((script) => {
        try {
            const data = JSON.parse(script.textContent);
            const types = extractJsonLdTypes(data);
            structuredDataTypes.push(...types);
        } catch (e) {
            jsonLdErrors++;
        }
    });

    const hasStructured = jsonLdScripts.length > 0 || microdata.length > 0;

    // Build recommendation
    const missing = [];
    if (jsonLdScripts.length === 0) missing.push('JSON-LD schema markup');
    if (ogTags.length === 0) missing.push('Open Graph tags');
    if (twitterTags.length === 0) missing.push('Twitter Card tags');

    let recommendation = null;
    if (missing.length > 0) {
        recommendation = `Add ${missing.join(', ')} for better discoverability.`;
    }
    if (jsonLdErrors > 0) {
        recommendation = (recommendation || '') + ` ${jsonLdErrors} JSON-LD block(s) contain invalid JSON.`;
    }

    return {
        jsonLd: {
            exists: jsonLdScripts.length > 0,
            count: jsonLdScripts.length,
            types: structuredDataTypes,
            errors: jsonLdErrors,
        },
        microdata: {
            exists: microdata.length > 0,
            count: microdata.length,
        },
        openGraph: {
            exists: ogTags.length > 0,
            count: ogTags.length,
        },
        twitterCards: {
            exists: twitterTags.length > 0,
            count: twitterTags.length,
        },
        overallAssessment: hasStructured ? 'Good' : 'Missing',
        recommendation,
    };
}

// ─── Scoring ────────────────────────────────────────────────────────

/**
 * Calculates the overall score with per-category breakdown.
 * @param {Object} checks - { basicSEO, llmReadability, structuredData }
 * @returns {{ total: number, breakdown: import('./schema.js').ScoreBreakdown }}
 */
export function calculateScore(checks) {
    // Basic SEO (max 40)
    let basicScore = 0;
    if (checks.basicSEO.title.optimal) basicScore += 10;
    else if (checks.basicSEO.title.exists) basicScore += 5;

    if (checks.basicSEO.metaDescription.optimal) basicScore += 10;
    else if (checks.basicSEO.metaDescription.exists) basicScore += 5;

    if (checks.basicSEO.h1.optimal) basicScore += 10;
    else if (checks.basicSEO.h1.exists) basicScore += 5;

    if (checks.basicSEO.h2.optimal) basicScore += 10;
    else if (checks.basicSEO.h2.exists) basicScore += 5;

    // LLM Readability (max 30)
    let llmScore = 0;
    if (checks.llmReadability.llmFriendly) llmScore += 30;
    else if (checks.llmReadability.textContentLength > 500) llmScore += 15;

    // Structured Data (max 30)
    let structuredScore = 0;
    if (checks.structuredData.jsonLd.exists) structuredScore += 15;
    if (checks.structuredData.openGraph.exists) structuredScore += 10;
    if (checks.structuredData.twitterCards.exists) structuredScore += 5;

    return {
        total: basicScore + llmScore + structuredScore,
        breakdown: {
            basicSEO: { score: basicScore, maxScore: 40 },
            llmReadability: { score: llmScore, maxScore: 30 },
            structuredData: { score: structuredScore, maxScore: 30 },
        },
    };
}

// ─── Main Entry Point ───────────────────────────────────────────────

/**
 * Run a full SEO audit on a parsed HTML document.
 *
 * @param {string} html - Raw HTML string
 * @param {Document} doc - Parsed document (from DOMParser or jsdom)
 * @param {string} url - The URL that was audited
 * @returns {import('./schema.js').AuditResult}
 */
export function runAudit(html, doc, url) {
    const checks = {
        basicSEO: checkBasicSEO(doc),
        llmReadability: checkLLMReadability(html, doc),
        structuredData: checkStructuredData(doc),
    };

    const score = calculateScore(checks);

    return {
        schemaVersion: SCHEMA_VERSION,
        url,
        timestamp: new Date().toISOString(),
        score,
        checks,
    };
}
