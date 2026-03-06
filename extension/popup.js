/**
 * AI SEO Consultant — Popup UI Controller
 *
 * Handles button clicks, fetches HTML, runs audit,
 * and renders results. All logic runs in the popup
 * because DOMParser is not available in MV3 service workers.
 */

import { runAudit } from './audit/runAudit.js';

// ─── DOM Elements ───────────────────────────────────────────────────

const $ = (sel) => document.querySelector(sel);
const analyzeBtn = $('#analyzeBtn');
const loadingEl = $('#loading');
const errorEl = $('#error');
const resultsEl = $('#results');
const statusEl = $('#status');
const copyJsonBtn = $('#copyJsonBtn');

let lastResult = null;

// ─── Analyze ────────────────────────────────────────────────────────

analyzeBtn.addEventListener('click', async () => {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
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
        const html = await getTabHTML(tab.id);

        // Parse HTML in the popup context
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Run audit
        const result = runAudit(html, doc, url);

        loadingEl.classList.add('hidden');
        lastResult = result;
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
        const results = await chrome.scripting.executeScript({
            target: { tabId },
            func: () => document.documentElement.outerHTML,
        });

        if (results && results[0] && results[0].result) {
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
    container.innerHTML = '';

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
    container.innerHTML = '';

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
    container.innerHTML = '';

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
        recEl.textContent = `💡 ${sd.recommendation}`;
        container.appendChild(recEl);
    }
}

// ─── Helpers ────────────────────────────────────────────────────────

function makeCheckItem(status, title, detail, recommendation) {
    const div = document.createElement('div');
    div.className = 'check-item';

    const icon = status === 'good' ? '✓' : status === 'warn' ? '⚠' : '✗';

    div.innerHTML = `
    <div class="check-header">
      <span class="status-icon status-${status}">${icon}</span>
      <strong>${title}</strong>
    </div>
    ${detail ? `<p class="check-detail">${escapeHtml(detail)}</p>` : ''}
    ${recommendation ? `<p class="check-recommendation">💡 ${escapeHtml(recommendation)}</p>` : ''}
  `;

    return div;
}

function getScoreColor(score) {
    if (score >= 80) return '#34d399';
    if (score >= 60) return '#fbbf24';
    return '#f87171';
}

function truncate(str, max) {
    if (!str) return '';
    const clean = str.replace(/\s+/g, ' ').trim();
    return clean.length > max ? clean.slice(0, max) + '…' : clean;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
