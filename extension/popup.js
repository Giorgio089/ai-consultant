/**
 * GEO Page Audit — Popup UI Controller
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

const ANALYZE_LABEL = 'Investigate this page';
const REANALYZE_LABEL = 'Investigate again';
const COPY_LABEL = 'Copy case file (JSON)';

let lastResult = null;
let lastTextLength = null;
let analyzing = false;
let detectiveBusy = false;
const browserApi = getBrowserApi();

// ─── Analyze ────────────────────────────────────────────────────────

analyzeBtn.addEventListener('click', async () => {
    // Synchronous lock: no second run while one (or a paid detective call) is in flight.
    if (analyzing || detectiveBusy) return;
    analyzing = true;
    analyzeBtn.disabled = true;
    try {
        await analyze();
    } finally {
        analyzing = false;
        analyzeBtn.disabled = detectiveBusy;
    }
});

async function analyze() {
    // Get current tab
    const [tab] = await browserApi.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab?.url) {
        showError('Could not get the current tab URL.');
        return;
    }

    const url = tab.url;

    // Validate URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        showError('Only http:// and https:// pages can be investigated.');
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

        // Keep the button around so the page can be re-examined after it changes.
        analyzeBtn.textContent = REANALYZE_LABEL;
        statusEl.classList.remove('hidden');
    } catch (err) {
        loadingEl.classList.add('hidden');
        showError(`Investigation failed: ${err.message}`);
    }
}

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
        console.warn('Script injection failed:', err.message);
        throw new Error(
            `Could not read this page. ${err.message}. Try refreshing the page and investigating again.`
        );
    }
}

// ─── Copy JSON ──────────────────────────────────────────────────────

copyJsonBtn.addEventListener('click', async () => {
    if (!lastResult) return;

    try {
        await navigator.clipboard.writeText(JSON.stringify(lastResult, null, 2));
        copyJsonBtn.textContent = 'Copied.';
        copyJsonBtn.classList.add('copied');
        setTimeout(() => {
            copyJsonBtn.textContent = COPY_LABEL;
            copyJsonBtn.classList.remove('copied');
        }, 2000);
    } catch (err) {
        copyJsonBtn.textContent = 'Copy failed.';
        setTimeout(() => {
            copyJsonBtn.textContent = COPY_LABEL;
        }, 2000);
    }
});

// ─── Detective ──────────────────────────────────────────────────────

detectiveBtn.addEventListener('click', () => {
    // Synchronous busy-lock before any await: a double click must never trigger two paid calls.
    if (detectiveBusy || analyzing || !lastResult) return;
    detectiveBusy = true;
    detectiveBtn.disabled = true;
    analyzeBtn.disabled = true;
    // runDetective asks for consent before its first await, i.e. still inside the user gesture.
    runDetective(lastResult);
});

async function runDetective(target) {
    try {
        // Consent first: Firefox only shows its prompt while the click is still being handled.
        const consent = requestDataConsent();
        if (!(await consent)) {
            showDetectiveError('No problem: without your consent the URL stays in your browser.');
            return;
        }

        const { apiKey, apiBase } = await getSettings(browserApi.storage.local);
        detectiveErrorEl.classList.add('hidden');
        detectiveResultsEl.replaceChildren();
        detectiveLoadingEl.classList.remove('hidden');

        const outcome = await callBotView({
            url: target.url,
            renderedTextLength: lastTextLength,
            apiKey,
            apiBase,
        });

        if (!outcome?.ok) {
            showDetectiveError(outcome?.message || 'The detective came back empty-handed.');
            if (outcome?.reason === 'no_key' || outcome?.reason === 'invalid_key') keyRowEl.classList.remove('hidden');
            return;
        }
        target.botView = outcome.data;
        forgetKeyBtn.classList.remove('hidden');
        renderBotView(outcome.data);
    } catch (err) {
        showDetectiveError(`Something went wrong: ${err?.message ?? err}`);
    } finally {
        detectiveLoadingEl.classList.add('hidden');
        detectiveBusy = false;
        detectiveBtn.disabled = false;
        analyzeBtn.disabled = analyzing;
    }
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
    }).catch(() => {});
}

function showDetectiveError(message) {
    detectiveErrorEl.textContent = message;
    detectiveErrorEl.classList.remove('hidden');
}

export function renderBotView(data) {
    detectiveResultsEl.replaceChildren();

    const findings = Array.isArray(data?.findings) ? data.findings : [];
    const bots = Array.isArray(data?.bots) ? data.bots : [];

    for (const finding of findings) {
        const severity = typeof finding?.severity === 'string' && finding.severity ? finding.severity : 'note';
        detectiveResultsEl.appendChild(
            makeCheckItem(severityToStatus(severity), capitalize(severity), finding?.message ?? '', null),
        );
    }
    if (findings.length === 0) {
        detectiveResultsEl.appendChild(
            makeCheckItem('good', 'Nothing suspicious', 'AI crawlers get the same content you see.', null),
        );
    }

    const ratio = data?.rawVisibilityRatio;
    if (typeof ratio === 'number' && Number.isFinite(ratio)) {
        detectiveResultsEl.appendChild(
            makeCheckItem(
                ratio >= 0.7 ? 'good' : ratio >= 0.3 ? 'warn' : 'bad',
                'Visible without JavaScript',
                `${Math.round(ratio * 100)} % of the rendered text is in the raw HTML`,
                null,
            ),
        );
    }

    for (const bot of bots) {
        const fetchInfo = bot?.fetch ?? {};
        const robots = bot?.robots ?? {};
        const allowed = typeof robots.allowed === 'boolean' ? robots.allowed : null;
        const chars = typeof fetchInfo.textLength === 'number' ? `${fetchInfo.textLength.toLocaleString()} chars` : 'length unknown';
        const fetchText = !fetchInfo.tested
            ? 'robots.txt token only'
            : fetchInfo.error
                ? `fetch failed: ${fetchInfo.error}`
                : `HTTP ${fetchInfo.status ?? '?'}${fetchInfo.blocked ? ' (blocked)' : ''} · ${chars}`;
        const robotsText = allowed === null
            ? 'unknown'
            : allowed ? 'allowed' : `disallowed${robots.rule ? ` (${robots.rule})` : ''}`;
        const status = allowed === false || fetchInfo.blocked
            ? 'bad'
            : allowed === null ? 'warn' : 'good';
        const label = [bot?.token ?? 'Unknown bot', [bot?.operator, bot?.purpose].filter(Boolean).join(', ')]
            .filter(Boolean)
            .join(' · ');
        detectiveResultsEl.appendChild(
            makeCheckItem(status, label, `robots.txt ${robotsText} · ${fetchText}`, null),
        );
    }

    if (typeof data?.caveat === 'string' && data.caveat) {
        const caveat = document.createElement('p');
        caveat.className = 'check-detail detective-note';
        caveat.textContent = data.caveat;
        detectiveResultsEl.appendChild(caveat);
    }
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Error Display ──────────────────────────────────────────────────

function showError(message) {
    loadingEl.classList.add('hidden');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    statusEl.classList.remove('hidden');
}

// ─── Render Results ─────────────────────────────────────────────────

const SCORE_CLASSES = ['score-good', 'score-warn', 'score-bad'];

function renderResults(data) {
    resultsEl.classList.remove('hidden');

    // Score
    const total = data.score.total;
    const color = getScoreColor(total);
    const scoreClass = getScoreClass(total);

    for (const el of [$('#scoreCircle'), $('#scoreValue')]) {
        el.classList.remove(...SCORE_CLASSES);
        el.classList.add(scoreClass);
    }
    $('#scoreCircle').style.borderColor = color;
    $('#scoreValue').textContent = total;
    $('#scoreValue').style.color = color;
    $('#scoreLabel').textContent = getScoreLabel(total);

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
                `Scripts: ${llm.scriptContentLength.toLocaleString()} chars`,
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
    if (sd.jsonLd.errors > 0) {
        jsonLdDetail += ` (${sd.jsonLd.errors} invalid)`;
    }
    container.appendChild(
        makeCheckItem(sd.jsonLd.exists ? 'good' : 'bad', 'JSON-LD', jsonLdDetail, null),
    );

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
        recEl.textContent = `→ ${sd.recommendation}`;
        container.appendChild(recEl);
    }
}

// ─── Helpers ────────────────────────────────────────────────────────

function makeCheckItem(status, title, detail, recommendation) {
    const div = document.createElement('div');
    div.className = 'check-item';

    const icon = status === 'good' ? '✓' : status === 'warn' ? '!' : '✗';

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
        recP.textContent = '→ ' + recommendation;
        div.appendChild(recP);
    }

    return div;
}

export function getScoreColor(score) {
    if (score >= 80) return '#7fcf9a';
    if (score >= 60) return '#e8b44c';
    return '#ef7d6d';
}

export function getScoreClass(score) {
    if (score >= 80) return 'score-good';
    if (score >= 60) return 'score-warn';
    return 'score-bad';
}

export function getScoreLabel(score) {
    if (score >= 80) return 'Case closed. Clean.';
    if (score >= 60) return 'A few loose ends.';
    return "Something's off here.";
}

export function truncate(str, max) {
    if (!str) return '';
    const clean = str.replace(/\s+/g, ' ').trim();
    return clean.length > max ? clean.slice(0, max) + '…' : clean;
}
