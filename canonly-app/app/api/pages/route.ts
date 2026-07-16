import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { run, uid, audit } from "@/lib/db";
import { slugify } from "@/lib/util";

export async function POST(req: NextRequest) {
  const s = requireSession(req);
  if (s instanceof Response) return s;
  const form = await req.formData();
  const title = String(form.get("title") ?? "").trim();
  const blockIds = form.getAll("block_ids").map(String);
  const id = uid();
  const slug = slugify(title) + "-" + id.slice(0, 4);
  run(
    `INSERT INTO pages (id, org_id, slug, title, block_ids, status, published_at) VALUES (?,?,?,?,?,?,NULL)`,
    id, s.org, slug, title, JSON.stringify(blockIds), "draft"
  );
  audit(s.org, s.name, "page", id, "page.created", { blocks: blockIds.length });
  return NextResponse.redirect(new URL("/pages", req.url), 303);
}
