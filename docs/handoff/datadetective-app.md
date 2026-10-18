---
title: Handoff Extension 0.2.0 → datadetective.app (Worker + Website)
created: 2026-10-18
from: Extension-Repo github.com/Giorgio089/ai-consultant, main @ c743628
to: lokale Claude-Code-Instanz in ~/Homeserver/development/active/datadetective
status: Extension 0.2.0 gemergt (PR #18, #20), von Georg in Chrome + Firefox getestet
---

# Handoff: Extension 0.2.0 → datadetective.app

Die Extension-Instanz kann das Website-Repo nicht sehen und umgekehrt. Alles, was der Worker garantieren
muss, steht in Abschnitt 2. Pfadangaben wie `extension/…` beziehen sich auf das Extension-Repo.

## 0. TL;DR und Checkliste

Extension 0.2.0 ist auf `main`. Georg hat API-Key-Eingabe und Bot-View-Ausgabe in Chrome und Firefox
getestet, das Design ist abgenommen. Der Worker funktioniert damit **heute schon**. Die Aufgaben unten
sichern das ab und ziehen die Audit-Engine nach.

```markdown
- [ ] CORS für chrome-extension://* und moz-extension://* NICHT entfernen; Worker-Tests für den
      OPTIONS-Preflight und für CORS-Header auf 401/402/429/5xx ergänzen (2.4)
- [ ] Bot-View-Gesamtlaufzeit messen; Crawler-Abrufe parallelisieren, Gesamtbudget ~25 s (2.5)
- [ ] Idempotenz: gleicher Key + gleiche URL innerhalb ~10 s nicht doppelt abrechnen (2.6)
- [ ] Antwort-Shape gegen 2.2 prüfen (findings[] immer vorhanden, content-type JSON)
- [ ] Engine-Sync: extension/audit/runAudit.js + schema.js nach src/audit/ kopieren (3)
- [ ] Danach eigene Seiten neu auditieren und die Aussage „100/100" verifizieren oder anpassen
- [ ] Ergebnisdarstellung des Gratis-Audits für Schema 0.2 prüfen/erweitern (3.3)
- [ ] /privacy um den Extension-Datenfluss erweitern (4.1)
- [ ] Extension-Sektion: AMO-Link, Chrome Web Store „soon", neue Screenshots (4.2)
- [ ] Optional: Endpunkte für Extension 0.3 vorbereiten (5, nur Vorschläge)
```

## 1. Stand der Extension (0.2.0)

- Gemergt auf `main` von github.com/Giorgio089/ai-consultant (PR #18 Crawler-Check, PR #20 Release 0.2.0).
- **Chrome:** `permissions: activeTab, scripting, storage`, **keine `host_permissions` mehr**
  (`extension/manifest.chrome.json`). Der Fetch zum Worker ist damit ein normaler Cross-Origin-Request und
  hängt vollständig an CORS (2.4).
- **Firefox:** `strict_min_version 140.0`, `gecko_android.strict_min_version 142.0` (Firefox für Android),
  `data_collection_permissions: required ["none"], optional ["browsingActivity"]`. Beim ersten Klick auf
  „Call the detective" fragt Firefox mit eigenem Dialog; wer ablehnt, sendet nichts.
- Der Audit läuft lokal auf dem **gerenderten** DOM. Gesendet werden nur die URL und die Länge von
  `document.body.innerText` (Whitespace kollabiert, getrimmt), und nur nach Klick.
- Der API-Key liegt unverschlüsselt in `storage.local` (`apiKey`) und lässt sich per „Forget API key" löschen.
- Neues Popup-Design im Noir/Amber-Stil der Website, neue Icons (Data-Detective-Logo).
- Tests mit `node --test`, darunter ein linkedom-Test der Engine (`tests/runAudit.test.mjs`, „worker runtime").

## 2. API-Vertrag (verbindlich)

Quellen: `extension/lib/detective.js` und `renderBotView` in `extension/popup.js`. Bitte nicht brechen.

### 2.1 Request

```http
POST /api/clue/bot-view
Authorization: Bearer <apiKey>
Content-Type: application/json

{"url":"https://example.com/post","rendered":{"textLength":4821}}
```

- `rendered` fehlt, wenn die Länge 0 oder unbekannt ist.
- **apiBase-Allowlist** (`normalizeApiBase`): nur `https://datadetective.app` (ohne Port und Pfad) oder
  `http://localhost:<port>` bzw. `http://127.0.0.1:<port>` (Port Pflicht). Alles andere fällt auf
  Produktion zurück. `wrangler dev` auf 8787 funktioniert, im Popup-DevTools:
  `chrome.storage.local.set({apiBase:'http://localhost:8787'})`.

### 2.2 Erfolgsantwort (200)

Die Extension akzeptiert 200 **nur**, wenn `content-type` „json" enthält **und** der Body ein Objekt mit
`findings`-Array ist. `bots` ist optional, muss aber ein Array sein, wenn es vorhanden ist. Sonst erscheint
„Unexpected answer from datadetective.app." Gelesen werden nur diese Felder; zusätzliche Felder sind erlaubt:

```json
{
  "findings": [{"severity": "critical", "message": "AI search crawlers are blocked …"}],
  "rawVisibilityRatio": 0.42,
  "bots": [{
    "token": "GPTBot", "operator": "OpenAI", "purpose": "training",
    "robots": {"allowed": false, "rule": "Disallow: /"},
    "fetch": {"tested": true, "status": 200, "blocked": false, "textLength": 2010, "error": null}
  }],
  "caveat": "Tested with the crawler's user agent only …"
}
```

- `severity`: `critical` → rot, `warning` → gelb, alles andere grün. Label ist die Severity mit großem
  Anfangsbuchstaben (Default `note`). Bei leerem `findings` zeigt die Extension „Nothing suspicious".
- `rawVisibilityRatio`: Zahl von 0 bis 1; ab 0.7 grün, ab 0.3 gelb, darunter rot. Fehlt sie, entfällt die Zeile.
- `robots.allowed`: `true | false | null` (null = unbekannt, z. B. wenn robots.txt nicht abrufbar ist).
- `fetch.tested: false` wird als „robots.txt token only" angezeigt (Google-Extended).
- **Messgleichheit:** Die gerenderte Länge kommt aus `innerText`, kollabiert. Damit die Ratio stimmt, sollte
  der Worker die rohe Länge gleich normalisieren (Engine: sichtbarer Text ohne
  script/style/noscript/template/svg). Bitte auch prüfen, ob die Ratio auf 1 gekappt wird.

### 2.3 Fehler

| Status | Extension zeigt | Body |
|---|---|---|
| 401 | „This API key is not valid." + Key-Feld | egal |
| 402 | `body.message` (max. 300 Zeichen), sonst „An API key is required." + Key-Feld | JSON mit `message` empfohlen |
| 429 | „Too many requests, try again in a minute." | egal |
| sonst | `body.message` oder „datadetective.app answered <status>." | JSON optional |

Nicht-JSON-Fehlerseiten (z. B. Cloudflare-HTML) werden toleriert. Netzwerkfehler führen zu „Could not reach
datadetective.app (…)". **Ein CORS-Fehler sieht für die Extension genauso aus.**

### 2.4 CORS (kritisch, nicht regressieren)

Weil Chrome keine `host_permissions` mehr hat, braucht **jede** Antwort CORS-Header für die Origins
`chrome-extension://<id>` und `moz-extension://<uuid>`. Die Firefox-UUID ist pro Installation zufällig,
deshalb nach Schema prüfen, nicht nach ID.

- Preflight `OPTIONS /api/clue/bot-view` → 204 mit `Access-Control-Allow-Origin` (Origin spiegeln),
  `Access-Control-Allow-Methods: POST, OPTIONS`, `Access-Control-Allow-Headers: authorization, content-type`,
  sinnvollerweise `Access-Control-Max-Age: 86400` und `Vary: Origin`.
- **Auch auf 401/402/429/5xx** und auf Fehlern aus Middleware (Rate Limiter, Exceptions). Sonst zeigt die
  Extension „Could not reach" statt der echten Meldung.
- In Georgs Test funktioniert es, CORS ist also vorhanden. Bitte Worker-Tests ergänzen: OPTIONS mit beiden
  Origin-Schemata sowie 401, 402 und 429, jeweils mit `Access-Control-Allow-Origin`.

### 2.5 Timeouts

Das Client-Timeout liegt bei **45 s** (`DEFAULT_TIMEOUT_MS`). 6 Crawler × bis zu 10 s nacheinander wären bis
zu 60 s, plus robots.txt. Empfehlung: Abrufe parallel (`Promise.allSettled`), Gesamtbudget ~25 s per
`AbortSignal`, und Bots, die nicht fertig werden, mit `fetch.error: "timeout"` melden, statt die ganze
Antwort zu verlieren. **Erst nach erfolgreicher Antwort abrechnen**, bei Timeout nicht.

### 2.6 Idempotenz

Der Client sperrt Doppelklicks synchron. Trotzdem serverseitig absichern, damit niemand doppelt zahlt:
gleicher Key-Hash und gleiche URL innerhalb von ~10 s → gespeichertes Ergebnis zurückgeben, kein zweiter
`usage`-Eintrag. Alternativ oder zusätzlich ein optionaler `Idempotency-Key`-Header. Die Extension sendet ihn
heute nicht; falls gewünscht, kommt er in 0.3 und muss dann in `Access-Control-Allow-Headers` stehen.

## 3. Engine-Sync (Schema 0.1 → 0.2)

### 3.1 Dateien

`extension/audit/runAudit.js` und `extension/audit/schema.js` (Stand `c743628`) 1:1 nach `src/audit/`
kopieren. Die bisherige Kopie stammt von `bfb6b2f` (Schema 0.1). Die Engine nutzt nur Standard-DOM-APIs
(`querySelector(All)`, `getAttribute`, `textContent`, `cloneNode`, `remove`). Dass linkedom dieselben
Ergebnisse wie jsdom liefert, ist im Extension-Repo getestet.

### 3.2 Shape-Diff

API:
- `checkBasicSEO(doc, url?)`: neuer zweiter Parameter für den Canonical-Vergleich; `runAudit(html, doc, url)`
  reicht ihn durch.
- Neue Exporte: `detectFramework(html)`, `extractJsonLdTypes(data)`, `THIN_TEXT_THRESHOLD` (200).
- `schemaVersion: "0.2"`.

Neue bzw. geänderte Felder:
- `basicSEO.robots`: `exists, content, noindex, nosnippet, maxSnippet, dataNosnippetCount, status, recommendation`
- `basicSEO.canonical`: `exists, count, href, absolute, pointsElsewhere, status, recommendation`
- `basicSEO.lang`: `exists, value, hreflangCount, recommendation`
- `basicSEO.headingStructure`: `count, skips[{from,to}], optimal, recommendation`
- `basicSEO.images`: `total, missingAlt, ratio, optimal, recommendation`
- `llmReadability`: neu `mainContentLength` (null ohne main/article/[role=main]), `externalScriptCount`,
  `thinContent`, `appShell`. `textContentLength` misst jetzt nur **sichtbaren** Text, `scriptContentLength`
  zählt JSON-LD nicht mehr mit, `frameworkName` ist konkret (Next.js, Nuxt, React …).
- `structuredData.jsonLd`: neu `validCount` und `empty`. Neu sind außerdem
  `requiredFields {checked, issues[{type, missing[]}]}` (Article/NewsArticle/BlogPosting, Organization,
  Product, FAQPage) und `authorDate {datePublished, dateModified, author, hasDate, hasAuthor}`.

### 3.3 Score-Gewichte

| Kategorie | 0.1 | 0.2 |
|---|---|---|
| Basic SEO | 40 (title/desc/h1/h2 je 10/5) | **45**: zusätzlich robots 2/1/0, canonical 2/1, lang 1 |
| LLM-Readability | 30 | 30: App-Shell 0, JS-heavy 15 (> 500 Zeichen) sonst 0, Thin 10, sonst 30 |
| Structured Data | 30 (JSON-LD 15, OG 10, Twitter 5) | **25**: valides JSON-LD 10, Pflichtfelder komplett 3, Autor 1, Datum 1, OG 8, Twitter 2 |

Folgen:
- Der Gratis-Audit zeigt andere Scores. **„100/100 auf allen eigenen Seiten" nach dem Sync neu prüfen.**
  Kritisch sind: absolute Canonical, `lang`, Autor und Datum (JSON-LD oder Meta), Pflichtfelder.
  `FAQPage` braucht `mainEntity` mit `@type: Question` und `acceptedAnswer`. `WebApplication`, `WebSite` und
  `Person` werden nicht auf Pflichtfelder geprüft.
- Website-UI des Gratis-Audits: neue Felder bei Bedarf anzeigen (robots, canonical, lang, Heading-Sprünge,
  Alt-Texte, App-Shell, Pflichtfelder, Autor/Datum). Mindestens die Maxima nicht hart als 40/30/30 kodieren,
  sondern `maxScore` aus der Antwort lesen.
- Worker-Tests mit festen Score-Erwartungen anpassen.

### 3.4 Mittelfristig: ein gemeinsames Paket

Die doppelte Kopie ist fehleranfällig. Optionen: npm-Workspace, Git-Submodule oder Veröffentlichung als
`@leanplugins/geo-audit`. Bis dahin ein Sync-Check: ein Skript vergleicht die SHA-256 von `src/audit/*.js`
mit einer im Repo notierten Referenz (Extension-Commit + Hashes) und lässt `npm test` bei Abweichung fehlschlagen.

## 4. Website-Anpassungen

### 4.1 /privacy

Die Seite muss die Extension vollständig abdecken. Der Chrome Web Store verlangt eine Datenschutz-URL, die
auch die Extension beschreibt; dieselbe URL dient für AMO.
- Der Audit läuft lokal. An datadetective.app gehen nur URL und Länge des sichtbaren Texts (eine Zahl),
  nur nach Klick auf „Call the detective", zusammen mit dem API-Key.
- Der API-Key liegt lokal und **unverschlüsselt** in `storage.local` und lässt sich mit „Forget API key" löschen.
- Firefox: optionale Datenkategorie `browsingActivity` mit eigenem Zustimmungsdialog; ohne Zustimmung keine
  Übertragung. Firefox Desktop ab 140, Firefox für Android ab 142.
- Was der Worker speichert (`usage`: Produkt, Preis, Ziel-URL, Zeitpunkt; Key nur als Hash) und wie lange.
- Keine Analytics, keine Übertragung im Hintergrund.

### 4.2 Extension-Sektion

- Links: AMO `https://addons.mozilla.org/addon/geo-page-audit/`, Chrome Web Store „soon" (Link folgt).
- Neue Screenshots im neuen Design: Die Assets kommen nach `docs/store/chrome-web-store/` im Extension-Repo
  (der Ordner existiert noch nicht).
- Unterstützte Browser nennen: Chrome, Firefox Desktop 140+, Firefox für Android 142+.

### 4.3 Design-Konsistenz

Die Extension übernimmt die Tokens der Website (`extension/popup.css`): `--bg #0e0d0b`, `--surface #171512`,
`--surface-2 #1f1c18`, `--border #2e2a24`, `--text #ece6da`, `--muted #a39b8c`, `--accent #e8b44c`,
`--good #7fcf9a`, `--warn #e8b44c`, `--bad #ef7d6d`, `--radius-sm 6px`, `--radius 8px`, Serif
„Iowan Old Style"/Palatino. Ändert sich die Website, diese Werte mitziehen oder hier melden.

## 5. Vorbereitung für Extension 0.3 (Vorschläge, nicht verbindlich)

Geplant für 0.3: lokaler Roh-vs-gerendert-Diff mit Overlay, Side Panel, Markdown-Export, Anzeige von
Credits und Key-Status, Deep Link auf den Fall, kostenloser llms.txt/robots-Check. Dafür bräuchte die
Extension vom Worker (CORS jeweils wie in 2.4):

**a) `GET /api/balance`** (Auth wie oben)
```json
{"keyLabel":"georg-extension","credits":87,"unit":"credit","priceList":{"bot-view":1},"topUpUrl":"https://datadetective.app/#pricing"}
```
401 bei ungültigem Key. Solange es kein Guthaben gibt: `credits: null` plus `usedThisMonth`.

**b) Case-ID in jeder Clue-Antwort:** `"caseId":"c_01J…","caseUrl":"https://datadetective.app/case/c_01J…"`
für den Link „Open full case on datadetective.app". Die Fallseite braucht eine nicht ratbare ID und ein
Ablaufdatum.

**c) `GET /api/check/ai-policy?url=`** (gratis, ohne Key, Rate Limit wie `/api/audit`)
```json
{"origin":"https://example.com",
 "llmsTxt":{"exists":true,"status":200,"bytes":1840,"valid":true,"issues":[]},
 "robotsTxt":{"status":200,"bots":[{"token":"GPTBot","allowed":false,"rule":"Disallow: /"}]},
 "contentSignals":{"search":"yes","ai-input":"yes","ai-train":"no"},
 "xRobotsTag":"noai","metaRobots":"index, follow"}
```

