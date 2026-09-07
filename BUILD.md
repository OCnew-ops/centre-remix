# Centre Remix — CALL-E dry-run wrap (build notes)

Scaffold finished 5 Sep 2026 (Australia/Sydney). Path: /workspace/centre-remix. Do not re-clone. Do not push unless asked.

## Files

- netlify/functions/place-call.js — OPTIONS CORS, confirm gate, E.164-ish phone, dry-run fixture, optional live path
- package.json — centre-remix + CALL-E SDK dependency
- netlify.toml — functions = netlify/functions
- js/app.js — place_tenant_call tool, inspector CALL panel, Simulate agent, client fixture fallback
- index.html — eleven tools banner copy
- css/app.css — call panel tweaks
- README.md — CALL-E section
- BUILD.md — this file

## Verify

```bash
node --check netlify/functions/place-call.js
node --check js/app.js
rg place_tenant_call js/app.js
rg "eleven tools|11 tools" index.html js/app.js README.md
python3 -m http.server 8765
```

Manual: HP-09 inspector CALL-E panel, phone +61400000000, dry_run on, Confirm and call. Expect last_call + activity log. No live dial.

## Gaps

- Live SDK not exercised against a real account in this dry-run scaffold.
- Static http.server uses client fixture (function 404).
- Keep dry_run true for demos.

Status: CALL-E dry-run scaffold complete (function + place_tenant_call UI); verified node --check + rg; no push, no live dials.

## Push / PR later

Branch e.g. calle-dry-run-wrap, add the files above, commit with no secrets, push and open PR when remote is ready.
