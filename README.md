# GEO Page Audit Chrome Extension

A lightweight, no-nonsense Chrome extension to instantly audit any webpage for GEO, basic SEO, LLM readability, and structured data. See possible optimizations to improve the site's GEO (Generative Engine Optimization) visibility.

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
You can find and install the extension via the Chrome Web Store (Link coming soon).

## Installation (for Development / Manual Load)

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked**.
5. Select the `extension` folder in this repository.

## Usage

1. Click on the extension icon (`🤖`) while on any web page.
2. Click **Analyze This Page**.
3. View the detailed audit breakdown and suggestions.
4. Use **Copy JSON** to extract the data for further sharing or analysis.

## Permissions

The extension uses the smallest permission set needed for its current behavior:

- `activeTab`: grants temporary access only to the tab the user explicitly chooses to analyze.
- `scripting`: reads the already rendered DOM of the active page so the audit can analyze live content.

The extension does not request persistent host permissions and does not run site analysis in the background.

## Development

The entire logic is self-contained using Manifest V3 and requires no build step.
Edit files inside the `extension` folder and click the reload icon on the Extensions page to update.

- **`manifest.json`**: Permissions and metadata.
- **`popup.html/js`**: UI rendering and button logic.
- **`audit/runAudit.js`**: Core HTML scraping, DOM checking, and scoring logic.

Current extension version: `0.1.1`

## License

MIT License
