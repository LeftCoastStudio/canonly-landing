// PUBLIC answer page — no auth. This is what answer engines crawl and cite.
import { notFound } from "next/navigation";
import { one, all, type PageRow, type Org, type Block, type Claim, type Segment } from "@/lib/db";
import { renderSegments } from "@/lib/rules";
import { baseUrl } from "@/lib/util";

export const dynamic = "force-dynamic";

export default function PublicPage({ params }: { params: { org: string; slug: string } }) {
  const page = one<PageRow>(
    "SELECT * FROM pages WHERE org_id=? AND slug=? AND status='published'", params.org, params.slug);
  if (!page) notFound();
  const org = one<Org>("SELECT * FROM orgs WHERE id=?", params.org)!;
  const claims = all<Claim>("SELECT * FROM claims WHERE org_id=?", params.org);
  const byId = new Map(claims.map((c) => [c.id, c]));
  const blockIds = JSON.parse(page.block_ids) as string[];
  const blocks = blockIds
    .map((id) => one<Block>("SELECT * FROM blocks WHERE id=? AND status='approved'", id))
    .filter(Boolean) as Block[];

  const qa = blocks.map((b) => ({
    q: b.question,
    a: renderSegments(JSON.parse(b.segments) as Segment[], byId),
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qa.map((x) => ({
      "@type": "Question",
      name: x.q,
      acceptedAnswer: { "@type": "Answer", text: x.a },
    })),
    publisher: { "@type": "Organization", name: org.name },
    url: `${baseUrl()}/a/${params.org}/${params.slug}`,
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-mintdark">{org.name}</div>
        <h1 className="mb-8 font-serif text-3xl font-bold text-navy">{page.title}</h1>
        {qa.map((x, i) => (
          <section key={i} className="mb-8">
            <h2 className="mb-2 font-serif text-xl font-bold text-navy">{x.q}</h2>
            <p className="leading-relaxed text-ink">{x.a}</p>
          </section>
        ))}
        <footer className="mt-12 border-t border-navy/10 pt-4 text-xs text-navy/50">
          Every statement on this page is composed from claims reviewed and approved by {org.name}&apos;s
          compliance process, with a complete audit trail. Published {page.published_at?.slice(0, 10)}.
        </footer>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
