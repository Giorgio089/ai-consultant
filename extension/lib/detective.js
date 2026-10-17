/**
 * Client for the paid clues on datadetective.app.
 *
 * Only the page URL and the rendered text length leave the browser,
 * and only after the user clicks "Call the detective".
 */

export const DEFAULT_API_BASE = 'https://datadetective.app';
export const DATA_COLLECTION = ['browsingActivity'];

/**
 * Firefox 140+ shows its built-in consent prompt for optional data collection.
 * Must be called synchronously inside the click handler (user gesture).
 * Chrome has no such API; the notice next to the button is the disclosure there.
 * @returns {Promise<boolean>}
 */
export function requestDataConsent() {
    const firefox = globalThis.browser;
    if (!firefox?.runtime?.getBrowserInfo || !firefox.permissions?.request) {
        return Promise.resolve(true);
    }
    return firefox.permissions.request({ data_collection: DATA_COLLECTION }).catch(() => false);
}

/**
 * @param {{get: Function}} storage - browser.storage.local
 */
export async function getSettings(storage) {
    const { apiKey = '', apiBase = DEFAULT_API_BASE } = await storage.get(['apiKey', 'apiBase']);
    return { apiKey, apiBase };
}

/**
 * @returns {Promise<{ok: true, data: object} | {ok: false, reason: 'no_key' | 'invalid_key' | 'rate_limited' | 'error', message: string}>}
 */
export async function callBotView({ url, renderedTextLength, apiKey, apiBase = DEFAULT_API_BASE, fetchImpl = fetch }) {
    if (!apiKey) {
        return { ok: false, reason: 'no_key', message: 'Enter your datadetective API key to call the detective.' };
    }

    let res;
    try {
        res = await fetchImpl(`${apiBase}/api/clue/bot-view`, {
            method: 'POST',
            headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
            body: JSON.stringify({ url, rendered: renderedTextLength ? { textLength: renderedTextLength } : undefined }),
        });
    } catch (err) {
        return { ok: false, reason: 'error', message: `Could not reach datadetective.app (${err.message}).` };
    }

    const body = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, data: body };
    if (res.status === 402) return { ok: false, reason: 'no_key', message: body.message || 'An API key is required.' };
    if (res.status === 401) return { ok: false, reason: 'invalid_key', message: 'This API key is not valid.' };
    if (res.status === 429) return { ok: false, reason: 'rate_limited', message: 'Too many requests, try again in a minute.' };
    return { ok: false, reason: 'error', message: body.message || `datadetective.app answered ${res.status}.` };
}

/** Maps API severities onto the popup's status icons. */
export function severityToStatus(severity) {
    return severity === 'critical' ? 'bad' : severity === 'warning' ? 'warn' : 'good';
}
