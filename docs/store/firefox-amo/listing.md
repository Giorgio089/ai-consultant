# Firefox Add-ons (AMO) listing: GEO Page Audit 0.2.0

Copy for the AMO developer hub (addons.mozilla.org/developers). Field names follow the German dashboard.
Screenshots and icon: see `README.md` in this folder.

> **Keyword spam:** the Chrome Web Store rejected the first 0.2.0 submission for lists of bot and framework
> names in the description. AMO has a similar rule. Never list more than two product names in a row.

## Add-on beschreiben

### Name
GEO Page Audit

### Add-on-URL
Keep `geo-page-audit`.

### Zusammenfassung (max. 250 characters, no formatting)

English (206 characters):
```
What do AI crawlers see on your page? One click audits SEO basics, LLM readability and structured data in your browser. Optional Bot-View check via datadetective.app shows if AI crawlers like GPTBot get in.
```

Deutsch (224 characters):
```
Was sehen AI-Crawler auf deiner Seite? Ein Klick prüft SEO-Grundlagen, LLM-Lesbarkeit und strukturierte Daten direkt im Browser. Optional zeigt der Bot-View-Check über datadetective.app, ob AI-Crawler wie GPTBot durchkommen.
```

### Beschreibung

AMO keeps line breaks and allows a few HTML tags (`<b>`, `<i>`, `<ul>`, `<li>`, `<a>`). Plain text with
bullets is the safe choice.

English:
```
Is your page ready for AI search? GEO Page Audit checks the page you are looking at for what matters to ChatGPT, Claude, Perplexity and other AI answer engines, and tells you what to fix.

One click, right in your browser:

<b>Basic SEO</b>
• Title and meta description length
• H1/H2 structure and skipped heading levels
• Meta robots: noindex, nosnippet and tiny max-snippet values keep you out of AI answers
• Canonical URL, page language and hreflang
• Images without alt text

<b>LLM readability</b>
• How much visible text the page has compared to inline JavaScript
• Main content length and thin-content warning
• Flags empty app shells that only fill up with JavaScript and names the framework

<b>Structured data</b>
• JSON-LD, including @graph; only valid blocks count
• Key fields for common types such as Article, Organization, Product and FAQPage
• Author and publish/modified dates
• Open Graph and Twitter/X Cards

You get a score out of 100, concrete suggestions per check and a JSON export of the full result.

<b>Optional: the Bot-View clue (paid, 5¢ per check)</b>
Most AI crawlers do not run JavaScript, so they may see much less than you do. The Bot-View clue asks <a href="https://datadetective.app">datadetective.app</a> to check robots.txt, the server response and the text visible without JavaScript for the major AI crawlers, such as GPTBot. It needs a datadetective.app API key.

<b>Privacy</b>
The audit runs entirely in your browser. Nothing is sent anywhere unless you click "Call the detective". Then the extension sends the page URL and the length of the visible text (a number, not the text) to datadetective.app, together with your API key. Firefox asks for your consent the first time. No tracking, no analytics, no account needed for the audit.

Works on Firefox for desktop (140+) and Android (142+).
```

Deutsch:
```
Ist deine Seite bereit für die AI-Suche? GEO Page Audit prüft die geöffnete Seite auf das, was für ChatGPT, Claude, Perplexity und andere AI-Antwortmaschinen zählt, und sagt dir, was du verbessern kannst.

Ein Klick, direkt im Browser:

<b>SEO-Grundlagen</b>
• Länge von Title und Meta-Description
• H1/H2-Struktur und übersprungene Überschriften-Ebenen
• Meta-Robots: noindex, nosnippet und sehr kleine max-snippet-Werte halten dich aus AI-Antworten heraus
• Canonical-URL, Sprache der Seite und hreflang
• Bilder ohne Alt-Text

<b>LLM-Lesbarkeit</b>
• Wie viel sichtbarer Text im Verhältnis zu Inline-JavaScript vorhanden ist
• Länge des Hauptinhalts und Warnung bei dünnem Inhalt
• Erkennt leere App-Shells, die sich erst per JavaScript füllen, und nennt das Framework

<b>Strukturierte Daten</b>
• JSON-LD inklusive @graph; nur gültige Blöcke zählen
• Wichtige Felder für gängige Typen wie Article, Organization, Product und FAQPage
• Autor sowie Veröffentlichungs- und Änderungsdatum
• Open Graph und Twitter/X Cards

Du bekommst einen Score bis 100, konkrete Vorschläge je Prüfung und einen JSON-Export des Ergebnisses.

<b>Optional: der Bot-View-Check (kostenpflichtig, 5 ct pro Prüfung)</b>
Die meisten AI-Crawler führen kein JavaScript aus und sehen deshalb oft viel weniger als du. Der Bot-View-Check lässt <a href="https://datadetective.app">datadetective.app</a> robots.txt, Server-Antwort und den ohne JavaScript sichtbaren Text für die wichtigsten AI-Crawler prüfen, etwa GPTBot. Dafür brauchst du einen API-Key von datadetective.app.

<b>Datenschutz</b>
Der Audit läuft komplett im Browser. Es wird nichts gesendet, solange du nicht auf „Call the detective“ klickst. Dann schickt die Erweiterung die URL der Seite und die Länge des sichtbaren Textes (eine Zahl, nicht den Text) zusammen mit deinem API-Key an datadetective.app. Firefox fragt beim ersten Mal nach deiner Zustimmung. Kein Tracking, keine Analytics, für den Audit kein Konto nötig.

Die Oberfläche der Erweiterung ist auf Englisch. Läuft in Firefox für Desktop (ab 140) und Android (ab 142).
```

