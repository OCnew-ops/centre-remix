# Centre Remix — Devpost form copy (CALL-E)

Hackathon: https://call-e.devpost.com/ · Deadline ~14 Sep 11:45pm SGT  
Product: Harbour Place SAMPLE leasing board · faceless demo · no FLNT

**Links to paste**
- Live: https://ornate-pie-10561d.netlify.app
- Repo: https://github.com/OCnew-ops/centre-remix
- Awesome PR: file against https://github.com/CALLE-AI/awesome-phone-call-agents (draft in AWESOME_PR.md)
- Demo video: public YouTube/Drive after recording (use DEMO_SCRIPT.md)
- CALL-E account email: your account email on the Devpost form

---

## Elevator (1–2 sentences)

Centre Remix is a SAMPLE shopping-centre leasing board where humans and agents share one live floor plan. Agents can remix tenancies on the page and stage outbound tenant calls through CALL-E — dry-run by default, live only after human confirm plus an API key.

---

## The problem

Shopping centres run near full occupancy. Leasing work is remix (who replaces whom), not filling empty boxes — but the tools live in spreadsheets and back-office systems agents cannot safely act on. Phone outreach to sitting or incoming tenants is high-stakes: easy to dial the wrong number, skip consent, or hide side effects from the human who owns the asset.

---

## The solution

A single-page Harbour Place SAMPLE board (vanilla HTML/CSS/JS on Netlify) registers narrow tools for the same UI a leasing manager sees: filter tenants, focus shops, propose/accept/reject remix overlays, draft on-page outreach, and place_tenant_call.

CALL-E sits behind a thin Netlify Function (place-call). Dry-run is the default (fixture last_call, no dial). Live calls require explicit dry_run false, human Confirm and call, and CALLE_API_KEY in Netlify env — never committed to git. The Simulate agent panel demos the same tools without ChatGPT and refuses live dials.

---

## How it works

1. Open the live board — 24 SAMPLE shops, floor plan, inspector, activity log.
2. Human or agent proposes a remix overlay; Accept commits, Reject clears, Undo reverts.
3. Agent/tool stages place_tenant_call with shop, SAMPLE E.164 phone, and goal; UI shows a preview.
4. Human clicks Confirm and call with dry_run on → fixture result written to the shop (safe demo path).
5. Optional live path: dry_run off + CALLE_API_KEY on Netlify → CALL-E places the outbound call; still never auto-dialed.

Stack: static front end + Netlify Function + @call-e/calle. WebMCP registers the tools when the host supports document.modelContext.

---

## Built with

- CALL-E (@call-e/calle) via Netlify Function place-call
- Vanilla HTML / CSS / JavaScript
- Netlify (static hosting + functions)
- Optional WebMCP (document.modelContext.registerTool)
- SAMPLE data only (data/harbour-place.json)

---

## What’s included for judges

- Public live app (no login for the board)
- Dry-run CALL-E path by default — try without credentials
- ~3 min faceless public demo video (board → simulate → dry-run call)
- PR to CALLE-AI/awesome-phone-call-agents under apps/web/centre-remix
- CALL-E account email on this Devpost submission

---

## Safety (short)

Never auto-dials. Dry-run / missing key / missing function → fixture only. Live dials are opt-in and human-gated. Fictional SAMPLE phones and tenants. No secrets in the repository.
