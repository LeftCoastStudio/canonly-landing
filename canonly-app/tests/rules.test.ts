// Unit tests for the rules engine — the compliance guarantee.
import assert from "node:assert";
import { evaluateBlock } from "../lib/rules";
import type { Claim, Segment } from "../lib/db";

const ts = "2026-07-01T00:00:00.000Z";
const mk = (id: string, over: Partial<Claim> = {}): Claim => ({
  id, org_id: "o", title: id, text: `text of ${id}`, variants: "[]",
  substantiation_url: null, substantiation_note: null,
  requires_pairing_claim_id: null, expires_at: null,
  status: "approved", owner_id: null, created_at: ts, updated_at: ts, ...over,
});

const claims = new Map<string, Claim>([
  ["ok", mk("ok")],
  ["draft", mk("draft", { status: "draft" })],
  ["expired", mk("expired", { expires_at: "2026-01-01T00:00:00.000Z" })],
  ["fee", mk("fee", { requires_pairing_claim_id: "disclosure" })],
  ["disclosure", mk("disclosure")],
]);

const at = new Date("2026-07-15T00:00:00.000Z");
const seg = (claimId: string): Segment => ({ type: "claim", claimId, variantIndex: 0 });

// 1. Clean block of approved claims → no violations, no review.
let e = evaluateBlock([seg("ok")], claims, at);
assert.deepEqual(e.violations, [], "clean block should have no violations");
assert.equal(e.requiresLegalReview, false, "clean block should not require review");

// 2. Unapproved claim → violation.
e = evaluateBlock([seg("draft")], claims, at);
assert.ok(e.violations.some((v) => v.code === "unapproved-claim"), "draft claim must be blocked");

// 3. Expired claim → violation.
e = evaluateBlock([seg("expired")], claims, at);
assert.ok(e.violations.some((v) => v.code === "expired-claim"), "expired claim must be blocked");

// 4. Pairing rule: fee without disclosure → violation; with disclosure → clean.
e = evaluateBlock([seg("fee")], claims, at);
assert.ok(e.violations.some((v) => v.code === "pairing-required"), "unpaired fee claim must be blocked");
e = evaluateBlock([seg("fee"), seg("disclosure")], claims, at);
assert.deepEqual(e.violations, [], "paired fee claim should pass");

// 5. Novel text → allowed, but forces legal review (exception-only review).
e = evaluateBlock([seg("ok"), { type: "text", text: "Talk to us today!" }], claims, at);
assert.deepEqual(e.violations, [], "novel text is not a violation");
assert.equal(e.requiresLegalReview, true, "novel text must route to legal");
assert.deepEqual(e.reviewReasons, ["novel-language"]);

// 6. Empty block → violation.
e = evaluateBlock([], claims, at);
assert.ok(e.violations.some((v) => v.code === "empty"));

console.log("rules.test.ts: all 6 rule assertions passed ✓");
