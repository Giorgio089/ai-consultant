# Chrome Web Store listing: GEO Page Audit 0.2.0

Copy-ready texts and answers for the Chrome Web Store Developer Dashboard.
Source of truth for name, version, description and permissions: `extension/manifest.chrome.json`.

---

## 1. Store listing tab

### Name

```
GEO Page Audit
```

(Taken from the manifest. The dashboard shows the manifest name; it cannot be edited there.)

### Summary (max 132 characters)

The summary is the manifest `description` (131 characters). Keep it as is:

```
GEO page audit: SEO basics, LLM readability, structured data. Optional AI crawler check (GPTBot, ClaudeBot…) via datadetective.app.
```

Optional alternative for a later release (131 characters, leads with the question the product answers and
drops the redundant "GEO page audit" that already is the name). The manifest has NOT been changed:

```
What do AI crawlers see? Audit SEO basics, LLM readability & structured data. Optional GPTBot/ClaudeBot check via datadetective.app
```

### Detailed description (English, plain text, paste as is)

The store does not render Markdown, so the text uses plain line breaks and "•" bullets.

```
What do AI crawlers actually see on your page?

ChatGPT, Claude, Perplexity and Google's AI answers increasingly decide which pages get quoted. Their crawlers behave differently from your browser: most of them don't run JavaScript, many get stopped by bot protection, and some are locked out by a robots.txt nobody remembers writing. GEO (generative engine optimization) is about making sure your content can be read, understood and cited by these systems.

GEO Page Audit checks the page in your current tab with one click and scores it out of 100. The audit runs locally in your browser on the rendered page.

EXHIBIT A · BASIC SEO
• Title and meta description length
• H1, H2 and a clean heading hierarchy
• Meta robots (noindex, nosnippet), canonical URL
• lang attribute and hreflang links
• Image alt text

EXHIBIT B · LLM READABILITY
• Visible text vs. inline script
• Main content length
• Detects "empty app shells" that only render with JavaScript
• Names the JavaScript framework the page is built with

EXHIBIT C · STRUCTURED DATA
• JSON-LD types and key fields (Article, Product, FAQPage, Organization)
• Author, published and modified dates
• Open Graph and Twitter Cards

Every loose end comes with a concrete recommendation. Copy the full case file as JSON for tickets, reports or your own tools.

THE BOT-VIEW CLUE (OPTIONAL, PAID: 5¢ PER CHECK)
Want to know what the crawlers themselves get? The Bot-View clue asks datadetective.app to check robots.txt, the server response and the text visible without JavaScript for the major AI crawlers, such as GPTBot.
• Runs only when you click "Call the detective"
• Requires your own API key from datadetective.app (paid service, 5¢ per check)
• Sends only the page URL and the length of its visible text (a number), plus your API key
• The free audit works fully without an API key

PRIVACY
• No account, no analytics, no tracking, no ads
• The page audit never leaves your browser
• Your API key is stored locally in Chrome storage and sent only to datadetective.app
• Privacy policy: https://datadetective.app/privacy

ALSO FOR FIREFOX
GEO Page Audit is also available for Firefox (desktop 140+, Android 142+) on addons.mozilla.org.

Made by Data Detective: https://datadetective.app
```

### Detailed description (German localization, optional)

Add under "Store listing" → language "Deutsch" if the listing should be localized.

