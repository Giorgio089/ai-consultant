/**
 * GEO Page Audit — Audit Engine
 *
 * Standalone module that analyzes parsed HTML and returns a structured
 * audit result conforming to the schema in ./schema.js (SCHEMA_VERSION).
 *
 * Runtime-agnostic: works with browser DOMParser, jsdom and linkedom.
 * Only standard DOM APIs are used (querySelector/All, getAttribute,
 * textContent, cloneNode, remove) — no window or other globals.
 * Does NOT handle fetching — caller provides (html, doc, url).
 */

import { SCHEMA_VERSION } from './schema.js';

// ─── Helpers ────────────────────────────────────────────────────────

/** Collapses all whitespace runs to one space and trims. */
function normalizeText(str) {
    return (str || '').replace(/\s+/g, ' ').trim();
}

function attr(el, name) {
    return el && typeof el.getAttribute === 'function' ? el.getAttribute(name) : null;
}

function tagNameOf(el) {
    return (el && el.tagName ? String(el.tagName) : '').toLowerCase();
}

function isInsideSvg(el) {
    for (let node = el && el.parentNode; node; node = node.parentNode) {
        if (tagNameOf(node) === 'svg') return true;
    }
    return false;
}

/** All <meta name="…"> elements whose name matches (case-insensitive). */
function metasByName(doc, name) {
    const wanted = name.toLowerCase();
    return Array.from(doc.querySelectorAll('meta[name]')).filter(
        (m) => (attr(m, 'name') || '').trim().toLowerCase() === wanted,
    );
}

/** Text of an element without script/style/noscript/template/svg content. */
function visibleText(el) {
    if (!el) return '';
    const clone = el.cloneNode(true);
    clone.querySelectorAll('script,style,noscript,template,svg').forEach((n) => n.remove());
    return normalizeText(clone.textContent);
}

// ─── Basic SEO ──────────────────────────────────────────────────────

function findPageTitle(doc) {
    const headTitle = doc.querySelector('head > title');
    if (headTitle) return headTitle;
    // Fallback (e.g. no <head> element): first <title> not belonging to an inline SVG.
    return Array.from(doc.querySelectorAll('title')).find((t) => !isInsideSvg(t)) || null;
}

/**
 * Parses robots directives (meta robots + googlebot) relevant for AI search.
 * noindex / none / nosnippet / max-snippet:0 block AI Overviews and citations.
 */
function checkRobots(doc) {
    const metas = [...metasByName(doc, 'robots'), ...metasByName(doc, 'googlebot')];
    const content = metas.map((m) => normalizeText(attr(m, 'content'))).filter(Boolean).join(', ');
    const directives = content.toLowerCase().split(',').map((d) => d.trim()).filter(Boolean);

    const noindex = directives.includes('noindex') || directives.includes('none');
    const nosnippet = directives.includes('nosnippet');
    let maxSnippet = null;
    for (const d of directives) {
        const m = /^max-snippet\s*:\s*(-?\d+)$/.exec(d);
        if (m) {
            const n = parseInt(m[1], 10);
            maxSnippet = maxSnippet === null ? n : Math.min(maxSnippet, n);
        }
    }
    const dataNosnippetCount = doc.querySelectorAll('[data-nosnippet]').length;

    let status = 'good';
    const problems = [];
    if (noindex) problems.push('noindex');
    if (nosnippet) problems.push('nosnippet');
    if (maxSnippet === 0) problems.push('max-snippet:0');
    if (problems.length) status = 'bad';
    else if (maxSnippet !== null && maxSnippet > 0 && maxSnippet < 50) status = 'warn';

    let recommendation = null;
    if (status === 'bad') {
        recommendation = `Robots directive ${problems.join(', ')} prevents AI Overviews / AI answers from citing this page.`;
    } else if (status === 'warn') {
        recommendation = `max-snippet:${maxSnippet} is very short — AI answers can only quote ${maxSnippet} characters.`;
    }

    return {
        exists: metas.length > 0,
        content,
        noindex,
        nosnippet,
        maxSnippet,
        dataNosnippetCount,
        status,
        recommendation,
    };
}

function stripForCompare(u) {
    u.hash = '';
    return u.href.replace(/\/$/, '');
}