### Experimentell?
No. The add-on is for general use.

### Benötigt Zahlung?
**Tick it** ("Dieses Add-on erfordert eine zusätzliche Zahlung, kostenpflichtige Dienste …"). The audit is free,
but the Bot-View clue needs a paid datadetective.app API key. AMO reviewers reject listings that hide a paid
feature; the description above states that the core audit is free.

### Kategorien
- **Webentwicklung** (keep)
- Optional second category: **Suchwerkzeuge**, if offered

### E-Mail (support)
A support address, e.g. `development@llmo.consulting` (the address that already handles API key requests).

### Webseite (support)
`https://datadetective.app` or, if the repository is public, `https://github.com/Giorgio089/ai-consultant/issues`.

## Weitere Details

### Tags
Pick from AMO's predefined list only what fits (e.g. a search or developer tag). Do not add tags just for reach.

### Standard-Sprache
Currently **Deutsch**, but the add-on UI and the English texts above are English. Recommendation: switch the
default to **Englisch** and add the German texts as a translation. AMO shows the default language to everyone
without a matching translation.

### Homepage
`https://datadetective.app`

## Technische Details

### Entwickler-Kommentare (shown on the listing)
```
The page audit is free and runs locally. The optional Bot-View clue is a paid service of datadetective.app (5¢ per check, API key required) and is only called when you click "Call the detective". Questions and API keys: development@llmo.consulting
```

### Hinweise (for reviewers, per version)
```
No build step, no minification: the uploaded files are the source (built with scripts/package-extension.mjs, which only copies files and picks the Firefox manifest).

Data collection: required ["none"], optional ["browsingActivity"]. The extension requests the optional permission via browser.permissions.request({data_collection: ["browsingActivity"]}) when the user clicks "Call the detective". Only then the page URL and the visible text length (a number) are sent to https://datadetective.app/api/clue/bot-view with the user's API key. Without consent nothing is sent.

Permissions: activeTab + scripting read the rendered DOM of the current tab after the user clicks "Investigate this page". storage keeps the user's API key locally. No host permissions.

The paid feature is optional; the full page audit works without it. A test API key for review: <add one here if you want reviewers to test the Bot-View clue>.
```

## Datenschutzrichtlinie (AMO "Privacy Policy" field)

Either link to https://datadetective.app/privacy (once it covers the extension) or paste:

```
GEO Page Audit runs its page audit locally in your browser and does not collect, store or transmit any data for it.

Optional Bot-View clue: only when you click "Call the detective", the extension sends the URL of the current page and the length of its visible text (a number, not the text) to datadetective.app, together with your datadetective.app API key. datadetective.app uses this to run the check and logs the call (API key, product, price, target URL) for billing. Firefox asks for your consent before the first transmission.

Your API key is stored locally in the extension's storage and can be removed with "Forget API key". The extension contains no analytics or tracking.

Controller and contact: see https://datadetective.app/imprint · development@llmo.consulting
```

## Grafiken

- **Add-on-Symbol:** upload `assets/icon-512.png` (AMO scales it to 128×128). Without it AMO shows the default
  green puzzle piece.
- **Screenshots:** `assets/screenshot-1.png` … `screenshot-5.png` (2400×1800). Captions are in `README.md`.
