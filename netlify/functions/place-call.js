/**
 * Centre Remix — CALL-E place-call (Netlify Function)
 * POST JSON: { shop_id, phone, goal, confirm: true, dry_run?: boolean }
 * Rejects unless confirm === true. Fixture when no key or dry_run !== false.
 * Live path: @call-e/calle CalleClient.calls.createAndWait (AU / en-AU).
 */

const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["interested", "preferred_window", "notes", "call_outcome"],
  properties: {
    interested: { type: "string", enum: ["yes", "no", "unknown"] },
    preferred_window: { type: "string" },
    notes: { type: "string" },
    call_outcome: { type: "string" }
  }
};

const E164_RE = /^\+[1-9]\d{7,14}$/;

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    },
    body: JSON.stringify(body)
  };
}

function buildFixture(body) {
  const shopId = String(body.shop_id || "").trim();
  const goal = String(body.goal || "").trim();
  const phone = String(body.phone || "").trim();
  const structured_result = {
    interested: "unknown",
    preferred_window: "Weekday mornings (SAMPLE)",
    notes:
      "Dry-run fixture for " +
      shopId +
      ". No CALL-E network call was made. Goal was: " +
      (goal || "(none)") +
      ".",
    call_outcome: "dry_run_completed"
  };
  return {
    ok: true,
    mode: "dry_run",
    status: "completed",
    dry_run: true,
    fixture: true,
    shop_id: shopId,
    phone: phone,
    goal: goal,
    provider: "fixture",
    structured_result: structured_result,
    summary:
      "Dry-run completed for " +
      shopId +
      " — tenant interest unknown; preferred SAMPLE weekday mornings.",
    transcript:
      "[fixture] Agent: Calling about Harbour Place " +
      shopId +
      ". " +
      goal +
      "\n[fixture] Tenant: Thanks — please send details; mornings work best.",
    resultSchema: RESULT_SCHEMA
  };
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "POST only" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return json(400, { ok: false, error: "Invalid JSON body" });
  }

  if (body.confirm !== true) {
    return json(400, {
      ok: false,
      error: "confirm must be true — never auto-dial",
      summary: "need confirm"
    });
  }

  const shopId = body.shop_id != null ? String(body.shop_id).trim() : "";
  const phone = body.phone != null ? String(body.phone).trim() : "";
  const goal = body.goal != null ? String(body.goal).trim() : "";

  if (!shopId || !phone || !goal) {
    return json(400, {
      ok: false,
      error: "shop_id, phone, and goal are required",
      summary: "missing fields"
    });
  }

  if (!E164_RE.test(phone)) {
    return json(400, {
      ok: false,
      error: "phone must be E.164-ish (+country and 8-15 digits total)",
      summary: "bad phone"
    });
  }

  const dryRun = body.dry_run !== false;
  const apiKey = process.env.CALLE_API_KEY;

  if (!apiKey || dryRun) {
    return json(200, buildFixture({ shop_id: shopId, phone: phone, goal: goal }));
  }

  // Live path needs @call-e/calle installed (see package.json).
  let CalleClient;
  try {
    CalleClient = require("@call-e/calle").CalleClient;
  } catch (err) {
    return json(500, {
      ok: false,
      error:
        "Live CALL-E path needs the @call-e/calle package installed for this function.",
      summary: "package missing"
    });
  }

  try {
    const client = new CalleClient({ apiKey: apiKey });
    const task =
      "Call " +
      phone +
      " about Harbour Place shop " +
      shopId +
      ". Goal: " +
      goal +
      ". Ask whether they are interested in a leasing conversation, and if so a preferred contact window.";

    const call = await client.calls.createAndWait({
      task: task,
      recipient: {
        phone: phone,
        region: "AU",
        locale: "en-AU"
      },
      resultSchema: RESULT_SCHEMA
    });

    const structured =
      (call && (call.structuredResult || call.structured_result)) || {};

    return json(200, {
      ok: true,
      mode: "live",
      status: (call && call.status) || "completed",
      dry_run: false,
      fixture: false,
      shop_id: shopId,
      phone: phone,
      goal: goal,
      provider: "call-e",
      structured_result: {
        interested: structured.interested || "unknown",
        preferred_window: structured.preferred_window || "",
        notes: structured.notes || "",
        call_outcome:
          structured.call_outcome ||
          (call && call.status) ||
          "completed"
      },
      summary:
        (call && (call.summary || call.shortSummary)) ||
        ("CALL-E call finished for " + shopId),
      transcript: (call && (call.transcript || call.transcriptText)) || ""
    });
  } catch (err) {
    return json(502, {
      ok: false,
      error: String(err && err.message ? err.message : err),
      summary: "CALL-E live call failed"
    });
  }
};
