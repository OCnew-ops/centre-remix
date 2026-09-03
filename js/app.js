/* Centre Remix — Harbour Place
   Vanilla SPA. Humans and WebMCP agents share this live board. */
(function () {
  "use strict";

  const AS_AT = new Date("2026-08-30T00:00:00+10:00");
  const TZ = "Australia/Sydney";
  const CAT_ENUM = [
    "grocery", "fashion", "fnb", "health", "services", "jewellery",
    "homewares", "sport", "entertainment", "books", "kids", "beauty", "specialty"
  ];
  const SHOP_IDS = Array.from({ length: 24 }, (_, i) => "HP-" + String(i + 1).padStart(2, "0"));
  const AUDIENCE = ["landlord", "tenant"];
  const RENT_BANDS = ["low", "mid", "high"];

  let catalogue = null;
  let shops = [];
  let selectedId = null;
  let focusedId = null;
  let expiryWindowMonths = 0;
  let filterCategory = "";
  let filterRent = "";
  let proposals = [];
  let proposalSeq = 1;
  let undoStack = [];
  let activity = [];
  let outreach = null;

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function catMeta(id) {
    return (catalogue.categories || []).find(function (c) { return c.id === id; }) || {
      id: id, label: id, color: "#1c2d3f"
    };
  }

  function catLabel(id) {
    return catMeta(id).label;
  }

  function shopById(id) {
    return shops.find(function (s) { return s.shop_id === id; });
  }

  function rentBandOf(shop) {
    const r = shop.rent_per_m2;
    if (r <= 800) return "low";
    if (r <= 1500) return "mid";
    return "high";
  }

  function monthsToExpiry(shop) {
    const exp = new Date(shop.lease_expiry + "T12:00:00+10:00");
    const days = (exp.getTime() - AS_AT.getTime()) / 86400000;
    return days / 30.4375;
  }

  function formatMoney(n) {
    return "$" + Math.round(n).toLocaleString("en-AU") + "/m²";
  }

  function formatGla(n) {
    return Math.round(n).toLocaleString("en-AU") + " m²";
  }

  function formatDate(iso) {
    const d = new Date(iso + "T12:00:00+10:00");
    return new Intl.DateTimeFormat("en-AU", {
      timeZone: TZ, day: "numeric", month: "short", year: "numeric"
    }).format(d);
  }

  function formatTime(d) {
    return new Intl.DateTimeFormat("en-AU", {
      timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
    }).format(d);
  }

  function pendingFor(shopId) {
    return proposals.find(function (p) {
      return p.shop_id === shopId && p.status === "pending";
    });
  }

  function matchesFilters(shop) {
    if (filterCategory && shop.category !== filterCategory) return false;
    if (filterRent && rentBandOf(shop) !== filterRent) return false;
    if (expiryWindowMonths > 0 && monthsToExpiry(shop) > expiryWindowMonths) return false;
    return true;
  }

  function summarize(shop) {
    return {
      shop_id: shop.shop_id,
      tenant: shop.tenant,
      category: shop.category,
      category_label: catLabel(shop.category),
      gla_m2: shop.gla_m2,
      rent_per_m2: shop.rent_per_m2,
      rent_band: rentBandOf(shop),
      lease_expiry: shop.lease_expiry,
      months_to_expiry: Math.round(monthsToExpiry(shop) * 10) / 10,
      productivity: shop.productivity,
      anchor: !!shop.anchor,
      remixed: !!shop.remixed
    };
  }

  function publicShop(shop) {
    const pending = pendingFor(shop.shop_id);
    return Object.assign(summarize(shop), {
      notes: shop.notes,
      incoming_overlay: pending ? {
        proposal_id: pending.id,
        replacement_category: pending.replacement_category,
        rationale: pending.rationale
      } : null
    });
  }

  function logCall(name, input, result, source) {
    activity.unshift({
      t: new Date(),
      name: name,
      input: input,
      ok: !result || result.ok !== false,
      source: source || "human",
      summary: result && result.summary ? result.summary : (result && result.error ? result.error : "ok")
    });
    if (activity.length > 80) activity.length = 80;
    renderLog();
  }

  function envelopeResult(obj) {
    return { content: [{ type: "text", text: JSON.stringify(obj) }] };
  }

  /* ---------- mix + gaps ---------- */

  function computeMix() {
    const byCat = {};
    CAT_ENUM.forEach(function (id) {
      byCat[id] = { id: id, count: 0, gla: 0, label: catLabel(id), color: catMeta(id).color };
    });
    shops.forEach(function (s) {
      if (!byCat[s.category]) {
        byCat[s.category] = { id: s.category, count: 0, gla: 0, label: catLabel(s.category), color: catMeta(s.category).color };
      }
      byCat[s.category].count += 1;
      byCat[s.category].gla += s.gla_m2;
    });
    const totalGla = shops.reduce(function (a, s) { return a + s.gla_m2; }, 0);
    const expiries = {
      m3: shops.filter(function (s) { return monthsToExpiry(s) <= 3; }),
      m6: shops.filter(function (s) { return monthsToExpiry(s) <= 6; }),
      m12: shops.filter(function (s) { return monthsToExpiry(s) <= 12; })
    };
    const weak = shops.filter(function (s) { return s.productivity === "C" || s.productivity === "D"; });
    const fashion = byCat.fashion;
    const fnb = byCat.fnb;
    const health = byCat.health;
    const beauty = byCat.beauty;
    const gaps = [];
    if (fashion && fashion.count >= 3) {
      gaps.push("Fashion is heavy (3 specialty shops). HP-09 Lumen Studio is band D with an October 2026 expiry.");
    }
    if (fnb && fnb.count >= 6) {
      gaps.push("F&B is 6 of 24 shops. Food court already covers quick service; a mall F&B remix should earn its keep.");
    }
    if (health && health.count <= 2) {
      gaps.push("Health is thin for a downsizer-leaning harbour catchment. Drift Pharmacy is strong; Harbour Optics is soft and near expiry.");
    }
    if (beauty && beauty.count === 1) {
      gaps.push("Beauty is a single under-used salon (The Cut Room, band D) on the cinema door.");
    }
    const remixSoon = shops.filter(function (s) {
      return monthsToExpiry(s) <= 6 && (s.productivity === "C" || s.productivity === "D");
    });
    if (remixSoon.length) {
      gaps.push("Near-term remix set: " + remixSoon.map(function (s) { return s.shop_id + " " + s.tenant; }).join(", ") + ".");
    }
    return { byCat: byCat, totalGla: totalGla, expiries: expiries, weak: weak, gaps: gaps, remixSoon: remixSoon };
  }

  /* ---------- tools ---------- */

  function list_tenants(input) {
    input = input || {};
    if (input.category) {
      if (CAT_ENUM.indexOf(input.category) === -1) {
        return { ok: false, error: "Unknown category", summary: "bad category" };
      }
      filterCategory = input.category;
    } else {
      filterCategory = "";
    }
    if (input.rent_band) {
      if (RENT_BANDS.indexOf(input.rent_band) === -1) {
        return { ok: false, error: "rent_band must be low, mid, or high", summary: "bad rent_band" };
      }
      filterRent = input.rent_band;
    } else {
      filterRent = "";
    }
    if (input.expiry_within_months != null && input.expiry_within_months !== "") {
      expiryWindowMonths = Number(input.expiry_within_months);
    } else {
      expiryWindowMonths = 0;
    }
    syncFilterControls();
    const rows = shops.filter(matchesFilters).map(summarize);
    render();
    return {
      ok: true,
      as_at: "2026-08-30",
      filters: {
        category: filterCategory || null,
        expiry_within_months: expiryWindowMonths || null,
        rent_band: filterRent || null
      },
      count: rows.length,
      tenants: rows,
      summary: rows.length + " shop(s) on the board"
    };
  }

  function get_shop(input) {
    input = input || {};
    const shop = shopById(input.shop_id);
    if (!shop) return { ok: false, error: "Unknown shop_id", summary: "not found" };
    selectedId = shop.shop_id;
    focusedId = shop.shop_id;
    render();
    pulse(shop.shop_id);
    return { ok: true, shop: publicShop(shop), summary: shop.shop_id + " " + shop.tenant };
  }

  function focus_shop(input) {
    input = input || {};
    const shop = shopById(input.shop_id);
    if (!shop) return { ok: false, error: "Unknown shop_id", summary: "not found" };
    selectedId = shop.shop_id;
    focusedId = shop.shop_id;
    render();
    pulse(shop.shop_id);
    const el = document.querySelector('[data-shop="' + shop.shop_id + '"]');
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    return {
      ok: true,
      focused: shop.shop_id,
      tenant: shop.tenant,
      summary: "Focused " + shop.shop_id
    };
  }

  function propose_remix(input) {
    input = input || {};
    const shop = shopById(input.shop_id);
    if (!shop) return { ok: false, error: "Unknown shop_id", summary: "not found" };
    if (CAT_ENUM.indexOf(input.replacement_category) === -1) {
      return { ok: false, error: "Unknown replacement_category", summary: "bad category" };
    }
    const rationale = (input.rationale || "").trim();
    if (!rationale) return { ok: false, error: "rationale is required", summary: "need rationale" };
    const existing = pendingFor(shop.shop_id);
    if (existing) {
      return { ok: false, error: "Shop already has pending proposal " + existing.id, summary: "already pending" };
    }
    const rec = {
      id: "PR-" + String(proposalSeq++).padStart(3, "0"),
      shop_id: shop.shop_id,
      from_tenant: shop.tenant,
      from_category: shop.category,
      replacement_category: input.replacement_category,
      rationale: rationale,
      status: "pending",
      created_at: new Date().toISOString()
    };
    proposals.unshift(rec);
    selectedId = shop.shop_id;
    render();
    return {
      ok: true,
      proposal: rec,
      note: "Uncommitted overlay. Human can Accept or Reject. Call apply_remix to commit.",
      summary: rec.id + " overlay on " + rec.shop_id
    };
  }

  function apply_remix(input) {
    input = input || {};
    const rec = proposals.find(function (p) { return p.id === input.proposal_id; });
    if (!rec) return { ok: false, error: "Unknown proposal_id", summary: "not found" };
    if (rec.status !== "pending") {
      return { ok: false, error: "Proposal is " + rec.status, summary: rec.status };
    }
    const shop = shopById(rec.shop_id);
    if (!shop) return { ok: false, error: "Shop missing", summary: "shop gone" };
    undoStack.push({
      proposal_id: rec.id,
      shop_id: shop.shop_id,
      snapshot: {
        tenant: shop.tenant,
        category: shop.category,
        lease_expiry: shop.lease_expiry,
        productivity: shop.productivity,
        remixed: !!shop.remixed,
        notes: shop.notes
      }
    });
    const names = catalogue.incoming_names || {};
    let incoming = names[rec.replacement_category] || ("Incoming " + catLabel(rec.replacement_category));
    const taken = shops.some(function (s) { return s.tenant === incoming; });
    if (taken) incoming = incoming + " (incoming)";
    shop.tenant = incoming;
    shop.category = rec.replacement_category;
    shop.lease_expiry = "2031-08-31";
    shop.productivity = "new";
    shop.remixed = true;
    shop.notes = "SAMPLE remix applied. Outgoing " + rec.from_tenant + " (" + catLabel(rec.from_category) + "). " + rec.rationale;
    rec.status = "applied";
    rec.applied_tenant = incoming;
    selectedId = shop.shop_id;
    render();
    return {
      ok: true,
      proposal_id: rec.id,
      shop: publicShop(shop),
      summary: "Applied " + rec.id + " → " + incoming
    };
  }

  function reject_remix(input) {
    input = input || {};
    const rec = proposals.find(function (p) { return p.id === input.proposal_id; });
    if (!rec) return { ok: false, error: "Unknown proposal_id", summary: "not found" };
    if (rec.status !== "pending") {
      return { ok: false, error: "Proposal is " + rec.status + ", not pending", summary: rec.status };
    }
    rec.status = "rejected";
    render();
    return { ok: true, proposal_id: rec.id, status: "rejected", summary: "Rejected " + rec.id };
  }

  function draft_outreach(input) {
    input = input || {};
    const shop = shopById(input.shop_id);
    if (!shop) return { ok: false, error: "Unknown shop_id", summary: "not found" };
    if (AUDIENCE.indexOf(input.audience) === -1) {
      return { ok: false, error: "audience must be landlord or tenant", summary: "bad audience" };
    }
    const goal = (input.goal || "").trim();
    if (!goal) return { ok: false, error: "goal is required", summary: "need goal" };
    const pending = pendingFor(shop.shop_id);
    const mixBit = pending
      ? "A remix overlay is on the board: " + catLabel(shop.category) + " → " + catLabel(pending.replacement_category) + " (" + pending.id + ")."
      : "No pending remix overlay sits on this shop today.";
    let body;
    if (input.audience === "landlord") {
      body = [
        "Harbour Place Trust",
        "Leasing · Harbour Place, Millers Reach NSW",
        "",
        "SAMPLE DRAFT — not sent, not legal advice.",
        "",
        "Subject: Remix note · " + shop.shop_id + " " + shop.tenant,
        "",
        "For the board:",
        "",
        shop.shop_id + " is let to " + shop.tenant + " (" + catLabel(shop.category) + "), " + formatGla(shop.gla_m2) + " at " + formatMoney(shop.rent_per_m2) + " (SAMPLE).",
        "Lease expiry " + formatDate(shop.lease_expiry) + ". Productivity band " + shop.productivity + ".",
        mixBit,
        "",
        "Ask of the Trust: " + goal,
        "",
        "Australian specialty centres already run near full occupancy. The work on this shop is remix (who should replace whom), not filling a dark unit.",
        "",
        "Please mark Accept or Reject on the live board. This draft does not bind the Trust and does not go to anyone's inbox.",
        "",
        "Centre Remix · Harbour Place leasing board"
      ].join("\n");
    } else {
      body = [
        shop.tenant,
        "C/- " + shop.shop_id + ", Harbour Place, 12 Quay Lane, Millers Reach NSW",
        "",
        "SAMPLE DRAFT — not sent. Do not treat as a legal notice.",
        "",
        "Subject: Lease conversation · " + shop.shop_id + " Harbour Place",
        "",
        "Hello,",
        "",
        "We are reviewing mix on the Harbour Place board ahead of " + formatDate(shop.lease_expiry) + ".",
        "Your shop is " + formatGla(shop.gla_m2) + " at a SAMPLE face rent of " + formatMoney(shop.rent_per_m2) + ", productivity band " + shop.productivity + ".",
        mixBit,
        "",
        "Purpose of this note: " + goal,
        "",
        "Nothing in this draft is a termination, an offer, or a rent figure we would take to market. It stays on the leasing board until a human sends something through the proper channel.",
        "",
        "Harbour Place leasing"
      ].join("\n");
    }
    outreach = {
      shop_id: shop.shop_id,
      tenant: shop.tenant,
      audience: input.audience,
      goal: goal,
      body: body,
      sent: false
    };
    selectedId = shop.shop_id;
    render();
    return {
      ok: true,
      sent: false,
      audience: input.audience,
      shop_id: shop.shop_id,
      draft: body,
      summary: "Draft on page for " + input.audience + " · " + shop.shop_id
    };
  }

  function set_expiry_window(input) {
    input = input || {};
    const months = Number(input.months);
    if (!isFinite(months) || months < 0 || months > 60) {
      return { ok: false, error: "months must be 0 to 60 (0 clears the filter)", summary: "bad months" };
    }
    expiryWindowMonths = months;
    syncFilterControls();
    render();
    const n = shops.filter(matchesFilters).length;
    return {
      ok: true,
      months: months,
      matching_shops: n,
      summary: months === 0 ? "Expiry filter cleared" : "Window " + months + " months · " + n + " shops"
    };
  }

  function summarise_mix() {
    const mix = computeMix();
    const categories = CAT_ENUM.map(function (id) {
      const row = mix.byCat[id];
      return {
        category: id,
        label: row.label,
        shops: row.count,
        gla_m2: row.gla,
        gla_share_pct: mix.totalGla ? Math.round((row.gla / mix.totalGla) * 1000) / 10 : 0
      };
    }).filter(function (r) { return r.shops > 0; });
    const result = {
      ok: true,
      centre: catalogue.centre.name,
      as_at: catalogue.centre.as_at,
      occupancy_pct: catalogue.centre.occupancy_pct,
      shop_count: shops.length,
      let_gla_m2: mix.totalGla,
      categories: categories,
      expiries: {
        within_3_months: mix.expiries.m3.map(summarize),
        within_6_months: mix.expiries.m6.map(summarize),
        within_12_months: mix.expiries.m12.map(summarize)
      },
      weak_productivity: mix.weak.map(summarize),
      gaps: mix.gaps,
      summary: shops.length + " shops, " + mix.expiries.m6.length + " expiries in 6 months, " + mix.gaps.length + " mix notes"
    };
    const mixPanel = document.getElementById("panel-mix");
    if (mixPanel) {
      mixPanel.style.outline = "2px solid var(--brass)";
      setTimeout(function () { mixPanel.style.outline = ""; }, 900);
    }
    renderMix();
    return result;
  }

  function undo_last() {
    const last = undoStack.pop();
    if (!last) return { ok: false, error: "Nothing to undo", summary: "empty stack" };
    const shop = shopById(last.shop_id);
    if (!shop) return { ok: false, error: "Shop missing", summary: "shop gone" };
    Object.keys(last.snapshot).forEach(function (k) {
      shop[k] = last.snapshot[k];
    });
    const rec = proposals.find(function (p) { return p.id === last.proposal_id; });
    if (rec && rec.status === "applied") {
      rec.status = "pending";
      delete rec.applied_tenant;
    }
    selectedId = shop.shop_id;
    render();
    return {
      ok: true,
      restored: publicShop(shop),
      proposal_id: last.proposal_id,
      summary: "Undid remix on " + shop.shop_id
    };
  }

  const TOOL_FNS = {
    list_tenants: list_tenants,
    get_shop: get_shop,
    focus_shop: focus_shop,
    propose_remix: propose_remix,
    apply_remix: apply_remix,
    reject_remix: reject_remix,
    draft_outreach: draft_outreach,
    set_expiry_window: set_expiry_window,
    summarise_mix: summarise_mix,
    undo_last: undo_last
  };

  function emptySchema() {
    return { type: "object", properties: {}, additionalProperties: false };
  }

  const TOOL_DEFS = [
    {
      name: "list_tenants",
      title: "List tenants",
      description: "List Harbour Place shops on the live board. Optional filters dim non-matches on the floor plan. SAMPLE data only.",
      inputSchema: {
        type: "object",
        properties: {
          category: { type: "string", enum: CAT_ENUM, description: "Category id such as fashion, fnb, health." },
          expiry_within_months: { type: "integer", minimum: 1, maximum: 60, description: "Keep shops whose lease expiry falls within this many months from 30 Aug 2026." },
          rent_band: { type: "string", enum: RENT_BANDS, description: "low ≤800, mid 801–1500, high >1500 AUD per m2 (SAMPLE)." }
        },
        additionalProperties: false
      }
    },
    {
      name: "get_shop",
      title: "Get shop",
      description: "Return one shop by shop_id and highlight it on the Harbour Place plan.",
      inputSchema: {
        type: "object",
        properties: {
          shop_id: { type: "string", enum: SHOP_IDS, description: "Shop code HP-01 to HP-24." }
        },
        required: ["shop_id"],
        additionalProperties: false
      }
    },
    {
      name: "focus_shop",
      title: "Focus shop",
      description: "Pan the floor plan to a shop and pulse-highlight it. Does not change tenancy data.",
      inputSchema: {
        type: "object",
        properties: {
          shop_id: { type: "string", enum: SHOP_IDS, description: "Shop code HP-01 to HP-24." }
        },
        required: ["shop_id"],
        additionalProperties: false
      },
      annotations: { readOnlyHint: true }
    },
    {
      name: "propose_remix",
      title: "Propose remix",
      description: "Place an uncommitted remix overlay on a shop. Does not change the sitting tenant until apply_remix or the human hits Accept.",
      inputSchema: {
        type: "object",
        properties: {
          shop_id: { type: "string", enum: SHOP_IDS, description: "Shop to overlay." },
          replacement_category: { type: "string", enum: CAT_ENUM, description: "Proposed incoming category." },
          rationale: { type: "string", description: "Short mix case the human will read on the overlay." }
        },
        required: ["shop_id", "replacement_category", "rationale"],
        additionalProperties: false
      }
    },
    {
      name: "apply_remix",
      title: "Apply remix",
      description: "Commit a pending proposal. Replaces the sitting tenant with a SAMPLE incoming name, new category, and a fresh 2031 expiry.",
      inputSchema: {
        type: "object",
        properties: {
          proposal_id: { type: "string", description: "Proposal id such as PR-001." }
        },
        required: ["proposal_id"],
        additionalProperties: false
      }
    },
    {
      name: "reject_remix",
      title: "Reject remix",
      description: "Reject a pending proposal and drop its overlay. Sitting tenant stays.",
      inputSchema: {
        type: "object",
        properties: {
          proposal_id: { type: "string", description: "Proposal id such as PR-001." }
        },
        required: ["proposal_id"],
        additionalProperties: false
      }
    },
    {
      name: "draft_outreach",
      title: "Draft outreach",
      description: "Write an on-page outreach draft for a shop. Never sends email. audience is landlord or tenant.",
      inputSchema: {
        type: "object",
        properties: {
          shop_id: { type: "string", enum: SHOP_IDS, description: "Shop the draft is about." },
          audience: { type: "string", enum: AUDIENCE, description: "landlord (the Trust) or tenant (the sitting operator)." },
          goal: { type: "string", description: "What the note is trying to get done." }
        },
        required: ["shop_id", "audience", "goal"],
        additionalProperties: false
      }
    },
    {
      name: "set_expiry_window",
      title: "Set expiry window",
      description: "Visually filter the plan to leases expiring within N months from 30 Aug 2026. Pass 0 to clear.",
      inputSchema: {
        type: "object",
        properties: {
          months: { type: "integer", minimum: 0, maximum: 60, description: "Window in months. 0 clears the expiry filter." }
        },
        required: ["months"],
        additionalProperties: false
      }
    },
    {
      name: "summarise_mix",
      title: "Summarise mix",
      description: "Read-only snapshot of category mix, GLA shares, near expiries, weak productivity, and mix gaps on the live board.",
      inputSchema: emptySchema(),
      annotations: { readOnlyHint: true }
    },
    {
      name: "undo_last",
      title: "Undo last remix",
      description: "Revert the last applied remix and restore that proposal as a pending overlay.",
      inputSchema: emptySchema()
    }
  ];

  function dispatch(name, input, source) {
    const fn = TOOL_FNS[name];
    if (!fn) {
      const err = { ok: false, error: "Unknown tool", summary: name };
      logCall(name, input, err, source);
      return err;
    }
    let result;
    try {
      result = fn(input || {});
    } catch (err) {
      result = { ok: false, error: String(err && err.message ? err.message : err), summary: "exception" };
    }
    logCall(name, input || {}, result, source);
    return result;
  }

  /* ---------- render ---------- */

  function pulse(id) {
    const el = document.querySelector('[data-shop="' + id + '"]');
    if (!el) return;
    el.classList.remove("is-pulse");
    void el.offsetWidth;
    el.classList.add("is-pulse");
    setTimeout(function () { el.classList.remove("is-pulse"); }, 1800);
  }

  function renderPlan() {
    const plan = document.getElementById("plan");
    const frag = document.createDocumentFragment();

    const mallN = document.createElement("div");
    mallN.className = "mall-label mall-n";
    mallN.textContent = "North mall · quay frontage";
    frag.appendChild(mallN);

    const mallS = document.createElement("div");
    mallS.className = "mall-label mall-s";
    mallS.textContent = "South mall · food court approach";
    frag.appendChild(mallS);

    (catalogue.plan_overlays || []).forEach(function (ov) {
      const d = document.createElement("div");
      d.className = ov.id === "atrium" ? "atrium" : "amenity";
      d.style.gridColumn = ov.col;
      d.style.gridRow = ov.row;
      d.textContent = ov.id === "atrium" ? "Atrium · fountain" : "Lifts · amenities";
      frag.appendChild(d);
    });

    shops.forEach(function (shop) {
      const cat = catMeta(shop.category);
      const el = document.createElement("button");
      el.type = "button";
      el.className = "shop";
      el.dataset.shop = shop.shop_id;
      el.style.gridColumn = shop.col;
      el.style.gridRow = shop.row;
      el.style.setProperty("--cat", cat.color);
      el.setAttribute("aria-label", shop.shop_id + " " + shop.tenant);
      if (shop.shop_id === selectedId) el.classList.add("is-selected");
      if (shop.shop_id === focusedId) el.classList.add("is-focused");
      if (!matchesFilters(shop)) el.classList.add("is-dimmed");
      const pending = pendingFor(shop.shop_id);
      if (pending) el.classList.add("has-proposal");
      if (shop.remixed) el.classList.add("is-remixed");

      const sid = document.createElement("div");
      sid.className = "sid";
      sid.textContent = shop.shop_id + (shop.anchor ? " · ANCHOR" : "");

      const name = document.createElement("div");
      name.className = "tname";
      name.textContent = shop.tenant;

      const catEl = document.createElement("div");
      catEl.className = "cat-label";
      catEl.textContent = pending
        ? cat.label + " → " + catLabel(pending.replacement_category)
        : cat.label;

      const meta = document.createElement("div");
      meta.className = "meta";
      const left = document.createElement("span");
      left.textContent = formatGla(shop.gla_m2) + " · " + formatMoney(shop.rent_per_m2);
      const right = document.createElement("span");
      right.innerHTML = '<span class="prod prod-' + shop.productivity + '">' + shop.productivity + "</span>";
      meta.appendChild(left);
      meta.appendChild(right);

      const exp = document.createElement("div");
      exp.className = "meta";
      exp.textContent = "exp " + formatDate(shop.lease_expiry);

      el.appendChild(sid);
      el.appendChild(name);
      el.appendChild(catEl);
      el.appendChild(meta);
      el.appendChild(exp);

      if (pending) {
        const b = document.createElement("span");
        b.className = "badge";
        b.textContent = pending.id;
        el.appendChild(b);
      } else if (shop.remixed) {
        const b = document.createElement("span");
        b.className = "badge applied";
        b.textContent = "Remixed";
        el.appendChild(b);
      }

      el.addEventListener("click", function () {
        selectedId = shop.shop_id;
        focusedId = shop.shop_id;
        render();
      });
      frag.appendChild(el);
    });

    plan.innerHTML = "";
    plan.appendChild(frag);
  }

  function renderLegend() {
    const el = document.getElementById("legend");
    const used = {};
    shops.forEach(function (s) { used[s.category] = true; });
    el.innerHTML = CAT_ENUM.filter(function (id) { return used[id]; }).map(function (id) {
      const c = catMeta(id);
      return '<span><i style="background:' + c.color + '"></i>' + c.label + "</span>";
    }).join("") +
      '<span>Band A–D = sales productivity (SAMPLE)</span>' +
      '<span>Hatched tile = uncommitted remix overlay</span>';
  }

  function renderMix() {
    const mix = computeMix();
    const max = Math.max.apply(null, CAT_ENUM.map(function (id) { return mix.byCat[id].gla; }).concat([1]));
    const body = document.getElementById("mix-body");
    const rows = CAT_ENUM.map(function (id) {
      const r = mix.byCat[id];
      if (!r.count) return "";
      const pct = Math.round((r.gla / max) * 100);
      return '<div class="mix-row">' +
        '<i class="mix-swatch" style="background:' + r.color + '"></i>' +
        "<span>" + r.label + "</span>" +
        '<span class="mix-bar"><i style="width:' + pct + "%;background:" + r.color + '"></i></span>' +
        '<span class="mix-count">' + r.count + " · " + Math.round(r.gla) + " m²</span>" +
        "</div>";
    }).join("");
    const gapHtml = mix.gaps.length
      ? "<ul class='gaps'>" + mix.gaps.map(function (g) { return "<li>" + escapeHtml(g) + "</li>"; }).join("") + "</ul>"
      : "";
    body.innerHTML = rows +
      '<p class="gaps" style="margin:8px 0 0;border:0;padding:0">Occupancy ' +
      catalogue.centre.occupancy_pct + "% · " + mix.expiries.m6.length +
      " leases inside 6 months · " + mix.weak.length + " shops on band C/D.</p>" + gapHtml;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function renderInspector() {
    const el = document.getElementById("inspector");
    const shop = shopById(selectedId);
    if (!shop) {
      el.innerHTML = '<p class="inspector-empty">Select a shop on the plan, or ask an agent to <code>get_shop</code> / <code>focus_shop</code>.</p>';
      return;
    }
    const pending = pendingFor(shop.shop_id);
    const preferred = shop.category === "health" ? "specialty" : "health";
    const catOpts = CAT_ENUM.map(function (id) {
      const sel = id === preferred ? " selected" : "";
      return '<option value="' + id + '"' + sel + ">" + catLabel(id) + "</option>";
    }).join("");
    el.innerHTML =
      '<p class="shop-id">' + shop.shop_id + (shop.anchor ? " · anchor" : "") + "</p>" +
      '<h3 class="tenant-name">' + escapeHtml(shop.tenant) + "</h3>" +
      '<dl class="kv">' +
      "<dt>Category</dt><dd>" + escapeHtml(catLabel(shop.category)) + "</dd>" +
      "<dt>GLA</dt><dd>" + formatGla(shop.gla_m2) + "</dd>" +
      "<dt>Face rent</dt><dd>" + formatMoney(shop.rent_per_m2) + " <span class='sample-chip' style='color:var(--brass-dim);border-color:var(--brass)'>SAMPLE</span></dd>" +
      "<dt>Rent band</dt><dd>" + rentBandOf(shop) + "</dd>" +
      "<dt>Expiry</dt><dd>" + formatDate(shop.lease_expiry) + " · " + (Math.round(monthsToExpiry(shop) * 10) / 10) + " mo</dd>" +
      "<dt>Productivity</dt><dd><span class='prod prod-" + shop.productivity + "'>" + shop.productivity + "</span> " +
      escapeHtml((catalogue.productivity_bands || {})[shop.productivity] || "") + "</dd>" +
      "<dt>Notes</dt><dd style='white-space:normal;font-family:var(--font-ui)'>" + escapeHtml(shop.notes || "") + "</dd>" +
      "</dl>" +
      (pending ? "<p class='proposal' style='margin-top:10px'>Overlay " + pending.id + " proposes " +
        catLabel(pending.replacement_category) + ". Accept or reject in Remix proposals.</p>" : "") +
      '<div style="margin-top:10px;border-top:1px dashed var(--rule);padding-top:8px">' +
      "<strong style='font-family:var(--font-cond);letter-spacing:.12em;text-transform:uppercase;font-size:11px'>Propose remix</strong>" +
      '<div class="field"><label for="insp-cat">Replacement category</label><select id="insp-cat">' + catOpts + "</select></div>" +
      '<div class="field"><label for="insp-why">Rationale</label><textarea id="insp-why" placeholder="Why this shop should change mix."></textarea></div>' +
      '<div class="btn-row"><button type="button" class="btn" id="insp-propose">Propose overlay</button></div>' +
      "</div>" +
      '<div style="margin-top:10px">' +
      "<strong style='font-family:var(--font-cond);letter-spacing:.12em;text-transform:uppercase;font-size:11px'>Draft outreach</strong>" +
      '<div class="row-2"><div class="field"><label for="insp-aud">Audience</label>' +
      '<select id="insp-aud"><option value="landlord">Landlord</option><option value="tenant">Tenant</option></select></div>' +
      '<div class="field"><label for="insp-goal">Goal</label><input id="insp-goal" placeholder="Open expiry talks"></div></div>' +
      '<div class="btn-row"><button type="button" class="btn btn-ghost" id="insp-draft">Draft on page</button></div>' +
      "</div>";

    document.getElementById("insp-propose").addEventListener("click", function () {
      dispatch("propose_remix", {
        shop_id: shop.shop_id,
        replacement_category: document.getElementById("insp-cat").value,
        rationale: document.getElementById("insp-why").value
      }, "human");
    });
    document.getElementById("insp-draft").addEventListener("click", function () {
      dispatch("draft_outreach", {
        shop_id: shop.shop_id,
        audience: document.getElementById("insp-aud").value,
        goal: document.getElementById("insp-goal").value || "Open a remix / expiry conversation"
      }, "human");
    });
  }

  function renderProposals() {
    const el = document.getElementById("proposals-body");
    const open = proposals.filter(function (p) { return p.status === "pending"; });
    const rest = proposals.filter(function (p) { return p.status !== "pending"; });
    if (!proposals.length) {
      el.innerHTML = '<p class="inspector-empty">No uncommitted overlays. Propose a remix from the inspector or via <code>propose_remix</code>.</p>';
      return;
    }
    function card(p) {
      const shop = shopById(p.shop_id);
      const actions = p.status === "pending"
        ? '<div class="btn-row">' +
          '<button type="button" class="btn btn-ok" data-apply="' + p.id + '">Accept</button>' +
          '<button type="button" class="btn btn-bad" data-reject="' + p.id + '">Reject</button>' +
          "</div>"
        : "";
      return '<article class="proposal' + (p.status === "rejected" ? " rejected" : "") + '">' +
        '<div class="pid">' + p.id + " · " + p.status + "</div>" +
        "<div><strong>" + p.shop_id + "</strong> " + escapeHtml(p.from_tenant) +
        " · " + catLabel(p.from_category) + " → " + catLabel(p.replacement_category) + "</div>" +
        "<div style='margin:4px 0;color:var(--ink-soft)'>" + escapeHtml(p.rationale) + "</div>" +
        (shop && p.status === "applied" ? "<div>Now: " + escapeHtml(shop.tenant) + "</div>" : "") +
        actions + "</article>";
    }
    el.innerHTML = open.map(card).join("") + rest.map(card).join("") +
      '<div class="btn-row"><button type="button" class="btn btn-ghost" id="btn-undo">Undo last applied</button></div>';
    el.querySelectorAll("[data-apply]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        dispatch("apply_remix", { proposal_id: btn.getAttribute("data-apply") }, "human");
      });
    });
    el.querySelectorAll("[data-reject]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        dispatch("reject_remix", { proposal_id: btn.getAttribute("data-reject") }, "human");
      });
    });
    const undoBtn = document.getElementById("btn-undo");
    if (undoBtn) {
      undoBtn.addEventListener("click", function () {
        dispatch("undo_last", {}, "human");
      });
    }
  }

  function renderOutreach() {
    const empty = document.getElementById("draft-empty");
    const body = document.getElementById("draft-body");
    if (!outreach) {
      empty.hidden = false;
      body.hidden = true;
      return;
    }
    empty.hidden = true;
    body.hidden = false;
    document.getElementById("draft-audience").textContent = outreach.audience + " · not sent";
    document.getElementById("draft-shop").textContent = outreach.shop_id + " " + outreach.tenant;
    document.getElementById("draft-text").textContent = outreach.body;
  }

  function renderLog() {
    const el = document.getElementById("activity-log");
    if (!activity.length) {
      el.innerHTML = '<div class="log-item"><span class="t">—</span><span>No tool calls yet. Human clicks and Simulate agent use the same functions.</span></div>';
      return;
    }
    el.innerHTML = activity.map(function (a) {
      return '<div class="log-item"><span class="t">' + formatTime(a.t) +
        '</span><span><span class="src-' + a.source + '">' + a.source + "</span> · <strong>" +
        a.name + "</strong> · " + escapeHtml(a.summary) + "</span></div>";
    }).join("");
  }

  function renderStats() {
    const mix = computeMix();
    document.getElementById("stat-occ").textContent = catalogue.centre.occupancy_pct + "%";
    document.getElementById("stat-gla").textContent = mix.totalGla.toLocaleString("en-AU") + " m²";
    document.getElementById("stat-shops").textContent = String(shops.length);
    document.getElementById("stat-pending").textContent = String(
      proposals.filter(function (p) { return p.status === "pending"; }).length
    );
  }

  function render() {
    renderPlan();
    renderLegend();
    renderMix();
    renderInspector();
    renderProposals();
    renderOutreach();
    renderLog();
    renderStats();
  }

  function syncFilterControls() {
    document.getElementById("filter-category").value = filterCategory;
    document.getElementById("filter-rent").value = filterRent;
    const exp = document.getElementById("filter-expiry");
    const wanted = String(expiryWindowMonths);
    if (Array.prototype.some.call(exp.options, function (o) { return o.value === wanted; })) {
      exp.value = wanted;
    } else if (expiryWindowMonths === 0) {
      exp.value = "0";
    } else {
      let opt = Array.prototype.find.call(exp.options, function (o) { return o.value === wanted; });
      if (!opt) {
        opt = document.createElement("option");
        opt.value = wanted;
        opt.textContent = expiryWindowMonths + " months";
        exp.appendChild(opt);
      }
      exp.value = wanted;
    }
  }

  /* ---------- simulate agent ---------- */

  function buildSimFields() {
    const name = document.getElementById("sim-tool").value;
    const def = TOOL_DEFS.find(function (t) { return t.name === name; });
    const box = document.getElementById("sim-fields");
    const props = (def.inputSchema && def.inputSchema.properties) || {};
    const keys = Object.keys(props);
    if (!keys.length) {
      box.innerHTML = '<p class="inspector-empty">No arguments.</p>';
      return;
    }
    box.innerHTML = keys.map(function (k) {
      const spec = props[k];
      const req = (def.inputSchema.required || []).indexOf(k) !== -1;
      if (spec.enum) {
        const opts = ['<option value="">—</option>'].concat(spec.enum.map(function (v) {
          return '<option value="' + v + '">' + v + "</option>";
        }));
        return '<div class="field"><label for="sim-' + k + '">' + k + (req ? " *" : "") +
          "</label><select id='sim-" + k + "'>" + opts.join("") + "</select></div>";
      }
      const type = spec.type === "integer" || spec.type === "number" ? "number" : "text";
      return '<div class="field"><label for="sim-' + k + '">' + k + (req ? " *" : "") +
        "</label><input id='sim-" + k + "' type='" + type + "' " +
        (spec.minimum != null ? "min='" + spec.minimum + "' " : "") +
        (spec.maximum != null ? "max='" + spec.maximum + "' " : "") +
        "></div>";
    }).join("");
  }

  function runSim() {
    const name = document.getElementById("sim-tool").value;
    const def = TOOL_DEFS.find(function (t) { return t.name === name; });
    const props = (def.inputSchema && def.inputSchema.properties) || {};
    const input = {};
    Object.keys(props).forEach(function (k) {
      const field = document.getElementById("sim-" + k);
      if (!field) return;
      let v = field.value;
      if (v === "") return;
      if (props[k].type === "integer") v = parseInt(v, 10);
      if (props[k].type === "number") v = Number(v);
      input[k] = v;
    });
    const result = dispatch(name, input, "sim");
    document.getElementById("sim-result").textContent = JSON.stringify(result, null, 2);
  }

  /* ---------- WebMCP ---------- */

  async function registerWebMCP() {
    const banner = document.getElementById("webmcp-banner");
    const ctx = document.modelContext || (typeof navigator !== "undefined" ? navigator.modelContext : null);
    if (!ctx || typeof ctx.registerTool !== "function") {
      banner.hidden = false;
      document.body.classList.add("has-banner");
      return;
    }
    banner.hidden = false;
    banner.className = "webmcp-banner is-live";
    banner.innerHTML = "<div><strong>WebMCP live</strong><div>10 tools registered on this top-level page. Agent and human share the same Harbour Place board.</div></div>";
    document.body.classList.add("has-banner");

    for (let i = 0; i < TOOL_DEFS.length; i++) {
      const tool = TOOL_DEFS[i];
      const spec = {
        name: tool.name,
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        execute: async function (args) {
          const result = dispatch(tool.name, args || {}, "agent");
          return envelopeResult(result);
        }
      };
      if (tool.annotations) spec.annotations = tool.annotations;
      try {
        await ctx.registerTool(spec);
      } catch (err) {
        logCall("registerTool", { name: tool.name }, { ok: false, error: String(err), summary: "register failed" }, "human");
      }
    }
    logCall("registerTool", { count: TOOL_DEFS.length }, { ok: true, summary: "10 tools registered" }, "human");
  }

  /* ---------- boot ---------- */

  function fillCategoryFilter() {
    const sel = document.getElementById("filter-category");
    sel.innerHTML = '<option value="">All categories</option>' + CAT_ENUM.map(function (id) {
      return '<option value="' + id + '">' + catLabel(id) + "</option>";
    }).join("");
  }

  function bindUi() {
    document.getElementById("filter-category").addEventListener("change", function (e) {
      filterCategory = e.target.value;
      render();
    });
    document.getElementById("filter-rent").addEventListener("change", function (e) {
      filterRent = e.target.value;
      render();
    });
    document.getElementById("filter-expiry").addEventListener("change", function (e) {
      expiryWindowMonths = Number(e.target.value) || 0;
      render();
    });
    document.getElementById("btn-clear-filters").addEventListener("click", function () {
      filterCategory = "";
      filterRent = "";
      expiryWindowMonths = 0;
      syncFilterControls();
      render();
    });
    document.getElementById("btn-reset").addEventListener("click", function () {
      resetSample();
    });
    document.getElementById("btn-copy-draft").addEventListener("click", function () {
      if (!outreach) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(outreach.body);
      }
    });
    document.getElementById("btn-clear-draft").addEventListener("click", function () {
      outreach = null;
      renderOutreach();
    });
    const simSel = document.getElementById("sim-tool");
    TOOL_DEFS.forEach(function (t) {
      const o = document.createElement("option");
      o.value = t.name;
      o.textContent = t.name;
      simSel.appendChild(o);
    });
    simSel.addEventListener("change", buildSimFields);
    document.getElementById("btn-sim-run").addEventListener("click", runSim);
    buildSimFields();
  }

  function resetSample() {
    shops = clone(catalogue.shops);
    selectedId = null;
    focusedId = null;
    expiryWindowMonths = 0;
    filterCategory = "";
    filterRent = "";
    proposals = [];
    proposalSeq = 1;
    undoStack = [];
    outreach = null;
    syncFilterControls();
    render();
    logCall("reset_sample", {}, { ok: true, summary: "Board restored to SAMPLE" }, "human");
  }

  async function boot() {
    let data = window.__HARBOUR_PLACE__;
    try {
      const res = await fetch("data/harbour-place.json", { cache: "no-store" });
      if (res.ok) data = await res.json();
    } catch (err) {
      /* file:// falls back to the embedded copy */
    }
    if (!data) {
      document.body.innerHTML = "<p style='color:#f3ead8;padding:2rem'>Could not load Harbour Place sample data.</p>";
      return;
    }
    catalogue = data;
    shops = clone(catalogue.shops);
    fillCategoryFilter();
    bindUi();
    render();
    await registerWebMCP();
  }

  boot();
})();
