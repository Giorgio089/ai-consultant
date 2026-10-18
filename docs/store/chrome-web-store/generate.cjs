#!/usr/bin/env node
/**
 * Generates the Chrome Web Store assets for GEO Page Audit:
 *   assets/screenshot-1..5.png  (1280x800)
 *   assets/promo-small-440x280.png
 *   assets/promo-marquee-1400x560.png
 *
 * The popup in every screenshot is the real extension/popup.html, served over
 * local HTTP inside an <iframe>, with chrome.* and fetch mocked. The sample site
 * ("Northwind Coffee Roasters", northwind-coffee.example) is fictional.
 *
 * All PNGs are flattened to 24-bit RGB (no alpha) via Python/Pillow, as the
 * Chrome Web Store requires.
 *
 * Usage (from repo root):
 *   node docs/store/chrome-web-store/generate.cjs
 * Env:
 *   PLAYWRIGHT_MODULE  path to the playwright package (default: "playwright", then /opt/node-tools/node_modules/playwright)
 *   CHROME_PATH        Chromium executable (default: Playwright's bundled one, then /opt/pw-browsers/...)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function loadPlaywright() {
    const candidates = [process.env.PLAYWRIGHT_MODULE, 'playwright', '/opt/node-tools/node_modules/playwright'].filter(Boolean);
    for (const c of candidates) {
        try { return require(c); } catch { /* next */ }
    }
    throw new Error('Playwright not found. npm i -D playwright or set PLAYWRIGHT_MODULE.');
}
const { chromium } = loadPlaywright();

const HERE = __dirname;
const REPO = path.resolve(HERE, '../../..');
const OUT = path.join(HERE, 'assets');
const LOGO = fs.readFileSync(path.join(REPO, 'extension/icons/logo.svg'), 'utf8');

// ─── Fictional sample pages (what the mocked tab "contains") ─────────

const ORIGIN = 'https://northwind-coffee.example';
const filler = (s, n) => Array.from({ length: n }, () => s).join(' ');

const HOME_HTML = `<!doctype html><html lang="en"><head>
<title>Northwind Coffee Roasters – Small-batch specialty coffee</title>
<meta name="description" content="Specialty coffee roasted in small batches every Tuesday. Single origins, espresso blends and brewing guides, shipped fresh to your door.">
<link rel="canonical" href="${ORIGIN}/">
<meta property="og:title" content="Northwind Coffee Roasters"><meta property="og:description" content="Small-batch specialty coffee."><meta property="og:image" content="${ORIGIN}/og.jpg">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Northwind Coffee Roasters","url":"${ORIGIN}/","logo":"${ORIGIN}/logo.png"}</script>
</head><body><header><nav><a href="/">Shop</a><a href="/guides/">Guides</a></nav></header><main>
<h1>Small-batch coffee, roasted every Tuesday</h1>
<h2>Single origins</h2><p>${filler('Our single origins come from farms we have visited ourselves, roasted light to keep the fruit and florals.', 12)}</p>
<h2>Brewing guides</h2><p>${filler('From pour-over to espresso, our guides show recipes, grind sizes and water ratios step by step.', 12)}</p>
<img src="/beans.jpg" alt="Freshly roasted beans cooling in the drum"></main></body></html>`;

const GUIDE_HTML = `<!doctype html><html lang="en-US"><head>
<title>Pour-over coffee guide: ratio, grind & timing | Northwind</title>
<meta name="description" content="Brew better pour-over at home: the 1:16 ratio, grind size, bloom and pour timing explained step by step, with a printable recipe card.">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<link rel="canonical" href="${ORIGIN}/guides/pour-over">
<link rel="alternate" hreflang="en" href="${ORIGIN}/guides/pour-over"><link rel="alternate" hreflang="de" href="${ORIGIN}/de/guides/pour-over">
</head><body><main><h1>The pour-over guide</h1>
<h2>What you need</h2><p>${filler('A dripper, a filter, a kettle with a gooseneck spout and freshly ground coffee.', 10)}</p>
<h2>Ratio and grind</h2><h4>Grind size</h4><p>${filler('Start with 15 grams of coffee to 250 grams of water and a medium-fine grind.', 10)}</p>
<h2>Bloom and pour</h2><p>${filler('Pour twice the coffee weight in water, wait 40 seconds, then pour in slow circles.', 10)}</p>
<img src="/v60.jpg" alt="Pour-over dripper on a scale"><img src="/kettle.jpg"></main></body></html>`;