**d) Optional, mit Zustimmung: Snapshot** `{"headings":["h1:…","h2:…"],"textHash":"sha256:…"}` im
Bot-View-Request für einen besseren Diff, ohne Volltext. Das erfordert in Firefox zusätzlich die
Datenkategorie `websiteContent` und eine Erweiterung von /privacy.

## 6. Produkt-Empfehlungen

- **llms.txt & AI-Policy kostenlos** statt ~2 ct: llms.txt hat in der Praxis wenig nachweisbare Wirkung, und
  Lighthouse prüft es seit 2026 gratis. Als Lead-Magnet zusammen mit meta robots, `X-Robots-Tag` und Content
  Signals anbieten (5c).
- **Positionierung:** „So sieht dich GPTBot – belegt" statt „raw vs rendered". Den lokalen Diff zeigen
  Konkurrenten bereits; der Beleg ist der echte Abruf je Crawler plus robots.txt.
- **Case report** für 25 ct wie geplant, mit Deep Link (5b).
- **Citation Check:** Preis an die Anzahl der Prompts koppeln, nur offizielle APIs nutzen, harte
  Kostenobergrenze pro Aufruf.
- **Bezahlung:** Stripe-Guthabenpakete (z. B. 5 € = 100 Credits), weil Stripe-Gebühren Einzelzahlungen unter
  ~50 ct unwirtschaftlich machen. x402 später.
- **Recht und Betrieb** (stehen schon im Projekt-Dokument): AGB und Widerrufsrecht für digitale Leistungen
  vor echtem Geld klären; OSS-Umsatzsteuer für EU-Privatkunden.

## 7. Offene Fragen

1. Wird `rawVisibilityRatio` auf 1 gekappt, und normalisiert der Worker die rohe Textlänge wie `innerText`?
2. Schreibt der Worker bei Timeout oder 5xx heute einen `usage`-Eintrag, wird also abgerechnet?
3. Liefern der Rate Limiter und jede Exception CORS-Header mit?
4. Welche Ablaufzeit und Sichtbarkeit sollen Fallseiten (5b) haben?
5. Gemeinsames Engine-Paket: npm-Workspace, Submodule oder `@leanplugins/geo-audit` auf npm?
6. Soll die Extension in 0.3 einen `Idempotency-Key` senden, oder reicht serverseitiges Dedupe?
