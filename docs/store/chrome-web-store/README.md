# Chrome Web Store assets: GEO Page Audit

Listing copy and graphics for the Chrome Web Store submission of GEO Page Audit (0.2.0).

## Files

| File | Purpose |
|---|---|
| `listing.md` | Name, summary, detailed description (EN + DE), category, single purpose, permission justifications, remote code, data usage disclosures, privacy policy notes, paid feature disclosure, screenshot captions |
| `assets/screenshot-1.png` | 1280x800 · Score overview: "What do AI crawlers see on this page?" |
| `assets/screenshot-2.png` | 1280x800 · Exhibit A: Basic SEO with robots, canonical, lang/hreflang |
| `assets/screenshot-3.png` | 1280x800 · Exhibit B: LLM readability, empty app shell (Next.js) |
| `assets/screenshot-4.png` | 1280x800 · Exhibit C: structured data, schema fields, author and dates |
| `assets/screenshot-5.png` | 1280x800 · Bot-View clue: GPTBot disallowed, ClaudeBot 403 |
| `assets/promo-small-440x280.png` | Small promo tile |
| `assets/promo-marquee-1400x560.png` | Marquee promo tile |
| `generate.cjs` | Generator for all images above |

All PNGs are 24-bit RGB without an alpha channel, as the store requires. The store icon is
`extension/icons/icon-128.png`.

## How the images are made

`generate.cjs` starts a local HTTP server and renders each slide in headless Chromium (Playwright):

- The popup is the **real** `extension/popup.html` in an iframe (scaled 1.08x, 380x600 CSS px like in
  Chrome), with `chrome.tabs`, `chrome.scripting`, `chrome.storage` and `fetch` mocked. The script clicks
  "Investigate this page" (and "Call the detective" for slide 5), then opens/collapses sections and scrolls.
- The audited pages and the browser window behind the popup show a **fictional** site,
  "Northwind Coffee Roasters" (`northwind-coffee.example`). The Bot-View response is sample data in
  `BOT_VIEW` and uses the field names `renderBotView()` in `extension/popup.js` expects.
- Headlines, sublines and bullets per slide live in `SLIDES`; the sample pages in `SCENARIOS`.
  Never list more than two product, bot or framework names in a row in slide copy: the Chrome Web
  Store rejected an earlier version for keyword spam. Write "AI crawlers like GPTBot" or
  "JavaScript frameworks" instead.
- The slide geometry lives in `CHROME_LAYOUT`. The module exports its building blocks, and
  `docs/store/firefox-amo/generate.cjs` reuses them with a 4:3 layout and a Firefox-style frame, so
  copy changes here also apply to the AMO screenshots (regenerate both).
- After rendering, Pillow flattens every PNG to RGB.

Because the popup is rendered live, the screenshots pick up any UI change in `extension/` when you
regenerate them.

## Regenerate

From the repository root:

```bash
node docs/store/chrome-web-store/generate.cjs
```

Requirements: Node 18+, Playwright with Chromium, Python 3 with Pillow.

```bash
# if Playwright is not installed globally
npm i --no-save playwright && npx playwright install chromium
pip install pillow
```

Optional environment variables: `PLAYWRIGHT_MODULE` (path to the playwright package) and
`CHROME_PATH` (Chromium executable).

Verify the output:

```bash
python3 -c "from PIL import Image; import glob; [print(f, Image.open(f).size, Image.open(f).mode) for f in sorted(glob.glob('docs/store/chrome-web-store/assets/*.png'))]"
```

Every file must report mode `RGB`.

Fonts: the slides use the website's serif stack (`Iowan Old Style`, `Palatino`, `Georgia`) with
`Caladea` as a Linux fallback. Rendering on another OS may change the typeface slightly; check the
images visually before uploading.