```
Was sehen KI-Crawler wirklich auf deiner Seite?

ChatGPT, Claude, Perplexity und die KI-Antworten von Google entscheiden zunehmend, welche Seiten zitiert werden. Ihre Crawler verhalten sich anders als dein Browser: Die meisten führen kein JavaScript aus, viele werden vom Bot-Schutz blockiert, und manche sperrt eine vergessene robots.txt aus. GEO (Generative Engine Optimization) sorgt dafür, dass diese Systeme deine Inhalte lesen, verstehen und zitieren können.

GEO Page Audit prüft die Seite im aktuellen Tab mit einem Klick und vergibt bis zu 100 Punkte. Die Prüfung läuft lokal im Browser auf der gerenderten Seite.

BEWEISSTÜCK A · SEO-GRUNDLAGEN
• Länge von Title und Meta-Description
• H1, H2 und saubere Überschriften-Hierarchie
• Meta Robots (noindex, nosnippet), Canonical-URL
• lang-Attribut und hreflang-Links
• Alt-Texte von Bildern

BEWEISSTÜCK B · LESBARKEIT FÜR LLMs
• Sichtbarer Text im Verhältnis zu Inline-Skripten
• Länge des Hauptinhalts
• Erkennt leere „App Shells“, die nur mit JavaScript Inhalte zeigen
• Nennt das JavaScript-Framework, mit dem die Seite gebaut ist

BEWEISSTÜCK C · STRUKTURIERTE DATEN
• JSON-LD-Typen und wichtige Felder (Article, Product, FAQPage, Organization)
• Autor, Veröffentlichungs- und Änderungsdatum
• Open Graph und Twitter Cards

Zu jeder Schwachstelle gibt es eine konkrete Empfehlung. Die komplette Fallakte lässt sich als JSON kopieren.

DER BOT-VIEW-HINWEIS (OPTIONAL, KOSTENPFLICHTIG: 5 CENT PRO PRÜFUNG)
datadetective.app prüft robots.txt, Server-Antwort und den ohne JavaScript sichtbaren Text für die wichtigsten AI-Crawler, etwa GPTBot.
• Läuft nur nach Klick auf „Call the detective“
• Benötigt einen eigenen API-Schlüssel von datadetective.app (kostenpflichtig, 5 Cent pro Prüfung)
• Übertragen werden nur die URL der Seite und die Länge ihres sichtbaren Texts (eine Zahl), dazu dein API-Schlüssel
• Die kostenlose Prüfung funktioniert vollständig ohne API-Schlüssel

DATENSCHUTZ
• Kein Konto, keine Analyse, kein Tracking, keine Werbung
• Die Seitenprüfung verlässt deinen Browser nicht
• Der API-Schlüssel wird lokal gespeichert und nur an datadetective.app gesendet
• Datenschutzerklärung: https://datadetective.app/privacy

AUCH FÜR FIREFOX
GEO Page Audit gibt es auch für Firefox (Desktop ab 140, Android ab 142) auf addons.mozilla.org.

Von Data Detective: https://datadetective.app
```

Note: the extension UI itself is English only (no `_locales`). A German store text is allowed, but it
should stay clear that the UI is English, otherwise reviewers or users may complain. Option: add the line
"Die Oberfläche der Erweiterung ist auf Englisch." at the end of the German text.

### Category

**Recommendation: keep "Developer Tools"** (Productivity → Developer Tools).

| Option | Assessment |
|---|---|
| Developer Tools | Best fit. The extension inspects HTML, meta tags, robots directives, JSON-LD and JS rendering: classic page-inspection work done by web developers, technical SEOs and site owners. Comparable SEO/schema inspectors live here, and users browsing this category expect exactly this kind of tool. |
| Tools | Catch-all category with a lot of unrelated utilities (downloaders, converters). Less targeted, harder to rank. |
| Workflow & Planning | Meant for task, project and time management. Does not describe an audit tool; risks a category-mismatch flag. |

### Language

English (primary). Optional: German store text (see above).

### Graphic assets

| Field | File | Spec |
|---|---|---|
| Store icon | `extension/icons/icon-128.png` | 128x128 PNG (already in the package) |
| Screenshot 1-5 | `assets/screenshot-1.png` … `screenshot-5.png` | 1280x800, 24-bit RGB PNG, no alpha |
| Small promo tile | `assets/promo-small-440x280.png` | 440x280, RGB PNG, no alpha |
| Marquee promo tile | `assets/promo-marquee-1400x560.png` | 1400x560, RGB PNG, no alpha |

Upload screenshots in this order. Captions (the store shows no caption field for screenshots any more,
but use them as alt text on the website / in announcements, and they match the headline on each slide):

1. **What do AI crawlers see on this page?** One click scores the current page out of 100 across Basic SEO, LLM readability and structured data.
2. **Exhibit A · Basic SEO.** Title, description and headings plus the GEO signals: meta robots, canonical, lang and hreflang, each with a concrete fix.
3. **Exhibit B · LLM readability.** Flags empty app shells and JavaScript-heavy pages that most AI crawlers can't read, and names the framework.
4. **Exhibit C · Structured data.** JSON-LD types and key fields, author and dates, Open Graph and Twitter Cards at a glance.
5. **The Bot-View clue (optional, 5¢).** See whether AI crawlers like GPTBot are blocked by robots.txt or bot protection, checked via datadetective.app.

All screenshots show the real extension popup (rendered from `extension/popup.html`) on a fictional
sample site, "Northwind Coffee Roasters" (`northwind-coffee.example`). Bot-View results are sample data.

### Additional fields

| Field | Value |
|---|---|
| Official URL | `https://datadetective.app` (only selectable once the domain is verified in Google Search Console for the publisher account) |
| Homepage URL | `https://datadetective.app/` |
| Support URL | `https://github.com/Giorgio089/ai-consultant/issues` or a support/contact page on datadetective.app |
| Mature content | No |

---

## 2. Privacy practices tab

### Single purpose

```
GEO Page Audit audits the web page in the current tab for generative engine optimization (GEO): it shows how well search engines and AI crawlers can read, understand and cite that page (basic SEO, LLM readability, structured data), optionally extended by an on-demand AI crawler access check.
```

### Permission justifications

**activeTab**

