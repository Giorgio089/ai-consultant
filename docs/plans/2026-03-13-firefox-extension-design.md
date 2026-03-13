# Firefox Extension Design

**Date:** 2026-03-13

## Goal

Die bestehende Chrome-Extension soll als Firefox-kompatible WebExtension mit identischer Funktionalität bereitgestellt werden. Die Codebasis bleibt gemeinsam; browser-spezifische Unterschiede werden auf Manifeste, Packaging und eine kleine API-Kompatibilitätsschicht begrenzt.

## Current State

- Die Extension ist eine kleine Manifest-V3-WebExtension ohne Build-Step.
- Die Hauptlogik sitzt in [`extension/popup.js`](./../../extension/popup.js) und [`extension/audit/runAudit.js`](./../../extension/audit/runAudit.js).
- Die Analyse liest die bereits gerenderte Seite per `chrome.scripting.executeScript()` aus und verarbeitet das HTML im Popup.
- Das Background-Script ist aktuell nur ein minimaler Service-Worker-Platzhalter.

## Design Principles

- Eine gemeinsame Runtime-Codebasis bleibt die Quelle der Wahrheit.
- Browser-Unterschiede werden zentral gekapselt, nicht über die Fachlogik verteilt.
- Firefox-Releasefähigkeit fuer Mozilla Add-ons wird von Anfang an mit eingeplant.
- Es werden keine neuen Produktfeatures eingefuehrt; Ziel ist Funktionsparitaet.

## Proposed Architecture

### Shared Source

Die gemeinsamen Quelldateien bleiben in `extension/`:

- `popup.html`, `popup.css`, `popup.js`
- `audit/runAudit.js`, `audit/schema.js`
- `background.js`
- `icons/*`

Diese Dateien sollen sowohl fuer Chrome als auch fuer Firefox verwendet werden.

### Browser Compatibility Layer

Es wird ein kleines Modul eingefuehrt, das die Browser-API zentral aufloest:

- bevorzugt `globalThis.browser`, wenn vorhanden
- faellt sonst auf `globalThis.chrome` zurueck

Dieses Modul kapselt die verwendeten APIs:

- aktive Tabs lesen
- `scripting.executeScript()` ausfuehren

Dadurch bleibt `popup.js` funktional gleich, verwendet aber keine fest verdrahteten Chrome-Aufrufe mehr.

### Browser-Specific Manifests

Statt eines einzigen Manifests werden browser-spezifische Varianten gepflegt:

- `extension/manifest.chrome.json`
- `extension/manifest.firefox.json`

Chrome behaelt das bestehende Verhalten. Firefox erhaelt zusaetzlich:

- `browser_specific_settings.gecko.id`
- `browser_specific_settings.gecko.strict_min_version`, falls sinnvoll
- `data_collection_permissions`, damit die Einreichung fuer Mozilla Add-ons den aktuellen Anforderungen entspricht

Die restlichen Felder bleiben soweit wie moeglich deckungsgleich.

### Packaging

Ein kleines Packaging-Skript erzeugt aus der gemeinsamen Codebasis browser-spezifische Distributionsartefakte:

- ein Chrome-Paket
- ein Firefox-Paket

Dabei wird jeweils das passende Manifest in das Ausgabeziel geschrieben. So bleibt die Entwicklungsstruktur einfach, waehrend die Store-Artefakte sauber getrennt sind.

## Release Considerations

Firefox soll nicht nur lokal ladbar sein, sondern ueber Mozilla Add-ons veroeffentlicht werden. Deshalb beruecksichtigt das Design:

- stabile Gecko-ID
- Firefox-spezifisches Manifest
- reproduzierbare Paket-Erzeugung
- aktualisierte Doku fuer lokale Installation und AMO-Submission

## Testing Strategy

### Automated

- Tests fuer die Browser-Compat-Schicht
- Tests oder Checks fuer Manifest-/Packaging-Erzeugung

### Manual

Fuer Firefox muessen mindestens diese Flows verifiziert werden:

- Extension in Firefox laden
- aktive HTTP(S)-Seite analysieren
- Ergebnisse rendern
- JSON kopieren
- Fehlerfall auf nicht analysierbaren Seiten

Chrome soll anschliessend gegen dieselben Kernfaelle gegengeprueft werden, um Regressionen auszuschliessen.

## Non-Goals

- kein Redesign der Popup-Oberflaeche
- keine Erweiterung des Audit-Schemas
- kein Umbau auf komplexes Bundling oder Frameworks

## Recommendation

Empfohlen ist eine gemeinsame Codebasis mit:

- einem kleinen Browser-Compat-Modul
- zwei browser-spezifischen Manifesten
- einem leichten Packaging-Skript fuer Chrome und Firefox

Das bietet den besten Kompromiss aus geringer Komplexitaet, sauberer Release-Trennung und langfristig wartbarer Cross-Browser-Kompatibilitaet.
