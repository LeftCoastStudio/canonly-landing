import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { one, run, now, audit, type Block } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const s = requireSession(req, ["legal"]);
  if (s instanceof Response) return s;
  const form = await req.formData();
  const action = String(form.get("action") ?? "");
  const b = one<Block>("SELECT * FROM blocks WHERE id=? AND org_id=?", params.id, s.org);
  if (!b) return new Response("Not found", { status: 404 });

  if (action === "approve" && b.status === "in_review") {
    run("UPDATE blocks SET status='approved', updated_at=? WHERE id=?", now(), b.id);
    audit(s.org, s.name, "block", b.id, "block.approved_by_legal", { previously: b.review_reason });
  } else {
    return new Response("Unsupported action for current status", { status: 400 });
  }
  const back = req.headers.get("referer") ?? new URL(`/blocks/${b.id}`, req.url).toString();
  return NextResponse.redirect(back, 303);
}