```
When the user clicks the toolbar icon and then "Investigate this page", the extension needs temporary access to the active tab to read its rendered HTML for the audit. activeTab grants this only for the tab the user explicitly invoked the extension on, only for that moment, and gives no access to other tabs or to browsing in the background.
```

**scripting**

```
Used together with activeTab to run one function in the active tab via chrome.scripting.executeScript. The function returns document.documentElement.outerHTML and the length of the visible text, which the popup then analyzes locally. The extension has no persistent content scripts and injects nothing else.
```

**storage**

```
Stores the user's optional datadetective.app API key in chrome.storage.local so it does not have to be re-entered for every Bot-View check. The user can delete it at any time with "Forget API key". No other data is stored.
```

**Host permissions: none requested**

```
The extension requests no host permissions. Page access happens only through activeTab after an explicit user action. The optional Bot-View request is a regular HTTPS request from the popup to https://datadetective.app, which answers with CORS headers, so no host permission is needed.
```

(Only fill in the field if the dashboard asks; with no host permissions it usually does not.)

### Remote code

**No, I am not using remote code.**

```
All JavaScript is packaged in the extension. The request to datadetective.app returns JSON data only (findings, bot results), which is rendered as text. No script, eval or remote module is loaded.
```

### Data usage

What actually leaves the device, and when:

| Data | When | Where to |
|---|---|---|
| URL of the active tab | Only after the user clicks "Call the detective" | `https://datadetective.app/api/clue/bot-view` |
| Visible text length of the page (an integer) | same | same |
| User's own datadetective.app API key (Bearer header) | same | same |
| Page HTML / text content | Never. Analyzed locally in the popup | – |

Tick these categories:

| Category | Tick? | Reason |
|---|---|---|
| Personally identifiable information | No | Nothing like name, email or address is collected. |
| Health information | No | – |
| Financial and payment information | No | Payment for the clue happens on datadetective.app, not in the extension. |
| **Authentication information** | **Yes** | The user's API key is a credential. It is stored locally and sent to datadetective.app to authorize the paid check. Ticking this is the conservative, accurate choice. |
| Personal communications | No | – |
| Location | No | – |
| **Web history** | **Yes** | Chrome defines web history as "the list of web pages a user has visited, as well as associated data such as page title and time of visit". The URL of the page the user is on is exactly such an entry. Even though it is one URL per click and not a list, it is web-history data in Chrome's sense. |
| User activity | No | No clicks, keystrokes, scroll or mouse events are recorded. |
| Website content | No | Chrome defines it as "text, images, sounds, videos or hyperlinks". The extension reads the page HTML but only processes it locally; the only derived value sent is the text *length* (a number), not the text. If you prefer maximum caution, ticking it does no harm, but it would overstate what is transmitted. |

Certify all three statements:

- [x] I do not sell or transfer user data to third parties, outside of the approved use cases.
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes.

(Sending the URL to datadetective.app is the user-requested core function of the Bot-View clue, i.e. an
approved use case. This holds as long as datadetective.app is operated by the publisher or acts as its
processor and does not resell or reuse the URLs.)

### Privacy policy URL

```
https://datadetective.app/privacy
```

Requirements before submitting (reviewers check this page):

- It must explicitly name the **GEO Page Audit browser extension**, not just the website.
- It must state: the audit runs locally; on click of "Call the detective" the page URL, the visible
  text length and the user's API key are sent to datadetective.app; what is logged and how long it is
  kept; no sale or sharing; how users delete their key (Forget API key) and request deletion of server data.
- It must be reachable without login and match the disclosures above.

---

## 3. Paid feature disclosure

The core audit is free. The Bot-View clue is a **paid external service** (datadetective.app, 5¢ per
check, own API key required). The Chrome Web Store policies require that functionality depending on
payment is disclosed clearly so the listing is not misleading:

- The detailed description says "OPTIONAL, PAID: 5¢ PER CHECK" in the section heading and again in
  the bullets, and states that the free audit works fully without a key. Keep both.
- Screenshot 5 labels the feature "optional · 5¢" in the headline area; the popup itself shows the
  "5¢" badge and the data notice next to the button.
- Payment is not processed through the Chrome Web Store or inside the extension, so no in-app-purchase
  settings apply. In the dashboard, leave the item as free; do not mark it as paid.
- Do not describe the extension as "free" without qualification anywhere in the listing (e.g. use
  "free page audit" rather than "100 % free").

---

## 4. Distribution

| Field | Value |
|---|---|
| Visibility | Public |
| Regions | All regions |
| Pricing | Free (paid add-on service is external, see above) |

## 5. Test instructions for the reviewer (optional field)

```
The page audit needs no account: open any http(s) page, click the toolbar icon, then "Investigate this page".
The optional "Call the detective" button calls the paid datadetective.app API and needs an API key. Without a key the extension shows a key field and sends nothing. [If you want reviewers to test it, add a test key here: dd_…]
```
