# Firefox Add-ons (AMO) assets: GEO Page Audit

Screenshots and icon for the addons.mozilla.org listing of GEO Page Audit (0.2.0).

## Files

| File | Purpose |
|---|---|
| `assets/screenshot-1.png` | 2400x1800 · Score overview |
| `assets/screenshot-2.png` | 2400x1800 · Exhibit A: Basic SEO |
| `assets/screenshot-3.png` | 2400x1800 · Exhibit B: LLM readability, empty app shell |
| `assets/screenshot-4.png` | 2400x1800 · Exhibit C: structured data |
| `assets/screenshot-5.png` | 2400x1800 · The Bot-View clue |
| `assets/icon-512.png` | 512x512 add-on icon (upload this one; AMO scales it to 128) |
| `assets/icon-128.png` | 128x128 add-on icon |
| `generate.cjs` | Generator for all images above |

Screenshots are PNG, 24-bit RGB, 4:3 at AMO's maximum and recommended size of 2400x1800 px.
The icons are rendered from `extension/icons/logo.svg` and keep a transparent background outside
the rounded corners.

## Captions

1. What do AI crawlers see on this page? One click scores the page out of 100, right in your browser.
2. Exhibit A, Basic SEO: title, description and headings, plus meta robots, canonical and language.
3. Exhibit B, LLM readability: spots pages that stay empty until JavaScript runs.
4. Exhibit C, structured data: schema types, key fields, author and dates at a glance.
5. The Bot-View clue (optional): checks whether AI crawlers like GPTBot can reach the page.

Keep captions and slide copy free of name lists: never more than two product, bot or framework
names in a row (the Chrome Web Store rejected a listing for this as keyword spam).

## How the images are made

`generate.cjs` reuses the Chrome Web Store generator (`../chrome-web-store/generate.cjs`): same slide
copy (`SLIDES`), same fictional sample site "Northwind Coffee Roasters", and the real
`extension/popup.html` in an iframe with the extension APIs and `fetch` mocked. Only the layout
differs (`AMO_LAYOUT`):

- 1200x900 CSS px rendered at deviceScaleFactor 2, giving 2400x1800.
- A generic Firefox-style browser frame (floating rounded tab, back/forward/reload, URL bar, menu
  button), without any Mozilla logos.
- The popup may grow to 690 CSS px (Chrome: 600) and shrinks to its content, so the slides show the
  footer and all Bot-View rows that the Chrome screenshots cut off.

## Regenerate

From the repository root:

```bash
node docs/store/firefox-amo/generate.cjs
```

Requirements are the same as for the Chrome generator: Node 18+, Playwright with Chromium, Python 3
with Pillow (see `../chrome-web-store/README.md`). Optional environment variables:
`PLAYWRIGHT_MODULE`, `CHROME_PATH`.

Verify the output:

```bash
python3 -c "from PIL import Image; import glob; [print(f, Image.open(f).size, Image.open(f).mode) for f in sorted(glob.glob('docs/store/firefox-amo/assets/*.png'))]"
```

Screenshots must report `(2400, 1800) RGB`; the icons report `RGBA`.
