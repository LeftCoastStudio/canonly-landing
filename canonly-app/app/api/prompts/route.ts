import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { run, uid, now, audit } from "@/lib/db";

export async function POST(req: NextRequest) {
  const s = requireSession(req);
  if (s instanceof Response) return s;
  const form = await req.formData();
  const id = uid();
  run("INSERT INTO prompts (id, org_id, text, created_at) VALUES (?,?,?,?)",
    id, s.org, String(form.get("text") ?? "").trim(), now());
  audit(s.org, s.name, "prompt", id, "prompt.added");
  return NextResponse.redirect(new URL("/citations", req.url), 303);
}
