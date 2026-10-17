# Firefox / Mozilla Add-ons Release Notes

## Packaging

Build the Firefox artifact with:

```bash
node scripts/package-extension.mjs --browser=firefox
```

The generated extension lives in `dist/firefox/` and uses `dist/firefox/manifest.json` as its release manifest.

## Firefox-Specific Metadata

- Gecko ID: `geo-page-audit@georgsimic.com`
- Minimum Firefox version: `140.0` (built-in data collection consent; required since 0.2.0)
- Firefox for Android: `gecko_android.strict_min_version` `142.0` (first Android version with `data_collection_permissions`). Tick "Android" as a compatible platform when submitting.
- `browser_specific_settings.gecko.data_collection_permissions.required`: `["none"]`
- `browser_specific_settings.gecko.data_collection_permissions.optional`: `["browsingActivity"]`,
  requested via `browser.permissions.request()` when the user clicks **Call the detective**
- `host_permissions`: intentionally omitted from the Firefox manifest

## Local Verification

1. Open `about:debugging#/runtime/this-firefox`.
2. Choose **Load Temporary Add-on**.
3. Select `dist/firefox/manifest.json`.
4. Verify page analysis, result rendering, and Copy JSON on an HTTP(S) page.
5. Click **Call the detective**: Firefox must show the data collection prompt; declining must keep everything local.

## AMO Submission Notes

- Upload the packaged Firefox build derived from `dist/firefox/`.
- Keep the Gecko ID stable across releases.
- Review Mozilla Add-ons disclosure requirements before submission, especially if data collection behavior changes in the future.

## Reviewer note (0.2.0)

The page audit runs locally. The optional AI Crawler Check sends only the active tab's URL and the
length of its visible text (an integer) to `https://datadetective.app/api/clue/bot-view`, together with
the user's own API key, and only after an explicit click plus Firefox's data collection consent.
The API key is stored in `storage.local`. No background transmission, no analytics.
