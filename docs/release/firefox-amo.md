# Firefox / Mozilla Add-ons Release Notes

## Packaging

Build the Firefox artifact with:

```bash
node scripts/package-extension.mjs --browser=firefox
```

The generated extension lives in `dist/firefox/` and uses `dist/firefox/manifest.json` as its release manifest.

## Firefox-Specific Metadata

- Gecko ID: `geo-page-audit@georgsimic.com`
- Minimum Firefox version: `121.0`
- `data_collection_permissions`: present as an explicit empty array
- `host_permissions`: intentionally omitted from the Firefox manifest

## Local Verification

1. Open `about:debugging#/runtime/this-firefox`.
2. Choose **Load Temporary Add-on**.
3. Select `dist/firefox/manifest.json`.
4. Verify page analysis, result rendering, and Copy JSON on an HTTP(S) page.

## AMO Submission Notes

- Upload the packaged Firefox build derived from `dist/firefox/`.
- Keep the Gecko ID stable across releases.
- Review Mozilla Add-ons disclosure requirements before submission, especially if data collection behavior changes in the future.