const SHOP_HTML = `<!doctype html><html lang="en"><head>
<title>Shop all coffee | Northwind Coffee Roasters</title>
<meta name="description" content="Shop single origins, espresso blends and decaf from Northwind Coffee Roasters. Roasted every Tuesday, shipped within 48 hours, free over $40.">
<link rel="canonical" href="${ORIGIN}/shop">
<script src="/_next/static/chunks/webpack.js"></script><script src="/_next/static/chunks/framework.js"></script><script src="/_next/static/chunks/main-app.js"></script><script src="/_next/static/chunks/pages/shop.js"></script>
</head><body><div id="__next"><div class="skeleton"><span>Loading products…</span></div></div>
<script id="__NEXT_DATA__" type="application/json">{"page":"/shop"}</script>
<script>${'window.__APP_STATE__=' + JSON.stringify({ cart: [], flags: { a: 1 }, products: Array.from({ length: 12 }, (_, i) => ({ id: i, sku: 'NW-' + i })) })}</script>
</body></html>`;

const ARTICLE_HTML = `<!doctype html><html lang="en"><head>
<title>Washed vs. natural process: how it changes your cup | Northwind</title>
<meta name="description" content="Washed coffees taste clean and bright, naturals fruity and heavy. Our head roaster explains processing methods and what they mean for your cup.">
<link rel="canonical" href="${ORIGIN}/journal/washed-vs-natural">
<meta property="og:title" content="Washed vs. natural process"><meta property="og:type" content="article"><meta property="og:image" content="${ORIGIN}/journal/process.jpg"><meta property="og:description" content="Processing methods explained.">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="Washed vs. natural process">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[
 {"@type":"BlogPosting","headline":"Washed vs. natural process: how it changes your cup","author":{"@type":"Person","name":"Maya Lindqvist"},"datePublished":"2026-09-02","dateModified":"2026-10-06","image":"${ORIGIN}/journal/process.jpg"},
 {"@type":"Organization","name":"Northwind Coffee Roasters","url":"${ORIGIN}/"},
 {"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Journal","item":"${ORIGIN}/journal/"}]},
 {"@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Is natural process coffee sweeter?","acceptedAnswer":{"@type":"Answer","text":"Usually, yes."}}]}
]}</script>
</head><body><main><article><h1>Washed vs. natural process</h1>
<h2>Washed</h2><p>${filler('Washed coffees have the fruit removed before drying, which gives a clean, bright and transparent cup.', 12)}</p>
<h2>Natural</h2><p>${filler('Naturals dry inside the whole cherry, which adds fruity sweetness and a heavier body.', 12)}</p>
<img src="/journal/process.jpg" alt="Coffee cherries drying on raised beds"></article></main></body></html>`;

const BOT_VIEW = {
    findings: [
        { severity: 'critical', message: 'ClaudeBot gets HTTP 403 from your bot protection, although robots.txt allows it.' },
        { severity: 'warning', message: 'GPTBot is disallowed by robots.txt (Disallow: /).' },
        { severity: 'info', message: 'OAI-SearchBot and PerplexityBot receive the full page.' },
    ],
    rawVisibilityRatio: 0.86,
    bots: [
        { token: 'GPTBot', operator: 'OpenAI', purpose: 'training', robots: { allowed: false, rule: 'Disallow: /' }, fetch: { tested: true, status: 200, textLength: 4812 } },
        { token: 'OAI-SearchBot', operator: 'OpenAI', purpose: 'search', robots: { allowed: true }, fetch: { tested: true, status: 200, textLength: 4812 } },
        { token: 'ClaudeBot', operator: 'Anthropic', purpose: 'training', robots: { allowed: true }, fetch: { tested: true, status: 403, blocked: true, textLength: 0 } },
        { token: 'PerplexityBot', operator: 'Perplexity', purpose: 'search', robots: { allowed: true }, fetch: { tested: true, status: 200, textLength: 4812 } },
        { token: 'Google-Extended', operator: 'Google', purpose: 'AI training', robots: { allowed: true }, fetch: { tested: false } },
    ],
    caveat: 'User-agent test from a datacenter IP. Real crawlers may be treated differently.',
};

