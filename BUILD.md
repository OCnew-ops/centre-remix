# Centre Remix — CALL-E honestly fake-only wrap (build notes)

Scaffold path: /workspace/centre-remix. Public demo never dials.

## Files

- netlify/functions/place-call.js — OPTIONS CORS, confirm gates fixture write only, allowlisted SAMPLE phones, masked phone in JSON, generic transcript. **No live @call-e/calle path.**
- package.json — centre-remix (SDK optional for private forks only; public function does not dial)
- netlify.toml — functions = netlify/functions
- js/app.js — place_tenant_call tool, inspector CALL panel, Simulate agent, client fixture fallback, phone mask
- index.html — eleven tools banner copy
- css/app.css — call panel tweaks
- README.md — honestly fake-only CALL-E section
- BUILD.md — this file

## Verify

```bash
node --check netlify/functions/place-call.js
node --check js/app.js
rg place_tenant_call js/app.js
rg "eleven tools|11 tools" index.html js/app.js README.md
rg "honestly fake-only|15550100100" README.md netlify/functions/place-call.js js/app.js
python3 -m http.server 8765
```

Manual: HP-09 inspector CALL panel, phone `+15550100100`, Confirm fixture. Expect masked last_call + activity log. No live dial.

## Gaps

- Public deployment is fixture-only by design (Ray-56).
- Static http.server uses client fixture (function 404).
- Live dials are out of scope for this public URL (private fork only, if ever).

Status: honestly fake-only public wrap complete; verified node --check + rg; no live dials.
