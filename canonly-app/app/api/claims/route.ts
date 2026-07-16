import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { run, uid, now, audit } from "@/lib/db";

export async function POST(req: NextRequest) {
  const s = requireSession(req);
  if (s instanceof Response) return s;
  const form = await req.formData();
  const id = uid();
  const ts = now();
  const variant = String(form.get("variant") ?? "").trim();
  run(
    `INSERT INTO claims (id, org_id, title, text, variants, substantiation_url, substantiation_note,
     requires_pairing_claim_id, expires_at, status, owner_id, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    id, s.org,
    String(form.get("title") ?? "").trim(),
    String(form.get("text") ?? "").trim(),
    JSON.stringify(variant ? [variant] : []),
    String(form.get("substantiation_url") ?? "").trim() || null,
    String(form.get("substantiation_note") ?? "").trim() || null,
    String(form.get("requires_pairing_claim_id") ?? "") || null,
    form.get("expires_at") ? new Date(String(form.get("expires_at"))).toISOString() : null,
    "in_review", s.uid, ts, ts
  );
  audit(s.org, s.name, "claim", id, "claim.submitted_for_review");
  return NextResponse.redirect(new URL("/claims?ok=1", req.url), 303);
}
