# Awesome Phone Call Agents — PR draft (Centre Remix)

Upstream: https://github.com/CALLE-AI/awesome-phone-call-agents  
Target section: `apps/` (user-facing / runnable app)  
Suggested folder: **`apps/web/centre-remix`** (vanilla HTML/CSS/JS + Netlify Function; matches `apps/web/` peers like `local-atlas`)

Do **not** push from this box unless explicitly asked. Use this draft when opening the PR.

Matched upstream templates from README + CONTRIBUTING.md:
- App dir: `apps/<runtime>/<app-name>/`
- README bullet: `- [Name](url) - factual one-liner`
- Apps must document setup, side effects, credentials, dry-run
- Branch: `feat/<short-kebab-summary>`; commit Conventional Commits
- Validate: `python3 scripts/validate_repository.py`

---

## Suggested branch

```text
feat/apps-web-centre-remix
```

---

## PR title

```text
feat(apps): add centre-remix Harbour Place leasing board with CALL-E dry-run
```

---

## PR body (paste)

```markdown
## Summary

Adds **Centre Remix**, a SAMPLE shopping-centre leasing board where humans and agents share one live page. Agents can filter tenancies, propose remix overlays, draft on-page outreach, and stage outbound tenant calls via CALL-E.

- **Live:** https://ornate-pie-10561d.netlify.app
- **Source:** https://github.com/OCnew-ops/centre-remix
- **Suggested path:** `apps/web/centre-remix` (pointer README + list/table entries)

## Why it fits

- Runnable user-facing app for an AI-agent phone-call workflow (`place_tenant_call`)
- **Dry-run / fixture by default** — no credentials required to try the board
- Live dial is opt-in: human **Confirm and call**, `dry_run: false`, and `CALLE_API_KEY` in Netlify env only
- Never auto-dials; Simulate agent refuses live dials
- Fictional SAMPLE phones/tenants only; no secrets in repo

## Side effects

| Path | Behaviour |
| --- | --- |
| Default / missing key / function unavailable | Fixture `last_call` only — no network dial |
| `dry_run: true` + Confirm | Fixture via Netlify `place-call` or client fallback |
| `dry_run: false` + Confirm + `CALLE_API_KEY` | Live CALL-E outbound (opt-in) |

Cancellation / rollback: remix overlays are rejectable; applied remixes undo via `undo_last`. Calls are one-shot (no recurring scheduler in this app).

## Checklist

- [x] English-only repository-facing content
- [x] No secrets / private phones / personal data
- [x] Host + provider clear (static Netlify web app + CALL-E via `@call-e/calle`)
- [x] Side effects documented
- [x] Setup / usage in app README
- [x] Dry-run / no-call path by default
- [ ] `python3 scripts/validate_repository.py` (run in awesome-phone-call-agents clone before merge)

## README changes

1. Bullet under **Apps** (awesome-list style)
2. Row in the runnable apps table
3. Thin `apps/web/centre-remix/README.md` pointing at live URL + upstream repo (setup, side effects, dry-run, credentials)

## Demo

~3 min public screen recording (faceless): board → simulate tools → `place_tenant_call` dry-run. Script: see submitting project `call-e-submit/DEMO_SCRIPT.md`.
```

---

## README list entry (bullet — ### Apps)

```markdown
- [Centre Remix](https://github.com/OCnew-ops/centre-remix) - SAMPLE Harbour Place leasing board where agents share the live floor plan, stage CALL-E tenant outreach with `place_tenant_call`, and default to dry-run fixtures until a human confirms a live dial. [Live](https://ornate-pie-10561d.netlify.app)
```

Alternate (folder-relative once the pointer lands):

```markdown
- [Centre Remix](apps/web/centre-remix/) - SAMPLE Harbour Place leasing board with WebMCP tools and a CALL-E dry-run wrap (`place_tenant_call`); live dial only after human confirm + `CALLE_API_KEY`. [Live](https://ornate-pie-10561d.netlify.app)
```

---

## Apps table row

```markdown
| [`apps/web/centre-remix`](apps/web/centre-remix/) | JavaScript / Node | SAMPLE shopping-centre leasing board: humans and agents share one floor plan; `place_tenant_call` stages CALL-E tenant outreach with dry-run fixtures by default, human Confirm before POST, and opt-in live dials when `CALLE_API_KEY` is set on Netlify. |
```

---

## Minimal `apps/web/centre-remix/README.md` sketch (for the PR tree)

~~~~markdown
# Centre Remix

SAMPLE leasing board for Harbour Place (fictional shopping centre). Humans and AI agents share the same live page; outbound tenant calls use CALL-E behind a Netlify Function.

- **Live:** https://ornate-pie-10561d.netlify.app
- **Repository:** https://github.com/OCnew-ops/centre-remix
- **License:** MIT

## Phone-call workflow

Tool: `place_tenant_call` (WebMCP + Simulate agent + inspector Confirm UI).

- **Default:** `dry_run: true` → fixture `last_call`, no dial
- **Never auto-dials:** agent stages preview; human must Confirm and call
- **Live (opt-in):** `dry_run: false` + Confirm + `CALLE_API_KEY` in Netlify env (not in git)
- **Simulate agent:** dry-run only (refuses live dial)

Function: `netlify/functions/place-call.js` (CORS, confirm gate, E.164-ish phone check, dry-run fixture, optional live SDK path).
~~~~

## Notes for submitter

- Prefer apps/web/centre-remix over apps/typescript (vanilla JS + Netlify).
- Keep descriptions factual.
- On Devpost: CALL-E account email + public demo video + PR link.