function checkCanonical(doc, pageUrl) {
    const links = Array.from(doc.querySelectorAll('link[rel]')).filter((l) =>
        (attr(l, 'rel') || '').toLowerCase().split(/\s+/).includes('canonical'),
    );
    const href = links.length ? normalizeText(attr(links[0], 'href')) : '';
    const absolute = /^https?:\/\//i.test(href);

    let pointsElsewhere = null;
    if (href && pageUrl) {
        try {
            const target = new URL(href, pageUrl);
            pointsElsewhere = stripForCompare(target) !== stripForCompare(new URL(pageUrl));
        } catch (e) {
            pointsElsewhere = null;
        }
    }

    let status = 'good';
    let recommendation = null;
    if (!links.length || !href) {
        status = 'warn';
        recommendation = 'No canonical link — add <link rel="canonical"> so AI crawlers attribute content to the right URL.';
    } else if (links.length > 1) {
        status = 'warn';
        recommendation = `Found ${links.length} canonical links. Use exactly 1.`;
    } else if (!absolute) {
        status = 'warn';
        recommendation = 'Canonical URL is relative — use an absolute URL.';
    } else if (pointsElsewhere) {
        status = 'info';
        recommendation = 'Canonical points to a different URL — this page will be treated as a duplicate of it.';
    }

    return {
        exists: links.length > 0 && !!href,
        count: links.length,
        href,
        absolute,
        pointsElsewhere,
        status,
        recommendation,
    };
}

function checkHeadingStructure(doc) {
    const headings = Array.from(doc.querySelectorAll('h1,h2,h3,h4,h5,h6'));
    const skips = [];
    let prev = 0;
    for (const h of headings) {
        const level = parseInt(tagNameOf(h).slice(1), 10);
        if (prev && level > prev + 1) skips.push({ from: `h${prev}`, to: `h${level}` });
        prev = level;
    }
    return {
        count: headings.length,
        skips,
        optimal: skips.length === 0,
        recommendation: skips.length
            ? `Heading levels skipped (${skips.map((s) => `${s.from}→${s.to}`).join(', ')}). Use a continuous hierarchy so AI can parse sections.`
            : null,
    };
}

function checkImages(doc) {
    const imgs = Array.from(doc.querySelectorAll('img'));
    const missingAlt = imgs.filter((img) => attr(img, 'alt') === null).length;
    const ratio = imgs.length ? parseFloat((missingAlt / imgs.length).toFixed(2)) : 0;
    return {
        total: imgs.length,
        missingAlt,
        ratio,
        optimal: missingAlt === 0,
        recommendation: missingAlt
            ? `${missingAlt} of ${imgs.length} image(s) have no alt attribute. Describe images (alt="" for decorative ones).`
            : null,
    };
}

/**
 * @param {Document} doc
 * @param {string} [url] - Audited URL (used to compare the canonical link)
 * @returns {import('./schema.js').BasicSEOResult}
 */