// open: which <details> stay open (0=A, 1=B, 2=C, 3=Bot-View); scrollTo: index of section to scroll to (or null)
const SCENARIOS = {
    1: { path: '/', html: HOME_HTML, textLength: 5600, open: [], scrollTo: null },
    2: { path: '/guides/pour-over', html: GUIDE_HTML, textLength: 3900, open: [0], scrollTo: 0 },
    3: { path: '/shop', html: SHOP_HTML, textLength: 22, open: [1], scrollTo: null },
    4: { path: '/journal/washed-vs-natural', html: ARTICLE_HTML, textLength: 4300, open: [2], scrollTo: 0 },
    5: { path: '/', html: HOME_HTML, textLength: 5600, open: [3], scrollTo: 3, detective: true },
};

const SLIDES = [
    {
        kicker: 'Case file · GEO Page Audit',
        title: 'What do AI crawlers see on this page?',
        sub: 'One click audits the rendered page for Basic SEO, LLM readability and structured data, scored out of 100.',
        points: ['Runs locally in your browser', 'No account, no tracking', 'Export the case file as JSON'],
    },
    {
        kicker: 'Exhibit A · Basic SEO',
        title: 'The basics, plus the GEO signals.',
        sub: 'Title, description and headings, plus meta robots, canonical and language, with a concrete fix for every loose end.',
        points: ['Meta robots & noindex', 'Canonical URL', 'lang & hreflang'],
    },
    {
        kicker: 'Exhibit B · LLM readability',
        title: 'Catch the empty app shell.',
        sub: 'Most AI crawlers don’t run JavaScript. The audit flags thin, script-rendered pages and names the framework.',
        points: ['Visible text vs. inline script', 'Main content length', 'Next.js, Nuxt, React & more'],
    },
    {
        kicker: 'Exhibit C · Structured data',
        title: 'Schema that AI answers can cite.',
        sub: 'JSON-LD types and their key fields, author and dates, Open Graph and Twitter Cards at a glance.',
        points: ['Article, Product, FAQ, Organization', 'Author, published & modified', 'Open Graph & Twitter Cards'],
    },
    {
        kicker: 'The Bot-View clue · optional · 5¢',
        title: 'Is GPTBot locked out?',
        sub: 'Robots.txt, server response and what is visible without JavaScript, checked for GPTBot, ClaudeBot, PerplexityBot and more.',
        points: ['Only on click, with your API key', 'Sends just the URL + text length', 'Powered by datadetective.app'],
    },
];

// ─── Shared styles ───────────────────────────────────────────────────

const BASE_CSS = `
:root{--bg:#0e0d0b;--surface:#171512;--surface-2:#1f1c18;--border:#2e2a24;--text:#ece6da;--muted:#a39b8c;--accent:#e8b44c;
--serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,Caladea,serif;
--sans:system-ui,-apple-system,"Segoe UI",Roboto,Inter,sans-serif;--mono:ui-monospace,"SF Mono",Menlo,Consolas,"DejaVu Sans Mono",monospace}
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:var(--bg);color:var(--text);font-family:var(--sans);-webkit-font-smoothing:antialiased;overflow:hidden}
.kicker{font-family:var(--mono);text-transform:uppercase;letter-spacing:.12em;color:var(--accent);font-weight:500}
.serif{font-family:var(--serif);font-weight:600}
`;

// Visible popup height (CSS px): the maximum Chrome allows for action popups.
const POPUP_H = 600;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function siteMock(scenario) {
    return `
<div class="site">
  <div class="site-nav"><b>NORTHWIND</b><span>Coffee Roasters</span><i></i><em>Shop</em><em>Guides</em><em>Journal</em><em>Cart (0)</em></div>
  <div class="site-hero">
    <div><small>ROASTED EVERY TUESDAY</small><h2>Small-batch coffee, in your cup by Friday.</h2><p>Single origins and espresso blends from farms we know by name.</p><span class="btn">Shop coffee</span></div>
    <div class="bag"><div class="bag-label">NORTHWIND<br><small>Ethiopia · Guji</small></div></div>
  </div>
  <div class="site-cards"><div></div><div></div><div></div></div>
</div>`;
}

