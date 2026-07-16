// Constrained AI drafting — "compliant by construction."
//
// The drafter can only SELECT and ORDER approved claims (and their approved
// phrasing variants). It cannot write claim language. Two modes:
//
//  - deterministic (no API key): keyword-relevance selection. Auto-includes
//    required pairing claims, so the drafter itself obeys the rules engine.
//    Output is claims-only -> auto-approvable, zero review cycle.
//
//  - llm (ANTHROPIC_API_KEY set): the model picks claim IDs/variants and may
//    propose short connective text. Returned IDs are strictly validated
//    against the approved set (unknown IDs are dropped); any connective text
//    enters as a `text` segment, which the rules engine flags as novel
//    language and routes to legal. The compliance guarantee is enforced by
//    the same evaluateBlock() path as human composition — the AI gets no
//    special door.

import { all, claimIsExpired, type Claim, type Segment } from "./db";

export interface DraftResult {
  segments: Segment[];
  rationale: string;
  mode: "deterministic" | "llm";
}

const STOP = new Set(["what", "does", "much", "how", "where", "when", "which", "with", "your", "their", "about", "should", "would", "could"]);
function keywords(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9.%]+/).filter((w) => w.length >= 4 && !STOP.has(w));
}

function approvedClaims(orgId: string): Claim[] {
  return all<Claim>("SELECT * FROM claims WHERE org_id=? AND status='approved'", orgId)
    .filter((c) => !claimIsExpired(c));
}

function score(question: string, c: Claim): number {
  const qk = new Set(keywords(question));
  const target = keywords(`${c.title} ${c.text} ${(JSON.parse(c.variants) as string[]).join(" ")}`);
  let s = 0;
  for (const w of target) if (qk.has(w)) s++;
  return s;
}

/** Expand a selection so every pairing rule is satisfied. */
function withPairings(selected: Claim[], byId: Map<string, Claim>): Claim[] {
  const out = [...selected];
  const have = new Set(out.map((c) => c.id));
  for (const c of selected) {
    if (c.requires_pairing_claim_id && !have.has(c.requires_pairing_claim_id)) {
      const paired = byId.get(c.requires_pairing_claim_id);
      if (paired && paired.status === "approved" && !claimIsExpired(paired)) {
        out.push(paired);
        have.add(paired.id);
      }
    }
  }
  return out;
}

function deterministicDraft(orgId: string, question: string): DraftResult {
  const claims = approvedClaims(orgId);
  const byId = new Map(claims.map((c) => [c.id, c]));
  const ranked = claims
    .map((c) => ({ c, s: score(question, c) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)
    .map((x) => x.c);
  const picked = ranked.length > 0 ? ranked : claims.slice(0, 1);
  const complete = withPairings(picked, byId);
  const segments: Segment[] = complete.map((c) => ({ type: "claim", claimId: c.id, variantIndex: 0 }));
  const pairedNote = complete.length > picked.length ? " Required pairing claims were added automatically." : "";
  return {
    segments,
    rationale: `Selected ${complete.length} approved claim(s) by relevance to the question.${pairedNote} Claims-only draft → eligible for auto-approval.`,
    mode: "deterministic",
  };
}

async function llmDraft(orgId: string, question: string): Promise<DraftResult | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const claims = approvedClaims(orgId);
  const byId = new Map(claims.map((c) => [c.id, c]));
  const inventory = claims.map((c) => ({
    id: c.id, title: c.title,
    phrasings: [c.text, ...(JSON.parse(c.variants) as string[])],
    mustPairWith: c.requires_pairing_claim_id,
  }));
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 800,
        messages: [{
          role: "user",
          content:
            `You are drafting an answer block for a regulated brand. You may ONLY use the approved claims below, verbatim, by id and phrasing index (0 = canonical). You may add at most one short neutral connective sentence (it will be routed to legal review). Respect mustPairWith. Respond with JSON only: {"segments":[{"type":"claim","claimId":"...","variantIndex":0}|{"type":"text","text":"..."}],"why":"..."}.\n\nQuestion: ${question}\n\nApproved claims: ${JSON.stringify(inventory)}`,
        }],
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { content: { text: string }[] };
    const parsed = JSON.parse(data.content.map((c) => c.text).join("").replace(/^```json|```$/g, "").trim()) as {
      segments: Segment[]; why?: string;
    };
    // STRICT validation: drop unknown/unapproved claim ids; clamp variant indexes.
    const segments: Segment[] = [];
    for (const seg of parsed.segments ?? []) {
      if (seg.type === "claim") {
        const c = byId.get(seg.claimId);
        if (!c) continue;
        const max = (JSON.parse(c.variants) as string[]).length;
        segments.push({ type: "claim", claimId: c.id, variantIndex: Math.min(Math.max(0, seg.variantIndex ?? 0), max) });
      } else if (seg.type === "text" && typeof seg.text === "string" && seg.text.trim()) {
        segments.push({ type: "text", text: seg.text.trim() });
      }
    }
    if (segments.length === 0) return null;
    const hasText = segments.some((s) => s.type === "text");
    return {
      segments,
      rationale: `${parsed.why ?? "Model-selected approved claims."}${hasText ? " Contains model-written connective text → will route to legal review." : " Claims-only draft → eligible for auto-approval."}`,
      mode: "llm",
    };
  } catch {
    return null;
  }
}

export async function draftBlock(orgId: string, question: string): Promise<DraftResult> {
  return (await llmDraft(orgId, question)) ?? deterministicDraft(orgId, question);
}
