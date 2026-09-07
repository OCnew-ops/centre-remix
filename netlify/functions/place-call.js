/**
 * Centre Remix — CALL-E place-call (Netlify Function) — PUBLIC DEMO
 *
 * Honestly fake-only / dry-run fixtures. This PUBLIC function NEVER places a
 * live CALL-E call, even if CALLE_API_KEY is set and dry_run=false.
 * The live @call-e/calle createAndWait path is removed from this function.
 *
 * POST JSON: { shop_id, phone, goal, confirm: true, dry_run?: boolean }
 * - confirm === true gates the fixture write only (demo UX) — not a real dial.
 * - Accepts ONLY standards-reserved fictional phones (allowlist).
 * - Responses MASK the phone (never return full E.164).
 * - Transcript stays generic (does not echo goal / possible PII).
 *
 * OPTIONS + POST only. CORS enabled for browser demo.
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

/** Standards-reserved fictional / drama numbers only (NANP 555 + ACMA). */
const ALLOWED_PHONES = new Set([
  "+15550100100",
  "+15550100101",
  "+61491570006",
  "+61491570156"
]);

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body)
  };
}

/**
 * Keep country code + last 4 digits; mask the middle with •.
 * Never returns the full E.164 in responses.
 */
function maskPhone(phone) {
  const p = String(phone || "").trim();
  if (!p.startsWith("+") || p.length < 8) return "••••";
  let ccLen = 2;
  if (p.startsWith("+61") || p.startsWith("+44") || p.startsWith("+64")) ccLen = 3;
  else if (p.startsWith("+1")) ccLen = 2;
  else ccLen = Math.min(3, p.length - 4);
  const last = 4;
  const prefix = p.slice(0, ccLen);
  const suffix = p.slice(-last);
  const midLen = Math.max(0, p.length - ccLen - last);
  return prefix + "•".repeat(midLen) + suffix;
}

function buildFixture(body) {
  const shopId = String(body.shop_id || "").trim();
  const phone = String(body.phone || "").trim();
  const masked = maskPhone(phone);
  const structured_result = {
    interested: "unknown",
    preferred_window: "Weekday mornings (SAMPLE)",
    notes:
      "Honestly fake-only fixture for " +
      shopId +
      ". No CALL-E network call was made. Public Netlify function never dials.",
    call_outcome: "dry_run_completed"
  };
  return {
    ok: true,
    mode: "fixture",
    status: "completed",
    dry_run: true,
    fixture: true,
    honestly_fake_only: true,
    shop_id: shopId,
    phone: masked,
    phone_masked: true,
    // Goal accepted for demo UX but not echoed (may contain PII).
    goal: "(omitted from public response)",
    provider: "fixture",
    structured_result: structured_result,
    summary:
      "Fixture completed for " +
      shopId +
      " — tenant interest unknown; preferred SAMPLE weekday mornings. No live dial.",
    transcript:
      "[fixture] Agent: Calling about Harbour Place " +
      shopId +
      " leasing interest (SAMPLE).\n" +
      "[fixture] Tenant: Thanks — please send details; mornings work best.",
    resultSchema: RESULT_SCHEMA,
    note:
      "confirm gates this fixture write only. Public demo never places a live CALL-E call."
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

  // confirm gates fixture write (demo UX) — never a real dial.
  if (body.confirm !== true) {
    return json(400, {
      ok: false,
      error: "confirm must be true — gates fixture write only (public demo never dials)",
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

  if (!ALLOWED_PHONES.has(phone)) {
    return json(400, {
      ok: false,
      error:
        "phone must be a standards-reserved SAMPLE number. Allowed: " +
        Array.from(ALLOWED_PHONES).join(", "),
      summary: "use reserved SAMPLE phone",
      allowed_sample_phones: Array.from(ALLOWED_PHONES)
    });
  }

  // Always fixture — ignore CALLE_API_KEY and dry_run for dialing.
  // Live @call-e/calle path intentionally absent from this public function.
  return json(200, buildFixture({ shop_id: shopId, phone: phone, goal: goal }));
};