function slideHtml(n) {
    const s = SLIDES[n - 1];
    const sc = SCENARIOS[n];
    return `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}
body{width:1280px;height:800px;position:relative;
 background:radial-gradient(ellipse 60% 55% at 78% 30%,rgba(232,180,76,.16),transparent 70%),
            radial-gradient(ellipse 50% 60% at 0% 100%,rgba(232,180,76,.06),transparent 70%),var(--bg)}
.copy{position:absolute;left:72px;top:0;bottom:0;width:470px;display:flex;flex-direction:column;justify-content:center}
.brand{position:absolute;top:47px;left:0;display:flex;align-items:center;gap:12px;font-family:var(--serif);font-weight:600;font-size:22px}
.brand svg{width:34px;height:34px}
.copy .kicker{font-size:14px;margin-bottom:22px}
.copy h1{font-family:var(--serif);font-weight:600;font-size:54px;line-height:1.08;letter-spacing:-.01em;margin-bottom:24px}
.copy .sub{font-size:20px;line-height:1.5;color:var(--muted);margin-bottom:34px}
.copy ul{list-style:none;border-top:1px solid var(--border)}
.copy li{font-size:17px;padding:13px 0;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:14px}
.copy li::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 4px rgba(232,180,76,.15);flex:none}
/* browser mock */
.browser{position:absolute;left:600px;top:40px;width:760px;height:800px;border-radius:12px 0 0 0;overflow:hidden;
 background:#e9e4da;box-shadow:0 30px 80px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.06)}
.bar{height:84px;background:#25221d;border-bottom:1px solid #3a352d}
.tabs{height:40px;display:flex;align-items:flex-end;padding-left:84px;position:relative}
.dots{position:absolute;left:18px;top:15px;display:flex;gap:8px}.dots i{width:12px;height:12px;border-radius:50%;background:#4a443a}
.tab{height:32px;width:240px;background:#33302a;border-radius:9px 9px 0 0;display:flex;align-items:center;gap:8px;padding:0 14px;font-size:13px;color:#d9d2c4}
.tab i{width:14px;height:14px;border-radius:3px;background:#8a5a2b}
.addr{height:44px;display:flex;align-items:center;gap:12px;padding:0 14px;background:#33302a}
.omni{flex:1;height:30px;border-radius:15px;background:#1c1a16;display:flex;align-items:center;padding:0 16px;font-size:14px;color:#cfc8ba}
.omni span{color:#8b8477}
.ext{width:30px;height:30px;border-radius:7px;display:grid;place-items:center;background:rgba(232,180,76,.18);box-shadow:0 0 0 1px rgba(232,180,76,.5)}
.ext svg{width:22px;height:22px}
.site{filter:blur(1.2px) brightness(.62) saturate(.9);color:#2b2018;padding:0 40px}
.site-nav{display:flex;align-items:center;gap:10px;height:64px;font-size:15px;border-bottom:1px solid #d5cdbf}
.site-nav b{letter-spacing:.2em}.site-nav i{flex:1}.site-nav em{font-style:normal;margin-left:20px}
.site-hero{display:flex;gap:30px;padding:48px 0 36px}
.site-hero small{letter-spacing:.2em;color:#8a5a2b;font-size:12px}
.site-hero h2{font-family:var(--serif);font-size:44px;line-height:1.1;margin:12px 0 16px;max-width:380px}
.site-hero p{font-size:17px;max-width:360px;line-height:1.5;margin-bottom:22px}
.site-hero .btn{display:inline-block;background:#2b2018;color:#f4efe6;padding:12px 22px;border-radius:6px;font-size:15px}
.bag{width:230px;height:290px;border-radius:14px;background:linear-gradient(160deg,#a8743f,#5b3a1d);flex:none;display:grid;place-items:center}
.bag-label{background:#f4efe6;padding:16px 20px;border-radius:6px;text-align:center;letter-spacing:.2em;font-size:14px}
.site-cards{display:flex;gap:20px}.site-cards div{flex:1;height:180px;border-radius:10px;background:linear-gradient(160deg,#cdb89a,#9b7a55)}
/* popup */
.popup-wrap{position:absolute;right:42px;top:130px;width:${380 * 1.08}px;height:${POPUP_H * 1.08}px;border-radius:10px;overflow:hidden;
 box-shadow:0 24px 70px rgba(0,0,0,.75),0 0 0 1px rgba(232,180,76,.35)}
.popup-wrap iframe{width:380px;height:${POPUP_H}px;border:0;transform:scale(1.08);transform-origin:0 0;display:block;background:var(--bg)}
.caret{position:absolute;right:${42 + 20}px;top:122px;width:16px;height:16px;transform:rotate(45deg);background:#0e0d0b;box-shadow:-1px -1px 0 rgba(232,180,76,.35)}
</style></head><body>
<div class="copy">
  <div class="brand">${LOGO}<span>Data Detective</span></div>
  <p class="kicker">${esc(s.kicker)}</p>
  <h1>${esc(s.title)}</h1>
  <p class="sub">${esc(s.sub)}</p>
  <ul>${s.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
</div>
<div class="browser">
  <div class="bar">
    <div class="tabs"><div class="dots"><i></i><i></i><i></i></div><div class="tab"><i></i>Northwind Coffee Roasters</div></div>
    <div class="addr"><div class="omni">northwind-coffee.example<span>${esc(sc.path === '/' ? '' : sc.path)}</span></div><div class="ext">${LOGO}</div></div>
  </div>
  ${siteMock(sc)}
</div>
<div class="caret"></div>
<div class="popup-wrap"><iframe src="/extension/popup.html?s=${n}"></iframe></div>
</body></html>`;
}

