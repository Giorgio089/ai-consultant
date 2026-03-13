# Firefox Extension Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Die bestehende Chrome-Extension als Firefox-kompatible Extension mit gemeinsamer Codebasis, browser-spezifischen Manifesten und AMO-tauglichem Packaging bereitstellen.

**Architecture:** Die gemeinsame Runtime-Logik bleibt in `extension/`. Browser-Unterschiede werden in einem kleinen API-Wrapper und in getrennten Manifestdateien gekapselt. Ein Packaging-Skript erzeugt daraus browser-spezifische Release-Artefakte fuer Chrome und Firefox.

**Tech Stack:** Vanilla JavaScript, WebExtensions Manifest V3, Node.js fuer Packaging-Skripte, Mozilla Add-ons kompatible Metadaten

---

### Task 1: Browser API kapseln

**Files:**
- Create: `extension/lib/browserApi.js`
- Modify: `extension/popup.js`
- Test: `tests/browserApi.test.mjs`

**Step 1: Write the failing test**

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';

test('getBrowserApi prefers browser and falls back to chrome', async () => {
  globalThis.browser = { tabs: {}, scripting: {} };
  globalThis.chrome = { tabs: { legacy: true }, scripting: { legacy: true } };

  const { getBrowserApi } = await import('../extension/lib/browserApi.js');

  assert.equal(getBrowserApi(), globalThis.browser);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/browserApi.test.mjs`
Expected: FAIL because `extension/lib/browserApi.js` does not exist yet.

**Step 3: Write minimal implementation**

```javascript
export function getBrowserApi() {
  if (globalThis.browser) return globalThis.browser;
  if (globalThis.chrome) return globalThis.chrome;
  throw new Error('Browser extension API is not available.');
}
```

Erweitere danach `popup.js`, damit `tabs.query()` und `scripting.executeScript()` ueber dieses Modul laufen.

**Step 4: Run test to verify it passes**

Run: `node --test tests/browserApi.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add extension/lib/browserApi.js extension/popup.js tests/browserApi.test.mjs
git commit -m "feat: add browser api compatibility layer"
```

### Task 2: Browser-spezifische Manifeste einfuehren

**Files:**
- Create: `extension/manifest.chrome.json`
- Create: `extension/manifest.firefox.json`
- Modify: `extension/manifest.json`
- Test: `tests/manifest.test.mjs`

**Step 1: Write the failing test**

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('firefox manifest includes gecko id and data collection declaration', async () => {
  const raw = await fs.readFile(new URL('../extension/manifest.firefox.json', import.meta.url), 'utf8');
  const manifest = JSON.parse(raw);

  assert.ok(manifest.browser_specific_settings?.gecko?.id);
  assert.ok(Array.isArray(manifest.data_collection_permissions));
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/manifest.test.mjs`
Expected: FAIL because the Firefox manifest does not exist yet.

**Step 3: Write minimal implementation**

Erstelle zwei Manifestdateien mit identischen Kernfeldern. Fuege im Firefox-Manifest zusaetzlich `browser_specific_settings` und `data_collection_permissions` hinzu. Entscheide anschliessend, ob `extension/manifest.json` als Chrome-Default bestehen bleibt oder durch eine generierte Datei ersetzt wird.

**Step 4: Run test to verify it passes**

Run: `node --test tests/manifest.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add extension/manifest.json extension/manifest.chrome.json extension/manifest.firefox.json tests/manifest.test.mjs
git commit -m "feat: add browser-specific extension manifests"
```

### Task 3: Packaging fuer Chrome und Firefox erstellen

**Files:**
- Create: `scripts/package-extension.mjs`
- Create: `dist/.gitkeep`
- Test: `tests/package-extension.test.mjs`

**Step 1: Write the failing test**

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

test('packaging script creates firefox manifest in dist target', async () => {
  await execFileAsync('node', ['scripts/package-extension.mjs', '--browser=firefox']);
  const manifest = JSON.parse(await fs.readFile('dist/firefox/manifest.json', 'utf8'));
  assert.ok(manifest.browser_specific_settings?.gecko?.id);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/package-extension.test.mjs`
Expected: FAIL because the packaging script does not exist yet.

**Step 3: Write minimal implementation**

Implementiere ein Node-Skript, das:

- den gemeinsamen Extension-Inhalt nach `dist/chrome/` bzw. `dist/firefox/` kopiert
- das jeweilige Manifest als `manifest.json` schreibt
- optionale ZIP-Erzeugung vorbereitet oder direkt mitliefert, wenn das ohne zusaetzliche Abhaengigkeiten schlank bleibt

**Step 4: Run test to verify it passes**

Run: `node --test tests/package-extension.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/package-extension.mjs dist/.gitkeep tests/package-extension.test.mjs
git commit -m "feat: add browser packaging workflow"
```

### Task 4: Dokumentation fuer Firefox und AMO aktualisieren

**Files:**
- Modify: `README.md`
- Optionally Create: `docs/release/firefox-amo.md`
- Test: `README.md` manual review

**Step 1: Write the failing test**

Definiere die fehlende Dokumentation als Akzeptanzkriterien:

- Firefox lokale Installation ist dokumentiert
- Packaging-Befehl ist dokumentiert
- AMO-relevante Angaben wie Gecko-ID und Datenangabe sind beschrieben

**Step 2: Run test to verify it fails**

Run: `rg -n "Firefox|Mozilla Add-ons|package-extension|gecko" README.md docs`
Expected: Fehlende oder unvollstaendige Firefox-/AMO-Dokumentation.

**Step 3: Write minimal implementation**

Ergaenze die README um:

- gemeinsames Entwicklungsmodell
- Firefox-Load-temporary-Anleitung
- Packaging-Schritte
- Hinweis auf AMO-Releaseanforderungen

**Step 4: Run test to verify it passes**

Run: `rg -n "Firefox|Mozilla Add-ons|package-extension|gecko" README.md docs`
Expected: Die neuen Abschnitte sind auffindbar.

**Step 5: Commit**

```bash
git add README.md docs/release/firefox-amo.md
git commit -m "docs: add firefox packaging and amo release guidance"
```

### Task 5: End-to-end verifizieren

**Files:**
- Use existing runtime files in `extension/`
- Use generated artifacts in `dist/`

**Step 1: Write the failing test**

Definiere die Verifikationsmatrix:

- `node --test` laeuft gruen
- Chrome-Paket wird erzeugt
- Firefox-Paket wird erzeugt
- Firefox-Extension laesst sich manuell laden
- Seitenanalyse, Ergebnisanzeige und Copy-JSON funktionieren in Firefox

**Step 2: Run test to verify it fails**

Run: `node --test`
Expected: FAIL, bis alle vorherigen Aufgaben umgesetzt sind.

**Step 3: Write minimal implementation**

Kein neuer Produktionscode. Fuehre Packaging und manuelle Browser-Pruefung durch, dokumentiere dabei erkannte Restpunkte.

**Step 4: Run test to verify it passes**

Run:

```bash
node --test
node scripts/package-extension.mjs --browser=chrome
node scripts/package-extension.mjs --browser=firefox
```

Expected: Alle automatisierten Checks gruen, Distributionsordner vorhanden.

**Step 5: Commit**

```bash
git add .
git commit -m "chore: verify firefox extension release flow"
```
