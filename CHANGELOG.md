# Changelog

## 0.2.0 — 2026-10-18

### Added
- **AI Crawler Check** (opt-in, paid clue via [datadetective.app](https://datadetective.app)): robots.txt and server response per AI crawler, share of rendered text in the raw HTML. Sends only the page URL and the rendered text length, after a click.
- Firefox: optional `browsingActivity` data collection with Firefox's own consent prompt (Firefox 140+).
- Firefox for Android support (142+).
- New checks: meta robots (`noindex`, `nosnippet`, `max-snippet`), canonical, `<html lang>` and hreflang, skipped heading levels, image alt text, author and date signals, key fields for Article, Organization, Product and FAQPage.
- Readability: main content length, thin-content and empty-app-shell detection, specific framework names (Next.js, Nuxt, React, Vue, Angular, …).
- `npm run build:chrome|build:firefox` write versioned store zips; `npm run lint:firefox`.

### Changed
- New look matching datadetective.app (noir/amber), new icons.
- Score weights: Basic SEO 45, LLM readability 30, structured data 25 (result schema 0.2). Scores of existing pages change.
- Chrome no longer requests `<all_urls>`; the extension uses `activeTab`, `scripting` and `storage` only.

### Fixed
- JSON-LD no longer counts as JavaScript; invalid JSON-LD no longer earns points; top-level JSON-LD arrays are read.
- Visible text excludes script, style, noscript and template content.
- An SVG `<title>` in the body is no longer taken as the page title; title and description lengths are trimmed.
- Detective call: 45 s timeout, clear errors for unexpected answers, no double charge on double click, API key only sent to datadetective.app or localhost.

### Removed
- Empty background script.

## 0.1.2 — 2026-03-16
- Firefox release on AMO.

## 0.1.1 — 2026-03-13
- Chrome release preparation, Firefox packaging.

## 0.1.0
- First version: Basic SEO, LLM readability and structured data audit with JSON export.