function promoHtml(kind) {
    if (kind === 'small') {
        return `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}
body{width:440px;height:280px;position:relative;
 background:radial-gradient(ellipse 80% 70% at 85% 0%,rgba(232,180,76,.20),transparent 70%),var(--bg)}
.wrap{position:absolute;inset:0;padding:34px 34px;display:flex;flex-direction:column;justify-content:center}
.logo{width:64px;height:64px;margin-bottom:20px;border-radius:14px;box-shadow:0 0 0 1px rgba(232,180,76,.35),0 10px 30px rgba(0,0,0,.5)}
.logo svg{width:64px;height:64px;display:block}
h1{font-family:var(--serif);font-weight:600;font-size:42px;line-height:1;letter-spacing:-.01em}
.by{font-family:var(--mono);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-top:12px}
.tag{font-size:17px;color:var(--muted);margin-top:18px}
</style></head><body><div class="wrap">
<div class="logo">${LOGO}</div>
<h1>GEO Page Audit</h1>
<p class="by">by Data Detective</p>
<p class="tag">What do AI crawlers see on your page?</p>
</div></body></html>`;
    }
    return `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}
body{width:1400px;height:560px;position:relative;
 background:radial-gradient(ellipse 45% 80% at 82% 40%,rgba(232,180,76,.18),transparent 70%),
            radial-gradient(ellipse 40% 60% at 0% 100%,rgba(232,180,76,.06),transparent 70%),var(--bg)}
.wrap{position:absolute;left:110px;top:0;bottom:0;width:760px;display:flex;flex-direction:column;justify-content:center}
.k{font-size:16px;margin-bottom:26px}
h1{font-family:var(--serif);font-weight:600;font-size:92px;line-height:1;letter-spacing:-.015em}
.by{font-family:var(--mono);font-size:16px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-top:18px}
.tag{font-size:26px;line-height:1.45;color:var(--muted);margin-top:34px;max-width:680px}
.mark{position:absolute;right:170px;top:50%;width:260px;height:260px;transform:translateY(-50%);border-radius:56px;
 box-shadow:0 0 0 1px rgba(232,180,76,.35),0 40px 100px rgba(0,0,0,.6),0 0 120px rgba(232,180,76,.15)}
.mark svg{width:260px;height:260px;display:block}
</style></head><body>
<div class="wrap">
<p class="kicker k">Case file · Generative engine optimization</p>
<h1>GEO Page Audit</h1>
<p class="by">by Data Detective</p>
<p class="tag">What do GPTBot, ClaudeBot and PerplexityBot see on your page? One click, right in the browser.</p>
</div>
<div class="mark">${LOGO}</div>
</body></html>`;
}

// ─── Mocks injected into every frame ─────────────────────────────────

