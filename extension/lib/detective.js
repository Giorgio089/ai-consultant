/**
 * Client for the paid clues on datadetective.app.
 *
 * Only the page URL and the rendered text length leave the browser,
 * and only after the user clicks "Call the detective".
 */

export const DEFAULT_API_BASE = 'https://datadetective.app';
export const DEFAULT_TIMEOUT_MS = 45000;
export const DATA_COLLECTION = ['browsingActivity'];

const TIMEOUT_MESSAGE = 'The detective took too long. Try again.';
const UNEXPECTED_MESSAGE = 'Unexpected answer from datadetective.app.';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

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
 * The API key may only ever travel to the production API or a local dev server.
 * Returns the normalized origin, or DEFAULT_API_BASE for anything else.
 * Allowed: https://datadetective.app, http://localhost:<port>, http://127.0.0.1:<port>.
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeApiBase(value) {
    if (typeof value !== 'string' || !value) return DEFAULT_API_BASE;
    let url;
    try {
        url = new URL(value);
    } catch {
        return DEFAULT_API_BASE;
    }
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') return DEFAULT_API_BASE;
    if (url.protocol === 'https:' && url.hostname === 'datadetective.app' && url.port === '') return url.origin;
    if (url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname) && url.port !== '') return url.origin;
    return DEFAULT_API_BASE;
}

/**
 * @param {{get: Function}} storage - browser.storage.local
 */
export async function getSettings(storage) {
    const { apiKey = '', apiBase } = await storage.get(['apiKey', 'apiBase']);
    return { apiKey: typeof apiKey === 'string' ? apiKey : '', apiBase: normalizeApiBase(apiBase) };
}

function timeoutSignal(ms) {
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
        return AbortSignal.timeout(ms);
    }
    if (typeof AbortController === 'function') {
        const controller = new AbortController();
        setTimeout(() => {
            const reason = typeof DOMException === 'function'
                ? new DOMException('The operation timed out.', 'TimeoutError')
                : Object.assign(new Error('The operation timed out.'), { name: 'TimeoutError' });
            controller.abort(reason);
        }, ms);
        return controller.signal;
    }
    return undefined;
}

function isTimeout(err) {
    return err?.name === 'TimeoutError' || err?.name === 'AbortError';
}

function isBotViewPayload(body) {
    return (
        body !== null
        && typeof body === 'object'
        && !Array.isArray(body)
        && Array.isArray(body.findings)
        && (body.bots === undefined || Array.isArray(body.bots))
    );
}

/**
 * @returns {Promise<{ok: true, data: object} | {ok: false, reason: 'no_key' | 'invalid_key' | 'rate_limited' | 'timeout' | 'error', message: string}>}
 */
export async function callBotView({
    url,
    renderedTextLength,
    apiKey,
    apiBase = DEFAULT_API_BASE,
    fetchImpl = globalThis.fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
    if (!apiKey) {
        return { ok: false, reason: 'no_key', message: 'Enter your datadetective API key to call the detective.' };
    }

    const timedOut = { ok: false, reason: 'timeout', message: TIMEOUT_MESSAGE };
    let res;
    try {
        res = await fetchImpl(`${normalizeApiBase(apiBase)}/api/clue/bot-view`, {
            method: 'POST',
            headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
            body: JSON.stringify({ url, rendered: renderedTextLength ? { textLength: renderedTextLength } : undefined }),
            signal: timeoutSignal(timeoutMs),
        });
    } catch (err) {
        if (isTimeout(err)) return timedOut;
        return { ok: false, reason: 'error', message: `Could not reach datadetective.app (${err?.message ?? err}).` };
    }

    const contentType = String(res.headers?.get?.('content-type') ?? '');
    const isJson = contentType.includes('json');
    let body = null;
    try {
        // Only parse what claims to be JSON; error pages may be HTML.
        if (isJson) body = await res.json();
    } catch (err) {
        if (isTimeout(err)) return timedOut;
        body = null;
    }

    if (res.ok) {
        if (!isJson || !isBotViewPayload(body)) return { ok: false, reason: 'error', message: UNEXPECTED_MESSAGE };
        return { ok: true, data: body };
    }

    const serverMessage = typeof body?.message === 'string' && body.message ? body.message.slice(0, 300) : '';
    if (res.status === 402) return { ok: false, reason: 'no_key', message: serverMessage || 'An API key is required.' };
    if (res.status === 401) return { ok: false, reason: 'invalid_key', message: 'This API key is not valid.' };
    if (res.status === 429) return { ok: false, reason: 'rate_limited', message: 'Too many requests, try again in a minute.' };
    return { ok: false, reason: 'error', message: serverMessage || `datadetective.app answered ${res.status}.` };
}

/** Maps API severities onto the popup's status icons. */
export function severityToStatus(severity) {
    return severity === 'critical' ? 'bad' : severity === 'warning' ? 'warn' : 'good';
}
