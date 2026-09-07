# Centre Remix — CALL-E demo script (~3 min)

Faceless screen recording. No face cam. No FLNT. Use SAMPLE data only. **Keep dry_run on** — do not place a live call in this video.

**Live URL:** https://ornate-pie-10561d.netlify.app  
**Target length:** ~2:45–3:15  
**On-screen:** browser only (full window). Optional quiet UI clicks; narration as VO or burnt-in captions.

---

## Shot list + narration

### 0:00–0:20 — Hook + board
**Do:** Open the live app. Let the Harbour Place floor plan settle. Pan once over the tiles so SAMPLE shops are readable. Point at the SAMPLE stamp / banner.

**Say:**  
Centre Remix is a leasing board for Harbour Place — a fictional shopping centre. Humans and agents share the same live page. Australian centres are already near full. The job is remix: who should replace whom.

---

### 0:20–0:50 — Human path: inspect + remix
**Do:** Click **HP-09 Lumen Studio**. Show inspector (category, rent, expiry, band D). Propose remix to **Health** with a one-line rationale. Show hatched overlay + pending Accept/Reject. **Reject** once (overlay clears). Propose again, then **Accept**. Show tenant update. Click **Undo last applied** so the sitting tenant returns.

**Say:**  
Click a shop, propose a remix overlay, accept or reject. Nothing sticks until a human commits. Undo brings the sitting tenant back.

---

### 0:50–1:25 — Agent path without ChatGPT
**Do:** Open **Simulate agent**. Run in order:
1. `summarise_mix`
2. `set_expiry_window` with `months: 6`
3. `list_tenants` with `category: fashion` (plan dims)
4. `draft_outreach` for HP-09, audience `landlord` (letter stays on page)

Show the activity log rows tagged `sim`.

**Say:**  
Eleven tools hit the same UI the human sees. Simulate agent calls those tools so judges can demo without ChatGPT. Filters dim the plan. Outreach drafts stay on the page — nothing is emailed.

---

### 1:25–2:25 — CALL-E dry-run (core of submission)
**Do:** Stay on HP-09. In the inspector CALL panel (or Simulate `place_tenant_call`):
- Phone: `+15550100100` (SAMPLE)
- Goal: short leasing line, e.g. Confirm interest in discussing a Health tenancy at HP-09.
- Leave **dry_run checked / true**
- Click **Confirm and call** (or run Simulate with dry_run true)

Show: fixture `last_call` on the shop, activity log row, badge like Call dry-run. **No live dial.**

Optional 5s: flash the Netlify function name `place-call` in repo / Network tab only if a dry-run POST returns a fixture — still no live CALL-E dial.

**Say:**  
Outbound tenant calls go through CALL-E behind a thin Netlify wrap. Tool name: place_tenant_call. Dry-run is the default. The agent stages a preview; a human must Confirm and call. With dry_run on, you get a fixture result and no network dial — safe for demos and CI.

---

### 2:25–2:50 — Live path (narrate only — do not dial)
**Do:** Briefly show the dry_run checkbox / README CALL-E section (or env note). Do **not** uncheck dry_run. Do **not** enter a real key on camera.

**Say:**  
Live dials are opt-in: dry_run false, human confirm, and CALLE_API_KEY set in Netlify env — never in the repo. This demo stays dry-run.

---

### 2:50–3:10 — Close
**Do:** Return to the full floor plan. End on the live URL in the address bar.

**Say:**  
Centre Remix: SAMPLE leasing board, WebMCP tools, and a consent-gated CALL-E path with dry-run by default. Repo and live app are in the Devpost submission. Thanks.

---

## Recording checklist

- [ ] Public link works cold (incognito)
- [ ] SAMPLE stamp visible early
- [ ] dry_run stays true for the call beat
- [ ] No secrets, no real tenant phones, no live dial
- [ ] Captions or clear VO; faceless
- [ ] Upload public video; paste URL on Devpost
