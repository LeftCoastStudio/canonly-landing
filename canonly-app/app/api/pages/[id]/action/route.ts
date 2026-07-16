import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { one, all, run, now, audit, type PageRow, type Block, type Claim, type Segment } from "@/lib/db";
import { evaluateBlock } from "@/lib/rules";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const s = requireSession(req);
  if (s instanceof Response) return s;
  const p = one<PageRow>("SELECT * FROM pages WHERE id=? AND org_id=?", params.id, s.org);
  if (!p) return new Response("Not found", { status: 404 });

  // Publish-time re-validation: approvals and expiry can change after composition.
  const blockIds = JSON.parse(p.block_ids) as string[];
  const claims = all<Claim>("SELECT * FROM claims WHERE org_id=?", s.org);
  const byId = new Map(claims.map((c) => [c.id, c]));
  const problems: string[] = [];
  if (blockIds.length === 0) problems.push("Page has no blocks.");
  for (const bid of blockIds) {
    const b = one<Block>("SELECT * FROM blocks WHERE id=? AND org_id=?", bid, s.org);
    if (!b) { problems.push(`Block ${bid} missing.`); continue; }
    if (b.status !== "approved") { problems.push(`Block “${b.question}” is not approved.`); continue; }
    const evaln = evaluateBlock(JSON.parse(b.segments) as Segment[], byId);
    for (const v of evaln.violations) problems.push(`“${b.question}”: ${v.message}`);
  }
  if (problems.length > 0) {
    audit(s.org, s.name, "page", p.id, "page.publish_blocked", { problems });
    return NextResponse.redirect(new URL("/pages?err=" + encodeURIComponent(problems.join(" · ")), req.url), 303);
  }

  run("UPDATE pages SET status='published', published_at=? WHERE id=?", now(), p.id);
  audit(s.org, s.name, "page", p.id, "page.published", { slug: p.slug });
  return NextResponse.redirect(new URL("/pages", req.url), 303);
}