function initMocks({ scenarios, botView }) {
    if (!location.pathname.endsWith('/popup.html')) return;
    const sc = scenarios[new URLSearchParams(location.search).get('s')] || scenarios[1];
    const api = {
        runtime: { id: 'store-shots' },
        tabs: { query: async () => [{ id: 1, url: 'https://northwind-coffee.example' + sc.path }] },
        scripting: { executeScript: async () => [{ result: { html: sc.html, textLength: sc.textLength } }] },
        storage: { local: { get: async () => ({ apiKey: 'dd_live_demo' }), set: async () => {}, remove: async () => {} } },
    };
    window.chrome = api;
    window.fetch = async () => new Response(JSON.stringify(botView), { headers: { 'content-type': 'application/json' } });
    // Local fallback for the serif stack (Georgia/Palatino are not installed on Linux CI boxes).
    document.addEventListener('DOMContentLoaded', () => {
        const st = document.createElement('style');
        st.textContent = ':root{--serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,Caladea,serif}';
        document.head.appendChild(st);
    });
}

// ─── Run ─────────────────────────────────────────────────────────────

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };

function serve() {
    return new Promise((resolve) => {
        const srv = http.createServer((req, res) => {
            const u = new URL(req.url, 'http://x');
            let m;
            if ((m = u.pathname.match(/^\/__slide\/(\d)$/))) { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(slideHtml(+m[1])); }
            if ((m = u.pathname.match(/^\/__promo\/(small|marquee)$/))) { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(promoHtml(m[1])); }
            const f = path.join(REPO, path.normalize(decodeURIComponent(u.pathname)));
            if (!f.startsWith(path.join(REPO, 'extension'))) { res.writeHead(404); return res.end(); }
            fs.readFile(f, (e, d) => {
                if (e) { res.writeHead(404); return res.end(); }
                res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'text/plain' });
                res.end(d);
            });
        }).listen(0, '127.0.0.1', () => resolve(srv));
    });
}

function flattenRgb(files) {
    const py = 'import sys\nfrom PIL import Image\nfor f in sys.argv[1:]:\n  im=Image.open(f)\n  if im.mode!="RGB":\n    bg=Image.new("RGB",im.size,(14,13,11)); bg.paste(im,mask=im.convert("RGBA").split()[3]); im=bg\n  im.save(f,optimize=True)\n  print(f, im.size, im.mode)';
    process.stdout.write(execFileSync('python3', ['-c', py, ...files]).toString());
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = await serve();
    const base = `http://127.0.0.1:${srv.address().port}`;
    const launchOpts = {};
    const chromeCandidates = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].filter(Boolean);
    const exe = chromeCandidates.find((p) => fs.existsSync(p));
    if (exe) launchOpts.executablePath = exe;
    const browser = await chromium.launch(launchOpts);
    const written = [];

    for (const n of [1, 2, 3, 4, 5]) {
        const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
        page.on('pageerror', (e) => console.error('pageerror', e.message));
        await page.addInitScript(initMocks, { scenarios: SCENARIOS, botView: BOT_VIEW });
        await page.goto(`${base}/__slide/${n}`);
        const frame = page.frames().find((f) => f.url().includes('popup.html'));
        await frame.waitForSelector('#analyzeBtn');
        await frame.click('#analyzeBtn');
        await frame.waitForSelector('#results:not(.hidden)');
        const sc = SCENARIOS[n];
        if (sc.detective) {
            await frame.click('#detectiveBtn');
            await frame.waitForFunction(() => document.querySelectorAll('#detectiveResults .check-item, #detectiveResults > *').length > 3);
        }
        await frame.evaluate(({ open, scrollTo }) => {
            const secs = [...document.querySelectorAll('details.section')];
            secs.forEach((d, i) => { d.open = open.includes(i); });
            document.activeElement?.blur();
            if (scrollTo !== null) {
                const el = secs[scrollTo];
                const y = el.getBoundingClientRect().top + document.scrollingElement.scrollTop - 10;
                document.scrollingElement.scrollTop = y;
                document.body.scrollTop = y;
            }
        }, { open: sc.open, scrollTo: sc.scrollTo });
        await page.waitForTimeout(300);
        const file = path.join(OUT, `screenshot-${n}.png`);
        await page.screenshot({ path: file });
        written.push(file);
        await page.close();
    }

    for (const [kind, w, h, name] of [['small', 440, 280, 'promo-small-440x280.png'], ['marquee', 1400, 560, 'promo-marquee-1400x560.png']]) {
        const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
        await page.goto(`${base}/__promo/${kind}`);
        await page.waitForTimeout(200);
        const file = path.join(OUT, name);
        await page.screenshot({ path: file });
        written.push(file);
        await page.close();
    }

    await browser.close();
    srv.close();
    flattenRgb(written);
})().catch((e) => { console.error(e); process.exit(1); });
