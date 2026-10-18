#!/usr/bin/env node
/**
 * Generates the Firefox Add-ons (AMO) assets for GEO Page Audit:
 *   assets/screenshot-1..5.png  (2400x1800, 4:3, RGB)
 *   assets/icon-512.png, assets/icon-128.png  (from extension/icons/logo.svg, transparent corners)
 *
 * Reuses the slide builder of the Chrome Web Store generator (same copy, same
 * sample site, real popup with mocked APIs) with a 4:3 layout and a
 * Firefox-style browser frame. Rendered at 1200x900 CSS px, deviceScaleFactor 2.
 *
 * Usage (from repo root):
 *   node docs/store/firefox-amo/generate.cjs
 * Env: PLAYWRIGHT_MODULE, CHROME_PATH (see the Chrome generator).
 */
const path = require('path');
const { CHROME_LAYOUT, LOGO, slideJobs, render, flattenRgb } = require('../chrome-web-store/generate.cjs');

const OUT = path.join(__dirname, 'assets');

const AMO_LAYOUT = {
    ...CHROME_LAYOUT,
    width: 1200, height: 900, scale: 2,
    frame: 'firefox',
    copy: { left: 64, width: 440 },
    // The window ends at the right edge of the slide, so the toolbar's menu button stays visible.
    browser: { left: 548, top: 36, width: 652 },
    // 4:3 leaves more vertical room than Chrome's 16:10, so the popup may grow to 690 px and shows more
    // of its content. fit: shrink it to the content below the scroll position, as a real popup does.
    // caretRight centres the caret under the extension button of the Firefox frame.
    popup: { right: 36, top: 130, height: 690, zoom: 1.08, caretRight: 52, caretTop: 122, fit: true },
};

const iconHtml = (size) => `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0}html,body{background:transparent;width:${size}px;height:${size}px;overflow:hidden}
svg{width:${size}px;height:${size}px;display:block}</style></head><body>${LOGO}</body></html>`;

(async () => {
    const shots = await render(slideJobs(AMO_LAYOUT), OUT);
    flattenRgb(shots);
    const icons = await render([512, 128].map((size) => ({
        file: `icon-${size}.png`, html: iconHtml(size), width: size, height: size, transparent: true,
    })), OUT);
    icons.forEach((f) => console.log(f));
})().catch((e) => { console.error(e); process.exit(1); });
