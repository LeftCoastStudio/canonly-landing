import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { all, run, uid, now, audit, type Claim, type Segment } from "@/lib/db";
import { evaluateBlock } from "@/lib/rules";

export async function POST(req: NextRequest) {
  const s = requireSession(req);
  if (s instanceof Response) return s;
  const body = (await req.json()) as { question: string; segments: Segment[] };
  if (!body.question?.trim()) {
    return NextResponse.json({ violations: [{ code: "no-question", message: "A block needs the question it answers." }] }, { status: 400 });
  }
  const claims = all<Claim>("SELECT * FROM claims WHERE org_id=?", s.org);
  const byId = new Map(claims.map((c) => [c.id, c]));
  const evaln = evaluateBlock(body.segments, byId);

  if (evaln.violations.length > 0) {
    return NextResponse.json({ violations: evaln.violations }, { status: 400 });
  }

  const id = uid();
  const ts = now();
  const status = evaln.requiresLegalReview ? "in_review" : "approved";
  const reason = evaln.requiresLegalReview ? evaln.reviewReasons.join(",") : null;
  run(
    `INSERT INTO blocks (id, org_id, question, segments, status, review_reason, created_by, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    id, s.org, body.question.trim(), JSON.stringify(body.segments), status, reason, s.uid, ts, ts
  );
  audit(s.org, s.name, "block", id, evaln.requiresLegalReview ? "block.routed_to_review" : "block.auto_approved",
    evaln.requiresLegalReview ? { reasons: evaln.reviewReasons } : { reason: "composed entirely of approved claims" });
  return NextResponse.json({ id, status });
}
