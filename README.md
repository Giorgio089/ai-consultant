# GEO Page Audit Browser Extension

A lightweight, no-nonsense browser extension to instantly audit any webpage for GEO, basic SEO, LLM readability, and structured data. See possible optimizations to improve the site's GEO (Generative Engine Optimization) visibility.

## Features

✅ **Basic SEO Checks**
- Title tag and Meta description length optimization
- H1 and H2 heading structure layout

✅ **LLM Readability Analysis**
- Text-to-code ratio estimation
- Flags JS-heavy sites (React, Vue, Angular detection)
- Helps gauge AI crawler accessibility

✅ **Structured Data Detection**
- Validates JSON-LD schema markup
- Checks for Open Graph & Twitter Cards

## Installation (from Chrome Web Store)
You can find and install the extension via the Chrome Web Store (link coming soon).

## Installation (for Development / Manual Load)

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked**.
5. Select the `extension` folder in this repository.

## Firefox Development Load

1. Run `node scripts/package-extension.mjs --browser=firefox`.
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on**.
4. Select `/dist/firefox/manifest.json` from this repository.

The Firefox manifest keeps the same runtime code, adds a stable `browser_specific_settings.gecko.id`, and intentionally omits `host_permissions`.

## Usage

1. Click on the extension icon (`🤖`) while on any web page.
2. Click **Analyze This Page**.
3. View the detailed audit breakdown and suggestions.
4. Use **Copy JSON** to extract the data for further sharing or analysis.

## Development

The shared runtime logic is self-contained using Manifest V3 and requires no build step during local development.
Edit files inside the `extension` folder and reload the extension in Chrome or Firefox to update.

- **`manifest.json`**: Chrome-default manifest for unpacked local development.
- **`manifest.chrome.json` / `manifest.firefox.json`**: Browser-specific release manifests.
- **`popup.html/js`**: UI rendering and button logic.
- **`audit/runAudit.js`**: Core HTML scraping, DOM checking, and scoring logic.

## Packaging

Create browser-specific release folders with:

```bash
node scripts/package-extension.mjs --browser=chrome
node scripts/package-extension.mjs --browser=firefox
```

This generates:

- `dist/chrome/manifest.json`
- `dist/firefox/manifest.json`

## Mozilla Add-ons (AMO)

Firefox releases should be packaged from `dist/firefox/` and reviewed against the AMO notes in [`docs/release/firefox-amo.md`](docs/release/firefox-amo.md).
The Firefox package includes a Gecko ID and `data_collection_permissions`, while `host_permissions` is intentionally left out of the Firefox manifest.

## License

MIT License
