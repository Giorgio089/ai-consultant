/**
 * AI SEO Consultant — Popup UI Controller
 *
 * Handles button clicks, fetches HTML, runs audit,
 * and renders results. All logic runs in the popup
 * because DOMParser is not available in MV3 service workers.
 */

import { runAudit } from './audit/runAudit.js';
import { getBrowserApi } from './lib/browserApi.js';
import { callBotView, getSettings, requestDataConsent, severityToStatus } from './lib/detective.js';

// ─── DOM Elements ───────────────────────────────────────────────────

const $ = (sel) => document.querySelector(sel);
const analyzeBtn = $('#analyzeBtn');
const loadingEl = $('#loading');
const errorEl = $('#error');
const resultsEl = $('#results');
const statusEl = $('#status');
const copyJsonBtn = $('#copyJsonBtn');
const detectiveBtn = $('#detectiveBtn');
const detectiveLoadingEl = $('#detectiveLoading');
const detectiveErrorEl = $('#detectiveError');
const detectiveResultsEl = $('#detectiveResults');
const keyRowEl = $('#keyRow');
const apiKeyInput = $('#apiKeyInput');
const forgetKeyBtn = $('#forgetKeyBtn');

let lastResult = null;
let lastTextLength = null;
const browserApi = getBrowserApi();

// ─── Analyze ────────────────────────────────────────────────────────

analyzeBtn.addEventListener('click', async () => {
    // Get current tab
    const [tab] = await browserApi.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab?.url) {
        showError('Could not get the current tab URL.');
        return;
    }

    const url = tab.url;

    // Validate URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        showError('Only http:// and https:// pages can be analyzed.');
        return;
    }

    // Show loading
    statusEl.classList.add('hidden');
    errorEl.classList.add('hidden');
    resultsEl.classList.add('hidden');
    loadingEl.classList.remove('hidden');

    try {
        // Primary: Read the already-loaded DOM from the tab
        // → No additional HTTP request = no WAF/CORS/auth issues
        // → Also gets JS-rendered content!
        const { html, textLength } = await getTabHTML(tab.id);
        lastTextLength = textLength;

        // Parse HTML in the popup context
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Run audit
        const result = runAudit(html, doc, url);

        loadingEl.classList.add('hidden');
        lastResult = result;
        resetDetective();
        renderResults(result);
    } catch (err) {
        loadingEl.classList.add('hidden');
        showError(`Analysis failed: ${err.message}`);
    }
});

/**
 * Get the full HTML from the current tab via content script injection.
 * This reads the live, rendered DOM — not a new fetch.
 */
async function getTabHTML(tabId) {
    try {
        const results = await browserApi.scripting.executeScript({
            target: { tabId },
            func: () => ({
                html: document.documentElement.outerHTML,
                // Same normalization as datadetective's raw-HTML count, so both are comparable.
                textLength: (document.body?.innerText || '').replace(/\s+/g, ' ').trim().length,
            }),
        });

        if (results && results[0] && results[0].result?.html) {
            return results[0].result;
        }
        throw new Error('No HTML returned from tab.');
    } catch (err) {
        // Fallback: direct fetch (might fail on WAF-protected sites)
        console.warn('Script injection failed, falling back to fetch:', err.message);
        throw new Error(
            `Could not read this page. ${err.message}. Try refreshing the page and analyzing again.`
        );
    }
}

// ─── Copy JSON ──────────────────────────────────────────────────────

copyJsonBtn.addEventListener('click', async () => {
    if (!lastResult) return;

    try {
        await navigator.clipboard.writeText(JSON.stringify(lastResult, null, 2));
        copyJsonBtn.textContent = '✅ Copied!';
        copyJsonBtn.classList.add('copied');
        setTimeout(() => {
            copyJsonBtn.textContent = '📋 Copy JSON';
            copyJsonBtn.classList.remove('copied');
        }, 2000);
    } catch (err) {
        copyJsonBtn.textContent = '❌ Failed';
        setTimeout(() => {
            copyJsonBtn.textContent = '📋 Copy JSON';
        }, 2000);
    }
});

// ─── Detective ──────────────────────────────────────────────────────

detectiveBtn.addEventListener('click', () => {
    // Consent first: Firefox only shows its prompt while the click is still being handled.
    const consent = requestDataConsent();
    runDetective(consent);
});

