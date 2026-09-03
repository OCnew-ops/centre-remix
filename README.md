# Centre Remix

A single-page leasing board for **Harbour Place**, a fictional shopping centre in Millers Reach, NSW. A human leasing manager and an AI agent share the same live page.

Australian centres already run at about 99% occupancy. The job is remix (who should replace whom), not filling empty shops.

All figures are **SAMPLE DATA**. Tenants, rents, expiries, and productivity bands are invented. They are not lease comps and they do not describe a real asset.

Copyright (c) 2026 Joseph Kalk. MIT License.

## Why WebMCP

WebMCP lets the page register real actions with `document.modelContext.registerTool`. The agent does not get a chatbot bolted onto a brochure. It gets the same board the human is looking at: filter the tenancy schedule, highlight a shop on the plan, drop an uncommitted remix overlay, draft a note that never leaves the page.

Tools run in this tab. There is no backend, no API key, and no login. If the human rejects a proposal, it never hits the sitting tenant.

## Humans vs agents

| | Human | Agent |
| --- | --- | --- |
| Floor plan | Click a shop tile | `focus_shop` / `get_shop` |
| Filters | Category, expiry window, rent band | `list_tenants`, `set_expiry_window` |
| Mix | Category bars and gap notes | `summarise_mix` |
| Remix | Propose from the inspector, Accept or Reject on the overlay | `propose_remix`, `apply_remix`, `reject_remix` |
| Letters | Draft outreach panel (copy only) | `draft_outreach` (does not send email) |
| Undo | Undo last applied | `undo_last` |

The Simulate agent panel in the sidebar calls the same JavaScript functions the WebMCP tools call, so a judge can demo the product without ChatGPT.

## What you will see

- Simplified floor plan of Harbour Place: 24 shops as tiles, north quay, atrium fountain, food court, cinema anchor.
- Each tile: fictional tenant, category, GLA, rent $/m2, lease expiry, sales productivity band (A to D).
- Remix proposals as hatched, uncommitted overlays until a human (or `apply_remix`) commits them.
- Activity log of every tool call, tagged agent / sim / human.
- Banner if `document.modelContext` is missing, pointing at the ChatGPT desktop in-app browser or Chrome 149+ with `chrome://flags/#enable-webmcp-testing`.

No iframes. Top-level page only. No FLNT, LeaseInfo, Accurait, or real retailers.

## Implementation

Vanilla HTML, CSS, and JavaScript. Sample centre lives in `data/harbour-place.json` and is also embedded so `index.html` still opens from disk.

Ten tools, snake_case names, narrow JSON Schema, `additionalProperties: false`. Each `execute` handler mutates or queries the live UI and returns:

```json
{ "content": [{ "type": "text", "text": "<json result>" }] }
```

| Tool | What it does on the page |
| --- | --- |
| `list_tenants` | Filters: `category`, `expiry_within_months`, `rent_band`. Dims non-matches. |
| `get_shop` | Full record by `shop_id`. Highlights the tile. |
| `focus_shop` | Pan and pulse-highlight. `readOnlyHint`. |
| `propose_remix` | Overlay: `shop_id`, `replacement_category`, `rationale`. |
| `apply_remix` | Commit by `proposal_id`. |
| `reject_remix` | Drop overlay by `proposal_id`. |
| `draft_outreach` | On-page letter for `landlord` or `tenant`. Never sends. |
| `set_expiry_window` | Visual filter by months (0 clears). |
| `summarise_mix` | Mix, expiries, gaps. `readOnlyHint`. |
| `undo_last` | Revert the last applied remix. |

Declarative HTML-form WebMCP is not used (unsupported in ChatGPT).

## Run locally

Open the file, or serve the folder.

```bash
# from this directory
python3 -m http.server 8765
```

Then open http://localhost:8765/

Or double-click `index.html`. The embedded sample data loads if `fetch` of the JSON is blocked on `file://`.

### Agent path

1. ChatGPT desktop in-app browser, **or**
2. Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled, then reload.

You should see the green **WebMCP live** banner and ten registered tools.

## Judge test steps

1. Open `index.html` (or the local server) in an ordinary browser. Confirm the missing-WebMCP banner, the SAMPLE stamp, and a finished floor plan of 24 shops.
2. Click **HP-09 Lumen Studio**. Confirm inspector fields, band D, expiry 31 Oct 2026.
3. Propose a remix to **Health** with a short rationale. Confirm the hatched overlay and a pending card with Accept / Reject.
4. Reject it. Confirm the overlay clears and the sitting tenant is unchanged.
5. Propose again, then Accept. Confirm the tenant becomes the SAMPLE incoming name and productivity is `new`.
6. Click **Undo last applied**. Confirm the previous tenant returns and the overlay is pending again.
7. In **Simulate agent**, run `summarise_mix`, then `set_expiry_window` with `months` set to 6, then `list_tenants` with `category` set to fashion. Confirm the plan dims and the activity log records `sim` rows.
8. Run `draft_outreach` for HP-09, audience `landlord`. Confirm a letter appears on the page and nothing is posted anywhere.
9. In a WebMCP-capable browser, confirm the banner turns live and an agent can call the same ten tools against the live UI.

## Five example agent prompts

1. "Harbour Place is full. Which shops expire in the next 6 months, and which of those are remix candidates rather than keepers?"
2. "Focus HP-09, then get the shop. Tell me why Lumen Studio should leave, using only the board data."
3. "Propose replacing HP-09 with a health tenancy. Rationale: fashion is already heavy, this shop is band D, and the lease ends October 2026. Do not apply it until I say so."
4. "Draft landlord outreach asking the Trust to accept that overlay. Keep it on the page. Do not send email."
5. "Summarise the category mix, set the expiry window to 12 months, and list F&B shops in the high rent band."

## Files

```
centre-remix/
  index.html
  css/app.css
  js/app.js
  js/data.js          embedded SAMPLE copy for file://
  data/harbour-place.json
  LICENSE
  README.md
```

Built for OpenAI's WebMCP Challenge. Fictional Harbour Place only.
