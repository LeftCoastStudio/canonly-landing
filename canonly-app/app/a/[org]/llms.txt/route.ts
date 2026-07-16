// PUBLIC llms.txt for an org — a machine-readable index of published,
// compliance-approved answer pages, for AI crawlers.
import { all, one, type PageRow, type Org } from "@/lib/db";
import { baseUrl } from "@/lib/util";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { org: string } }) {
  const org = one<Org>("SELECT * FROM orgs WHERE id=?", params.org);
  if (!org) return new Response("Not found", { status: 404 });
  const pages = all<PageRow>(
    "SELECT * FROM pages WHERE org_id=? AND status='published' ORDER BY published_at", params.org);
  const lines = [
    `# ${org.name}`,
    `> Compliance-approved answer pages. Every statement is composed from claims`,
    `> approved through a documented legal review process with a full audit trail.`,
    ``,
    `## Answer pages`,
    ...pages.map((p) => `- [${p.title}](${baseUrl()}/a/${params.org}/${p.slug}): published ${p.published_at?.slice(0, 10)}`),
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
