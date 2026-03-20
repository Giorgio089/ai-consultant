# 🤖 GEO Page Audit

> *Because "my page is probably fine for AI crawlers" is not an SEO strategy.*

A lightweight, no-nonsense browser extension that instantly audits any webpage for **GEO** (Generative Engine Optimization), **SEO basics**, **LLM readability**, and **structured data** — directly in your browser, no account required, no data leaving your machine.

Available for **Chrome** and **Firefox**. Install once, audit everything.

---

## 📦 Install

| Browser | Link |
|---------|------|
| 🦊 **Firefox** | [addons.mozilla.org/addon/geo-page-audit](https://addons.mozilla.org/addon/geo-page-audit/) |
| 🌐 **Chrome** | Chrome Web Store *(coming soon)* |

Or load it manually — see [Development Setup](#development--manual-load) below.

---

## ✨ What It Checks

### 🔍 Basic SEO
- Title tag & meta description length (is it too short? too long? just right?)
- H1 and H2 heading structure — because "Welcome to Our Website" as your only H1 is not it

### 🧠 LLM Readability
- Text-to-code ratio estimation
- Detects JS-heavy frameworks (React, Vue, Angular) that AI crawlers tend to struggle with
- Helps you gauge how accessible your content actually is to LLM-based search engines

### 🗂️ Structured Data
- Validates JSON-LD schema markup
- Checks for Open Graph & Twitter/X Cards
- Flags missing or broken structured data that could hurt your AI visibility

---

## 🚀 Usage

1. Navigate to any webpage
2. Click the **🤖** extension icon in your toolbar
3. Hit **Analyze This Page**
4. Get an instant breakdown with actionable suggestions
5. Use **Copy JSON** to export the results for further analysis or reporting

That's it. No login. No tracking. No "upgrade to Pro for full results."

---

## 🔒 Permissions

The extension requests the absolute minimum:

- **`activeTab`** — temporary access only to the tab you explicitly choose to analyze
- **`scripting`** — reads the already-rendered DOM of the active page

No background snooping. No persistent host permissions. No analytics phoning home.

---

## 🛠️ Development & Manual Load

### Chrome

1. Clone this repository
2. Open `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select the `extension/` folder

### Firefox

1. Run `node scripts/package-extension.mjs --browser=firefox`
2. Open `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on**
4. Select `dist/firefox/manifest.json`

> The Firefox build adds a stable Gecko ID, `browser_specific_settings.gecko.data_collection_permissions`, and intentionally omits `host_permissions` to comply with AMO requirements.

---

## 📁 Project Structure

```
geo-llmo-audit-chrome-ext/
├── extension/
│   ├── audit/
│   │   └── runAudit.js          — Core scraping, DOM analysis & scoring logic
│   ├── popup.html / popup.js    — Extension UI
│   ├── popup.css                — Styles
│   ├── background.js            — Service worker
│   ├── manifest.json            — Cross-browser dev manifest
│   ├── manifest.chrome.json     — Chrome release manifest
│   └── manifest.firefox.json    — Firefox release manifest
├── scripts/
│   └── package-extension.mjs   — Build script for browser-specific packaging
├── dist/                        — Generated release folders (gitignored)
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
# Generate browser-specific dist folders
node scripts/package-extension.mjs --browser=chrome
node scripts/package-extension.mjs --browser=firefox
```

This produces:
- `dist/chrome/` — ready for Chrome Web Store submission
- `dist/firefox/` — ready for AMO submission (review notes in `docs/release/firefox-amo.md`)

---

## 🧪 Tests

```bash
npm test
```

Unit tests cover scoring logic, structured data detection, basic SEO checks, and DOM parsing.

---

## 🗺️ Roadmap

- [x] Basic SEO checks (title, meta, headings)
- [x] LLM readability analysis
- [x] Structured data detection (JSON-LD, OG, Twitter Cards)
- [x] JSON export
- [x] Firefox / AMO support
- [ ] Chrome Web Store listing
- [ ] Score history / comparison across page versions
- [ ] More GEO-specific checks (FAQ schema, citation signals, etc.)

---

## 🤝 Contributing

PRs welcome. If you find a GEO signal worth checking that isn't covered yet — open an issue or just send the PR. The audit logic lives in `extension/audit/runAudit.js` and is deliberately self-contained and easy to extend.

---

## 📄 License

MIT — use it, fork it, build on it.

---

*Current version: `0.1.2`*
