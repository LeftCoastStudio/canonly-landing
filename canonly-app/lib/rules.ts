// The rules engine — the compliance guarantee lives here.
//
// V1 semantics (deliberately strict — "compliant by construction"):
//  1. A block may only contain claim segments whose claim is APPROVED and not expired.
//  2. If a claim requires a pairing claim (e.g. fee claim -> fee disclosure),
//     the paired claim must appear in the same block.
//  3. Connective text (anything not a verbatim approved phrasing) is allowed,
//     but forces the block into legal review ("novel language"). Blocks composed
//     entirely of approved claims auto-approve — that is exception-only review.
//  4. Publishing re-validates every block at publish time (expiry can change).

import { type Claim, type Segment, claimIsExpired } from "./db";

export interface Violation { code: string; message: string }
export interface Evaluation {
  violations: Violation[];
  requiresLegalReview: boolean;
  reviewReasons: string[];
}

export function evaluateBlock(
  segments: Segment[],
  claimsById: Map<string, Claim>,
  at = new Date()
): Evaluation {
  const violations: Violation[] = [];
  const reviewReasons: string[] = [];
  const claimIdsInBlock = new Set(
    segments.filter((s): s is Extract<Segment, { type: "claim" }> => s.type === "claim").map((s) => s.claimId)
  );

  if (segments.length === 0) {
    violations.push({ code: "empty", message: "Block has no content." });
  }

  for (const seg of segments) {
    if (seg.type === "claim") {
      const claim = claimsById.get(seg.claimId);
      if (!claim) {
        violations.push({ code: "missing-claim", message: `Claim ${seg.claimId} not found.` });
        continue;
      }
      if (claim.status !== "approved") {
        violations.push({
          code: "unapproved-claim",
          message: `“${claim.title}” is ${claim.status}, not approved — it cannot be composed.`,
        });
      }
      if (claimIsExpired(claim, at)) {
        violations.push({
          code: "expired-claim",
          message: `“${claim.title}” expired ${claim.expires_at} — re-substantiate before use.`,
        });
      }
      const variants = JSON.parse(claim.variants) as string[];
      if (seg.variantIndex < 0 || seg.variantIndex > variants.length) {
        violations.push({ code: "bad-variant", message: `“${claim.title}”: unknown phrasing variant.` });
      }
      if (claim.requires_pairing_claim_id && !claimIdsInBlock.has(claim.requires_pairing_claim_id)) {
        const paired = claimsById.get(claim.requires_pairing_claim_id);
        violations.push({
          code: "pairing-required",
          message: `“${claim.title}” must appear together with “${paired?.title ?? claim.requires_pairing_claim_id}”.`,
        });
      }
    } else if (seg.type === "text") {
      if (seg.text.trim().length > 0) {
        if (!reviewReasons.includes("novel-language")) reviewReasons.push("novel-language");
      }
    }
  }

  return {
    violations,
    requiresLegalReview: reviewReasons.length > 0,
    reviewReasons,
  };
}

/** Render a block's segments to plain text (verbatim approved phrasings + connective text). */
export function renderSegments(segments: Segment[], claimsById: Map<string, Claim>): string {
  const parts: string[] = [];
  for (const seg of segments) {
    if (seg.type === "text") parts.push(seg.text.trim());
    else {
      const c = claimsById.get(seg.claimId);
      if (!c) continue;
      const variants = JSON.parse(c.variants) as string[];
      parts.push(seg.variantIndex === 0 ? c.text : variants[seg.variantIndex - 1] ?? c.text);
    }
  }
  return parts.filter(Boolean).join(" ");
}
