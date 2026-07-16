import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { one, run, now, audit, type Claim } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const form = await req.formData();
  const action = String(form.get("action") ?? "");
  const s = requireSession(req, action === "approve" ? ["legal"] : undefined);
  if (s instanceof Response) return s;

  const c = one<Claim>("SELECT * FROM claims WHERE id=? AND org_id=?", params.id, s.org);
  if (!c) return new Response("Not found", { status: 404 });

  if (action === "approve" && c.status === "in_review") {
    run("UPDATE claims SET status='approved', updated_at=? WHERE id=?", now(), c.id);
    audit(s.org, s.name, "claim", c.id, "claim.approved", { substantiation: c.substantiation_note });
  } else if (action === "retire") {
    run("UPDATE claims SET status='retired', updated_at=? WHERE id=?", now(), c.id);
    audit(s.org, s.name, "claim", c.id, "claim.retired");
  } else {
    return new Response("Unsupported action for current status", { status: 400 });
  }
  const back = req.headers.get("referer") ?? new URL("/claims", req.url).toString();
  return NextResponse.redirect(back, 303);
}
