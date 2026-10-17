# 🤖 GEO Page Audit

> *Because "my page is probably fine for AI crawlers" is not an SEO strategy.*

A lightweight, no-nonsense browser extension that instantly audits any webpage for **GEO** (Generative Engine Optimization), **SEO basics**, **LLM readability**, and **structured data** — directly in your browser, no account required. The page audit runs locally; nothing leaves your machine unless you call the detective.

Want to know what AI crawlers actually get? The optional **AI Crawler Check** asks [datadetective.app](https://datadetective.app), but only when you click it.

Available for **Chrome** and **Firefox**. Install once, audit everything.

---

## 📦 Install

| Browser | Link |
|---------|------|
| 🦊 **Firefox** (desktop 140+, Android 142+) | [addons.mozilla.org/addon/geo-page-audit](https://addons.mozilla.org/addon/geo-page-audit/) |
| 🌐 **Chrome** | Chrome Web Store *(coming soon)* |

Or load it manually — see [Development Setup](#development--manual-load) below.

---

## ✨ What It Checks

### 🔍 Basic SEO
- Title tag & meta description length (is it too short? too long? just right?)
- H1 and H2 heading structure, plus skipped heading levels — because "Welcome to Our Website" as your only H1 is not it
- Meta robots: `noindex`, `nosnippet` and tiny `max-snippet` values keep you out of AI answers
- Canonical URL, `<html lang>` and hreflang
- Images without alt text

### 🧠 LLM Readability
- Visible text vs. inline JavaScript (scripts, styles and JSON-LD don't count as text)
- Main content length (`<main>` / `<article>`) and thin-content warning
- Flags empty app shells and names the framework (Next.js, Nuxt, React, Vue, Angular, …)
- What AI crawlers get *without* JavaScript is what the AI Crawler Check measures

### 🗂️ Structured Data
- Parses JSON-LD (incl. `@graph` and top-level arrays); only valid blocks earn points
- Checks key fields for common types (Article, Organization, Product, FAQPage)
- Author and publish/modified date signals
- Open Graph & Twitter/X Cards

### 🕵️ AI Crawler Check (optional, via datadetective.app)
- robots.txt rules per AI crawler (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, CCBot, Google-Extended)
- Server response per crawler: is your WAF or bot protection blocking them?
- How much of the text you see is in the raw HTML, i.e. visible without JavaScript
- Needs a datadetective API key (5 ct per check)

---

## 🚀 Usage

1. Navigate to any webpage
2. Click the **Data Detective** (magnifying glass) icon in your toolbar
3. Hit **Investigate this page**
4. Get an instant breakdown with actionable suggestions
5. Optional: **Call the detective** to see what AI crawlers get (needs an API key)
6. Use **Copy case file (JSON)** to export the results for further analysis or reporting

That's it. No login. No tracking. No "upgrade to Pro for full results." The free audit stays complete; the AI Crawler Check is a separate, optional extra.

---

## 🔒 Permissions

The extension requests the absolute minimum:

- **`activeTab`** — temporary access only to the tab you explicitly choose to analyze
- **`scripting`** — reads the already-rendered DOM of the active page
- **`storage`** — remembers your datadetective API key, locally

No background snooping. No persistent host permissions. No analytics phoning home.

### What leaves your browser

The page audit runs entirely locally. Only when you click **Call the detective**, the extension sends
**the page URL and the length of its visible text** (a number, not the text) to `datadetective.app`,
together with your API key. Nothing else, never in the background. In Firefox this is declared as optional
`browsingActivity` data collection, and Firefox asks for your consent on first use.

---

## 🛠️ Development & Manual Load

### Chrome

1. Clone this repository and run `npm run build:chrome`
2. Open `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select the `dist/chrome/` folder

### Firefox

1. Run `npm run build:firefox`
2. Open `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on**
4. Select `dist/firefox/manifest.json`

> The Firefox build adds a stable Gecko ID, `browser_specific_settings.gecko.data_collection_permissions`, and intentionally omits `host_permissions` to comply with AMO requirements.

---

## 📁 Project Structure

```
ai-consultant/
├── extension/
│   ├── audit/
│   │   ├── runAudit.js          — DOM analysis & scoring (also copied into the datadetective.app worker)
│   │   └── schema.js            — Result types and SCHEMA_VERSION
│   ├── lib/
│   │   ├── browserApi.js        — chrome/browser shim
│   │   └── detective.js         — Client for the datadetective.app clues
│   ├── icons/                   — Toolbar icons and logo.svg
│   ├── popup.html / popup.js    — Extension UI
│   ├── popup.css                — Styles (datadetective.app look)
│   ├── manifest.json            — Dev manifest (mirrors the Firefox one)
│   ├── manifest.chrome.json     — Chrome release manifest
│   └── manifest.firefox.json    — Firefox release manifest
├── scripts/
│   └── package-extension.mjs   — Build script for browser-specific packaging
├── dist/                        — Generated release folders and zips (gitignored)
│   ├── chrome/
│   └── firefox/
├── docs/
│   └── release/
│       └── firefox-amo.md       — AMO submission notes
└── tests/                       — Unit tests
```

---

## 📦 Packaging a Release

```bash
npm run build:chrome     # dist/chrome/ + dist/geo-page-audit-<version>-chrome.zip
npm run build:firefox    # dist/firefox/ + dist/geo-page-audit-<version>-firefox.zip
npm run lint:firefox     # web-ext lint on the Firefox build
```

- `dist/chrome/` and its zip — ready for Chrome Web Store submission
- `dist/firefox/` and its zip — ready for AMO submission (review notes in `docs/release/firefox-amo.md`)

The script refuses to build if the three manifests disagree on the version.

---

## 🧪 Tests

```bash
npm test
```

Unit tests cover scoring, every check, the detective client (timeouts, bad answers, key allowlist), the popup (jsdom) and packaging. One test runs the engine under linkedom, the DOM the datadetective.app worker uses.

---

## 🗺️ Roadmap

- [x] Basic SEO checks (title, meta, headings)
- [x] LLM readability analysis
- [x] Structured data detection (JSON-LD, OG, Twitter Cards)
- [x] JSON export
- [x] Firefox / AMO support
- [ ] Chrome Web Store listing
- [ ] Score history / comparison across page versions
- [x] AI crawler check via datadetective.app (opt-in)
- [x] GEO signals: meta robots, canonical, lang, author/date, schema key fields
- [ ] Rendered-vs-raw diff and on-page overlay

---

## 🤝 Contributing

PRs welcome. If you find a GEO signal worth checking that isn't covered yet — open an issue or just send the PR. The audit logic lives in `extension/audit/runAudit.js` and is deliberately self-contained and easy to extend.

---

## 📄 License

MIT — use it, fork it, build on it.

---

*Current version: `0.2.0`*