async function runDetective(consent) {
    if (!lastResult) return;
    if (!(await consent)) {
        showDetectiveError('No problem: without your consent the URL stays in your browser.');
        return;
    }

    const { apiKey, apiBase } = await getSettings(browserApi.storage.local);
    detectiveErrorEl.classList.add('hidden');
    detectiveResultsEl.replaceChildren();
    detectiveLoadingEl.classList.remove('hidden');
    detectiveBtn.disabled = true;

    const outcome = await callBotView({
        url: lastResult.url,
        renderedTextLength: lastTextLength,
        apiKey,
        apiBase,
    });

    detectiveLoadingEl.classList.add('hidden');
    detectiveBtn.disabled = false;

    if (!outcome.ok) {
        showDetectiveError(outcome.message);
        if (outcome.reason === 'no_key' || outcome.reason === 'invalid_key') keyRowEl.classList.remove('hidden');
        return;
    }
    lastResult.botView = outcome.data;
    forgetKeyBtn.classList.remove('hidden');
    renderBotView(outcome.data);
}

$('#saveKeyBtn').addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) return;
    await browserApi.storage.local.set({ apiKey });
    apiKeyInput.value = '';
    keyRowEl.classList.add('hidden');
    detectiveErrorEl.classList.add('hidden');
    forgetKeyBtn.classList.remove('hidden');
});

forgetKeyBtn.addEventListener('click', async () => {
    await browserApi.storage.local.remove('apiKey');
    forgetKeyBtn.classList.add('hidden');
    keyRowEl.classList.remove('hidden');
});

function resetDetective() {
    delete lastResult?.botView;
    detectiveResultsEl.replaceChildren();
    detectiveErrorEl.classList.add('hidden');
    getSettings(browserApi.storage.local).then(({ apiKey }) => {
        keyRowEl.classList.toggle('hidden', !!apiKey);
        forgetKeyBtn.classList.toggle('hidden', !apiKey);
    });
}

function showDetectiveError(message) {
    detectiveErrorEl.textContent = `⚠️ ${message}`;
    detectiveErrorEl.classList.remove('hidden');
}