export function checkBasicSEO(doc, url) {
    const title = findPageTitle(doc);
    const metaDesc = metasByName(doc, 'description')[0] || null;
    const h1s = doc.querySelectorAll('h1');
    const h1 = h1s[0];
    const h2s = doc.querySelectorAll('h2');

    const titleText = title ? normalizeText(title.textContent) : '';
    const titleLen = titleText.length;
    const titleOptimal = !!title && titleLen >= 30 && titleLen <= 60;

    const descContent = metaDesc ? normalizeText(attr(metaDesc, 'content')) : '';
    const descLen = descContent.length;
    const descOptimal = !!metaDesc && descLen >= 120 && descLen <= 160;

    const h1Count = h1s.length;
    const h1Optimal = h1Count === 1;

    const h2Count = h2s.length;
    const h2Optimal = h2Count >= 2;

    const htmlEl = doc.documentElement;
    const langValue = normalizeText(attr(htmlEl, 'lang'));
    const hreflangCount = Array.from(doc.querySelectorAll('link[hreflang]')).filter((l) =>
        (attr(l, 'rel') || '').toLowerCase().split(/\s+/).includes('alternate'),
    ).length;

    return {
        title: {
            exists: !!title,
            content: titleText,
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
            content: h1 ? normalizeText(h1.textContent) : '',
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
        robots: checkRobots(doc),
        canonical: checkCanonical(doc, url),
        lang: {
            exists: !!langValue,
            value: langValue,
            hreflangCount,
            recommendation: langValue ? null : 'Add a lang attribute to <html> so AI systems know the content language.',
        },
        headingStructure: checkHeadingStructure(doc),
        images: checkImages(doc),
    };
}

// ─── LLM Readability ────────────────────────────────────────────────

/** Visible text below this length counts as "thin" (empty shell / placeholder). */
export const THIN_TEXT_THRESHOLD = 200;

/**
 * Detects the specific JS framework from markers that only the framework emits.
 * Meta-frameworks are checked before their underlying library.
 * @param {string} html
 * @returns {string|null}
 */
export function detectFramework(html) {
    const src = html || '';
    const rules = [
        ['Next.js', /id=["']?__NEXT_DATA__|\/_next\/static\//],
        ['Nuxt', /window\.__NUXT__|id=["']?__NUXT_DATA__|\/_nuxt\/|\sdata-n-head[\s=>]/],
        ['Gatsby', /id=["']?___gatsby|\/page-data\/app-data\.json/],
        ['Remix', /window\.__remixContext/],
        ['SvelteKit', /data-sveltekit-|__sveltekit_/],
        ['Astro', /<astro-island[\s>]/],
        ['Angular', /\sng-version=|\s_nghost-[\w-]+|\s_ngcontent-[\w-]+/],
        ['AngularJS', /\sng-app[\s=>]|\sng-controller=/],
        ['React', /\sdata-reactroot[\s=>]|\sdata-reactid=|react-dom(\.production|\.development)?(\.min)?\.js/],
        ['Vue', /\sdata-v-app[\s=>]|\sdata-v-[a-f0-9]{6,8}[\s=>]|\sv-cloak[\s=>]|vue(\.runtime)?(\.global)?(\.prod)?(\.min)?\.js/],
        ['Svelte', /class=["'][^"']*\bsvelte-[a-z0-9]{5,8}\b/],
    ];
    for (const [name, re] of rules) {
        if (re.test(src)) return name;
    }
    return null;
}

/**
 * Measures how readable the server-delivered HTML is for LLM crawlers
 * (which mostly do not execute JavaScript).
 *
 * - textContentLength: visible body text (script/style/noscript/template/svg
 *   removed, whitespace collapsed).
 * - mainContentLength: same, for the first <main>/<article>/[role=main]
 *   (null if none exists).
 * - scriptContentLength: inline executable JS only (JSON-LD and other data
 *   blocks are excluded); externalScriptCount: <script src> tags.
 * - jsHeavy: inline JS > 50 % of the visible text, OR an "app shell":
 *   thin visible text (< THIN_TEXT_THRESHOLD) plus at least one external script.
 * - thinContent: visible text < THIN_TEXT_THRESHOLD.
 *
 * Scoring (see calculateScore, max 30): app shell 0; JS-heavy 15 if > 500
 * chars of text else 0; thin page without JS 10; otherwise 30.
 *
 * @param {string} html - Raw HTML string
 * @param {Document} doc - Parsed document
 * @returns {import('./schema.js').LLMReadabilityResult}
 */
export function checkLLMReadability(html, doc) {
    const allScripts = Array.from(doc.querySelectorAll('script'));
    // Only executable scripts count; JSON-LD and other data blocks are not JavaScript.
    const execScripts = allScripts.filter((script) =>
        /^(|text\/javascript|application\/javascript|module)$/i.test((attr(script, 'type') || '').trim()),
    );
    const externalScriptCount = execScripts.filter((s) => attr(s, 'src')).length;
    const scriptContent = execScripts
        .filter((s) => !attr(s, 'src'))
        .reduce((acc, script) => acc + (script.textContent || '').length, 0);

    const body = doc.querySelector('body') || doc.documentElement;
    const textContent = visibleText(body).length;
    const mainEl = doc.querySelector('main, article, [role="main"]');
    const mainContentLength = mainEl ? visibleText(mainEl).length : null;

    const frameworkName = detectFramework(html);
    const jsFrameworkDetected = frameworkName !== null;

    const thinContent = textContent < THIN_TEXT_THRESHOLD;
    const appShell = thinContent && externalScriptCount > 0;

    const jsToTextRatio =
        textContent > 0 ? parseFloat((scriptContent / textContent).toFixed(2)) : null;
    const jsHeavy = scriptContent > textContent * 0.5 || appShell;
    const llmFriendly = !jsHeavy;

    let recommendation = null;
    let assessment;
    if (appShell) {
        assessment = 'Empty App Shell (Content Needs JavaScript)';
        recommendation =
            `Only ${textContent} chars of visible text but ${externalScriptCount} external script(s) — content is likely rendered client-side and invisible to most AI crawlers. Use SSR or SSG.`;
    } else if (jsHeavy) {
        assessment = 'JS-Heavy (Potential LLM Issues)';
        recommendation =
            'Site appears JavaScript-heavy. AI crawlers may have difficulty reading content. Consider SSR or SSG.';
    } else if (thinContent) {
        assessment = 'Thin Content';
        recommendation = 'Very little text content detected. Consider adding more descriptive content.';
    } else {
        assessment = 'HTML-Rich (LLM-Friendly)';
        if (textContent < 500) {
            recommendation = 'Little text content detected. Consider adding more descriptive content.';
        }
    }
    if (jsHeavy && frameworkName) recommendation += ` Detected framework: ${frameworkName}.`;

    return {
        textContentLength: textContent,
        mainContentLength,
        scriptContentLength: scriptContent,
        externalScriptCount,
        jsToTextRatio,
        jsFrameworkDetected,
        frameworkName,
        thinContent,
        appShell,
        assessment,
        llmFriendly,
        recommendation,
    };
}

// ─── Structured Data ────────────────────────────────────────────────

/**
 * Flattens parsed JSON-LD into its entity objects: top-level arrays,
 * single objects and @graph members (recursively). Non-objects are skipped.
 * @param {*} data
 * @param {Object[]} [out]
 * @returns {Object[]}
 */
function collectJsonLdItems(data, out = []) {
    if (Array.isArray(data)) {
        for (const item of data) collectJsonLdItems(item, out);
    } else if (data && typeof data === 'object') {
        out.push(data);
        if (Array.isArray(data['@graph'])) collectJsonLdItems(data['@graph'], out);
        else if (data['@graph'] && typeof data['@graph'] === 'object') collectJsonLdItems(data['@graph'], out);
    }
    return out;
}

/**
 * Extracts @type values from parsed JSON-LD (objects, arrays, @graph).
 * @param {*} data
 * @returns {string[]}
 */
export function extractJsonLdTypes(data) {
    const types = [];
    for (const item of collectJsonLdItems(data)) {
        const t = item['@type'];
        if (Array.isArray(t)) {
            if (t.length) types.push(t.join(', '));
        } else if (typeof t === 'string' && t) {
            types.push(t);
        }
    }
    return types;
}

function typesOf(item) {
    const t = item['@type'];
    return (Array.isArray(t) ? t : [t]).filter((x) => typeof x === 'string');
}

function hasValue(v) {
    if (v === undefined || v === null) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0;
    return true;
}

const ARTICLE_TYPES = ['Article', 'NewsArticle', 'BlogPosting'];

/** Returns the list of missing recommended fields for an item, or null if its type isn't checked. */
function missingFieldsFor(item) {
    const types = typesOf(item);
    const missing = [];
    let checked = false;

    if (types.some((t) => ARTICLE_TYPES.includes(t))) {
        checked = true;
        for (const f of ['headline', 'author', 'datePublished']) if (!hasValue(item[f])) missing.push(f);
    }
    if (types.includes('Organization')) {
        checked = true;
        for (const f of ['name', 'url']) if (!hasValue(item[f])) missing.push(f);
    }
    if (types.includes('Product')) {
        checked = true;
        if (!hasValue(item.name)) missing.push('name');
        if (!hasValue(item.offers) && !hasValue(item.review) && !hasValue(item.aggregateRating)) {
            missing.push('offers|review|aggregateRating');
        }
    }
    if (types.includes('FAQPage')) {
        checked = true;
        const entities = item.mainEntity == null ? [] : [].concat(item.mainEntity);
        if (!entities.length) {
            missing.push('mainEntity');
        } else {
            const valid = entities.filter((q) => q && typeof q === 'object');
            if (valid.length < entities.length || valid.some((q) => !typesOf(q).includes('Question'))) {
                missing.push('mainEntity[@type=Question]');
            }
            if (valid.some((q) => !hasValue(q.acceptedAnswer))) missing.push('mainEntity.acceptedAnswer');
        }
    }
    return checked ? [...new Set(missing)] : null;
}

function personName(v) {
    if (!hasValue(v)) return null;
    const first = Array.isArray(v) ? v[0] : v;
    if (typeof first === 'string') return first.trim() || null;
    if (first && typeof first === 'object') return typeof first.name === 'string' ? first.name : '(object)';
    return null;
}

function firstMeta(doc, selector) {
    const el = doc.querySelectorAll(selector)[0];
    const v = el ? normalizeText(attr(el, 'content')) : '';
    return v || null;
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
    const items = [];
    let jsonLdErrors = 0;
    let jsonLdEmpty = 0;

    jsonLdScripts.forEach((script) => {
        let data;
        try {
            data = JSON.parse(script.textContent);
        } catch (e) {
            jsonLdErrors++;
            return;
        }
        const blockItems = collectJsonLdItems(data);
        if (!blockItems.length) {
            // Valid JSON (e.g. null, [], "x") but no structured data in it.
            jsonLdEmpty++;
            return;
        }
        items.push(...blockItems);
        structuredDataTypes.push(...extractJsonLdTypes(data));
    });

    const jsonLdValid = jsonLdScripts.length - jsonLdErrors - jsonLdEmpty;

    // Required/recommended fields for common types
    const requiredFields = [];
    let requiredChecked = 0;
    for (const item of items) {
        const missing = missingFieldsFor(item);
        if (missing === null) continue;
        requiredChecked++;
        if (missing.length) requiredFields.push({ type: typesOf(item).join(', '), missing });
    }

    // Author & date signals (JSON-LD first, then meta / microdata)
    const pick = (key) => {
        for (const item of items) if (hasValue(item[key]) && typeof item[key] === 'string') return item[key].trim();
        return null;
    };
    let author = null;
    for (const item of items) {
        author = personName(item.author);
        if (author) break;
    }
    const microdataProp = (prop) => {
        const el = doc.querySelectorAll(`[itemprop="${prop}"]`)[0];
        if (!el) return null;
        return normalizeText(attr(el, 'content') || attr(el, 'datetime') || el.textContent) || null;
    };
    const datePublished = pick('datePublished')
        || firstMeta(doc, 'meta[property="article:published_time"]')
        || microdataProp('datePublished');
    const dateModified = pick('dateModified')
        || firstMeta(doc, 'meta[property="article:modified_time"]')
        || microdataProp('dateModified');
    author = author
        || firstMeta(doc, 'meta[name="author"]')
        || firstMeta(doc, 'meta[property="article:author"]')
        || microdataProp('author');

    const authorDate = {
        datePublished,
        dateModified,
        author,
        hasDate: !!(datePublished || dateModified),
        hasAuthor: !!author,
    };

    const hasStructured = jsonLdValid > 0 || microdata.length > 0;

    // Build recommendation
    const missing = [];
    if (jsonLdValid <= 0) missing.push('JSON-LD schema markup');
    if (ogTags.length === 0) missing.push('Open Graph tags');
    if (twitterTags.length === 0) missing.push('Twitter Card tags');

    const parts = [];
    if (missing.length > 0) parts.push(`Add ${missing.join(', ')} for better discoverability.`);
    if (jsonLdErrors > 0) parts.push(`${jsonLdErrors} JSON-LD block(s) contain invalid JSON.`);
    if (jsonLdEmpty > 0) parts.push(`${jsonLdEmpty} JSON-LD block(s) contain no data.`);
    if (requiredFields.length > 0) {
        parts.push(`Missing schema fields: ${requiredFields.map((r) => `${r.type} (${r.missing.join(', ')})`).join('; ')}.`);
    }
    if (!authorDate.hasAuthor || !authorDate.hasDate) {
        parts.push('Add author and publish/modified dates — AI answers favour attributable, fresh content.');
    }
    const recommendation = parts.length ? parts.join(' ') : null;

    return {
        jsonLd: {
            exists: jsonLdScripts.length > 0,
            count: jsonLdScripts.length,
            validCount: jsonLdValid,
            types: structuredDataTypes,
            errors: jsonLdErrors,
            empty: jsonLdEmpty,
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
        requiredFields: {
            checked: requiredChecked,
            issues: requiredFields,
        },
        authorDate,
        overallAssessment: hasStructured ? 'Good' : 'Missing',
        recommendation,
    };
}

// ─── Scoring ────────────────────────────────────────────────────────

/**
 * Calculates the overall score (0–100) with per-category breakdown.
 *
 * Basic SEO (max 45): title 10/5, meta description 10/5, H1 10/5, H2 10/5,
 *   robots 2 (good) / 1 (warn) / 0 (blocks AI), canonical 2 (good or points
 *   elsewhere) / 1 (present with issues), html lang 1.
 * LLM readability (max 30): see checkLLMReadability.
 * Structured data (max 25): valid JSON-LD 10, required fields complete 3,
 *   author/date signal 2 (1 each), Open Graph 8, Twitter Cards 2.
 *
 * Missing newer fields (older result shapes) simply score 0.
 *
 * @param {Object} checks - { basicSEO, llmReadability, structuredData }
 * @returns {{ total: number, breakdown: import('./schema.js').ScoreBreakdown }}
 */
export function calculateScore(checks) {
    const seo = checks.basicSEO;
    let basicScore = 0;
    for (const key of ['title', 'metaDescription', 'h1', 'h2']) {
        if (seo[key]?.optimal) basicScore += 10;
        else if (seo[key]?.exists) basicScore += 5;
    }
    const robotsStatus = seo.robots?.status;
    if (robotsStatus === 'good') basicScore += 2;
    else if (robotsStatus === 'warn') basicScore += 1;
    const canonicalStatus = seo.canonical?.status;
    if (canonicalStatus === 'good' || canonicalStatus === 'info') basicScore += 2;
    else if (seo.canonical?.exists) basicScore += 1;
    if (seo.lang?.exists) basicScore += 1;

    const llm = checks.llmReadability;
    let llmScore = 0;
    if (llm.appShell) llmScore = 0;
    else if (!llm.llmFriendly) llmScore = llm.textContentLength > 500 ? 15 : 0;
    else if (llm.thinContent) llmScore = 10;
    else llmScore = 30;

    const sd = checks.structuredData;
    let structuredScore = 0;
    const validJsonLd = typeof sd.jsonLd?.validCount === 'number'
        ? sd.jsonLd.validCount > 0
        : !!sd.jsonLd?.exists && (sd.jsonLd.count ?? 0) - (sd.jsonLd.errors ?? 0) > 0;
    if (validJsonLd) {
        structuredScore += 10;
        if ((sd.requiredFields?.issues?.length ?? 0) === 0) structuredScore += 3;
    }
    if (sd.authorDate?.hasAuthor) structuredScore += 1;
    if (sd.authorDate?.hasDate) structuredScore += 1;
    if (sd.openGraph?.exists) structuredScore += 8;
    if (sd.twitterCards?.exists) structuredScore += 2;

    return {
        total: basicScore + llmScore + structuredScore,
        breakdown: {
            basicSEO: { score: basicScore, maxScore: 45 },
            llmReadability: { score: llmScore, maxScore: 30 },
            structuredData: { score: structuredScore, maxScore: 25 },
        },
    };
}

// ─── Main Entry Point ───────────────────────────────────────────────

/**
 * Run a full SEO / GEO audit on a parsed HTML document.
 *
 * @param {string} html - Raw HTML string
 * @param {Document} doc - Parsed document (from DOMParser, jsdom or linkedom)
 * @param {string} url - The URL that was audited
 * @returns {import('./schema.js').AuditResult}
 */
export function runAudit(html, doc, url) {
    const checks = {
        basicSEO: checkBasicSEO(doc, url),
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