function renderBotView(data) {
    detectiveResultsEl.replaceChildren();

    for (const finding of data.findings) {
        detectiveResultsEl.appendChild(
            makeCheckItem(severityToStatus(finding.severity), capitalize(finding.severity), finding.message, null),
        );
    }
    if (data.findings.length === 0) {
        detectiveResultsEl.appendChild(
            makeCheckItem('good', 'No issues found', 'AI crawlers get the same content you see.', null),
        );
    }

    if (data.rawVisibilityRatio !== null) {
        detectiveResultsEl.appendChild(
            makeCheckItem(
                data.rawVisibilityRatio >= 0.7 ? 'good' : data.rawVisibilityRatio >= 0.3 ? 'warn' : 'bad',
                'Visible without JavaScript',
                `${Math.round(data.rawVisibilityRatio * 100)} % of the rendered text is in the raw HTML`,
                null,
            ),
        );
    }

    for (const bot of data.bots) {
        const fetchInfo = !bot.fetch.tested
            ? 'robots.txt token only'
            : bot.fetch.error
                ? `fetch failed: ${bot.fetch.error}`
                : `HTTP ${bot.fetch.status}${bot.fetch.blocked ? ' (blocked)' : ''} · ${bot.fetch.textLength.toLocaleString()} chars`;
        const robotsInfo = bot.robots.allowed === null
            ? 'unknown'
            : bot.robots.allowed ? 'allowed' : `disallowed (${bot.robots.rule})`;
        const status = bot.robots.allowed === false || bot.fetch.blocked
            ? 'bad'
            : bot.robots.allowed === null ? 'warn' : 'good';
        detectiveResultsEl.appendChild(
            makeCheckItem(status, `${bot.token} · ${bot.operator}, ${bot.purpose}`, `robots.txt ${robotsInfo} · ${fetchInfo}`, null),
        );
    }

    const caveat = document.createElement('p');
    caveat.className = 'check-detail detective-note';
    caveat.textContent = data.caveat;
    detectiveResultsEl.appendChild(caveat);
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Error Display ──────────────────────────────────────────────────

function showError(message) {
    loadingEl.classList.add('hidden');
    errorEl.textContent = `⚠️ ${message}`;
    errorEl.classList.remove('hidden');
    statusEl.classList.remove('hidden');
}

// ─── Render Results ─────────────────────────────────────────────────

function renderResults(data) {
    resultsEl.classList.remove('hidden');

    // Score
    const total = data.score.total;
    const color = getScoreColor(total);

    $('#scoreCircle').style.borderColor = color;
    $('#scoreValue').textContent = total;
    $('#scoreValue').style.color = color;
    $('#scoreLabel').textContent =
        total >= 80
            ? '🎉 Excellent!'
            : total >= 60
                ? '👍 Good, room for improvement'
                : '⚠️ Needs work';

    $('#auditUrl').textContent = data.url;

    // Section scores
    const bd = data.score.breakdown;
    $('#seoScore').textContent = `${bd.basicSEO.score}/${bd.basicSEO.maxScore}`;
    $('#llmScore').textContent = `${bd.llmReadability.score}/${bd.llmReadability.maxScore}`;
    $('#sdScore').textContent = `${bd.structuredData.score}/${bd.structuredData.maxScore}`;

    // Render checks
    renderBasicSEO(data.checks.basicSEO);
    renderLLMReadability(data.checks.llmReadability);
    renderStructuredData(data.checks.structuredData);
}

// ─── Basic SEO ──────────────────────────────────────────────────────

function renderBasicSEO(seo) {
    const container = $('#seoChecks');
    container.replaceChildren();

    // Title
    container.appendChild(
        makeCheckItem(
            seo.title.optimal ? 'good' : seo.title.exists ? 'warn' : 'bad',
            'Title Tag',
            seo.title.exists
                ? `"${truncate(seo.title.content, 60)}" — ${seo.title.length} chars (optimal: 30–60)`
                : 'Missing',
            seo.title.recommendation,
        ),
    );

    // Meta Description
    container.appendChild(
        makeCheckItem(
            seo.metaDescription.optimal ? 'good' : seo.metaDescription.exists ? 'warn' : 'bad',
            'Meta Description',
            seo.metaDescription.exists
                ? `"${truncate(seo.metaDescription.content, 80)}" — ${seo.metaDescription.length} chars (optimal: 120–160)`
                : 'Missing',
            seo.metaDescription.recommendation,
        ),
    );

    // H1
    container.appendChild(
        makeCheckItem(
            seo.h1.optimal ? 'good' : seo.h1.exists ? 'warn' : 'bad',
            'H1 Heading',
            seo.h1.exists ? `"${truncate(seo.h1.content, 60)}" — ${seo.h1.count} found` : 'Missing',
            seo.h1.recommendation,
        ),
    );

    // H2
    container.appendChild(
        makeCheckItem(
            seo.h2.optimal ? 'good' : seo.h2.exists ? 'warn' : 'bad',
            'H2 Headings',
            `${seo.h2.count} found (recommended: 2+)`,
            seo.h2.recommendation,
        ),
    );

    // Heading hierarchy
    if (seo.headingStructure) {
        container.appendChild(
            makeCheckItem(
                seo.headingStructure.optimal ? 'good' : 'warn',
                'Heading Structure',
                seo.headingStructure.skips.length
                    ? `Skipped levels: ${seo.headingStructure.skips.map((s) => `${s.from}→${s.to}`).join(', ')}`
                    : `${seo.headingStructure.count} headings, no skipped levels`,
                seo.headingStructure.recommendation,
            ),
        );
    }

    // Meta robots
    if (seo.robots) {
        const robotsDetail = [
            seo.robots.exists ? `"${truncate(seo.robots.content, 60)}"` : 'No robots meta (indexable)',
            seo.robots.dataNosnippetCount ? `${seo.robots.dataNosnippetCount} data-nosnippet element(s)` : null,
        ].filter(Boolean).join(' · ');
        container.appendChild(
            makeCheckItem(seo.robots.status, 'Meta Robots', robotsDetail, seo.robots.recommendation),
        );
    }

    // Canonical
    if (seo.canonical) {
        container.appendChild(
            makeCheckItem(
                seo.canonical.status === 'good' ? 'good' : 'warn',
                'Canonical',
                seo.canonical.exists ? truncate(seo.canonical.href, 70) : 'Missing',
                seo.canonical.recommendation,
            ),
        );
    }

    // Language
    if (seo.lang) {
        container.appendChild(
            makeCheckItem(
                seo.lang.exists ? 'good' : 'warn',
                'Language',
                `${seo.lang.exists ? `lang="${seo.lang.value}"` : 'No lang attribute'} · ${seo.lang.hreflangCount} hreflang link(s)`,
                seo.lang.recommendation,
            ),
        );
    }

    // Image alt text
    if (seo.images && seo.images.total > 0) {
        container.appendChild(
            makeCheckItem(
                seo.images.optimal ? 'good' : seo.images.ratio > 0.5 ? 'bad' : 'warn',
                'Image Alt Text',
                `${seo.images.total - seo.images.missingAlt}/${seo.images.total} images have alt text`,
                seo.images.recommendation,
            ),
        );
    }
}

// ─── LLM Readability ────────────────────────────────────────────────

function renderLLMReadability(llm) {
    const container = $('#llmChecks');
    container.replaceChildren();

    container.appendChild(
        makeCheckItem(
            llm.llmFriendly ? 'good' : 'warn',
            llm.assessment,
            [
                `Text: ${llm.textContentLength.toLocaleString()} chars`,
                llm.mainContentLength != null ? `Main content: ${llm.mainContentLength.toLocaleString()} chars` : null,
                `Scripts: ${llm.scriptContentLength.toLocaleString()} chars`,
                llm.externalScriptCount ? `External scripts: ${llm.externalScriptCount}` : null,
                `JS/Text ratio: ${llm.jsToTextRatio ?? 'N/A'}`,
                llm.frameworkName ? `Framework: ${llm.frameworkName}` : null,
            ]
                .filter(Boolean)
                .join(' · '),
            llm.recommendation,
        ),
    );
}

// ─── Structured Data ────────────────────────────────────────────────

function renderStructuredData(sd) {
    const container = $('#sdChecks');
    container.replaceChildren();

    // JSON-LD
    let jsonLdDetail = sd.jsonLd.exists
        ? `${sd.jsonLd.count} schema(s)${sd.jsonLd.types.length ? ' — Types: ' + sd.jsonLd.types.join(', ') : ''}`
        : 'Not found';
    const invalidBlocks = sd.jsonLd.errors + (sd.jsonLd.empty || 0);
    if (invalidBlocks > 0) {
        jsonLdDetail += ` (${invalidBlocks} invalid)`;
    }
    const jsonLdValid = sd.jsonLd.validCount ?? sd.jsonLd.count - sd.jsonLd.errors;
    container.appendChild(
        makeCheckItem(jsonLdValid > 0 ? 'good' : 'bad', 'JSON-LD', jsonLdDetail, null),
    );

    // Required schema fields
    if (sd.requiredFields?.checked > 0) {
        const issues = sd.requiredFields.issues;
        container.appendChild(
            makeCheckItem(
                issues.length ? 'warn' : 'good',
                'Schema Fields',
                issues.length
                    ? issues.map((i) => `${i.type}: missing ${i.missing.join(', ')}`).join(' · ')
                    : `${sd.requiredFields.checked} schema(s) complete`,
                null,
            ),
        );
    }

    // Author & date
    if (sd.authorDate) {
        const ad = sd.authorDate;
        container.appendChild(
            makeCheckItem(
                ad.hasAuthor && ad.hasDate ? 'good' : 'warn',
                'Author & Date',
                [
                    `Author: ${ad.author ? truncate(ad.author, 40) : 'not found'}`,
                    `Published: ${ad.datePublished || 'not found'}`,
                    ad.dateModified ? `Modified: ${ad.dateModified}` : null,
                ].filter(Boolean).join(' · '),
                null,
            ),
        );
    }

    // Open Graph
    container.appendChild(
        makeCheckItem(
            sd.openGraph.exists ? 'good' : 'bad',
            'Open Graph',
            `${sd.openGraph.count} tags found`,
            !sd.openGraph.exists ? 'Add OG tags for social sharing.' : null,
        ),
    );

    // Twitter Cards
    container.appendChild(
        makeCheckItem(
            sd.twitterCards.exists ? 'good' : 'warn',
            'Twitter Cards',
            `${sd.twitterCards.count} tags found`,
            !sd.twitterCards.exists ? 'Add Twitter Card tags.' : null,
        ),
    );

    // Overall recommendation
    if (sd.recommendation) {
        const recEl = document.createElement('p');
        recEl.className = 'check-recommendation';
        recEl.style.paddingLeft = '0';
        recEl.textContent = `💡 ${sd.recommendation}`;
        container.appendChild(recEl);
    }
}

// ─── Helpers ────────────────────────────────────────────────────────

function makeCheckItem(status, title, detail, recommendation) {
    const div = document.createElement('div');
    div.className = 'check-item';

    const icon = status === 'good' ? '✓' : status === 'warn' ? '⚠' : '✗';

    const header = document.createElement('div');
    header.className = 'check-header';

    const iconSpan = document.createElement('span');
    iconSpan.className = `status-icon status-${status}`;
    iconSpan.textContent = icon;

    const titleStrong = document.createElement('strong');
    titleStrong.textContent = title;

    header.appendChild(iconSpan);
    header.appendChild(titleStrong);
    div.appendChild(header);

    if (detail) {
        const detailP = document.createElement('p');
        detailP.className = 'check-detail';
        detailP.textContent = detail;
        div.appendChild(detailP);
    }

    if (recommendation) {
        const recP = document.createElement('p');
        recP.className = 'check-recommendation';
        recP.textContent = '💡 ' + recommendation;
        div.appendChild(recP);
    }

    return div;
}

function getScoreColor(score) {
    if (score >= 80) return '#34d399';
    if (score >= 60) return '#fbbf24';
    return '#f87171';
}

export function truncate(str, max) {
    if (!str) return '';
    const clean = str.replace(/\s+/g, ' ').trim();
    return clean.length > max ? clean.slice(0, max) + '…' : clean;
}
