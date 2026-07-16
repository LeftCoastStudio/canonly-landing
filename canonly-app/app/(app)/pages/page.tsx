import { all, type PageRow, type Block } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { StatusPill } from "@/components/StatusPill";
import { baseUrl } from "@/lib/util";

export const dynamic = "force-dynamic";

export default function Pages({ searchParams }: { searchParams: { err?: string } }) {
  const s = getSession()!;
  const pages = all<PageRow>("SELECT * FROM pages WHERE org_id=? ORDER BY rowid DESC", s.org);
  const approvedBlocks = all<Block>("SELECT * FROM blocks WHERE org_id=? AND status='approved' ORDER BY created_at DESC", s.org);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="font-serif text-2xl font-bold text-navy">Answer Pages</h1>
      {searchParams.err && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          Publish blocked by the rules engine: {decodeURIComponent(searchParams.err)}
        </p>
      )}

      <div className="card">
        <table className="w-full">
          <thead><tr className="border-b border-navy/10"><th className="th">Page</th><th className="th">Status</th><th className="th">Public URL</th><th className="th"></th></tr></thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.id} className="border-b border-navy/5">
                <td className="td font-semibold">{p.title}</td>
                <td className="td"><StatusPill status={p.status} /></td>
                <td className="td text-xs">
                  {p.status === "published"
                    ? <a className="text-mintdark underline" href={`/a/${s.org}/${p.slug}`} target="_blank">{baseUrl()}/a/{s.org}/{p.slug}</a>
                    : <span className="text-navy/40">not published</span>}
                </td>
                <td className="td">
                  {p.status !== "published" && (
                    <form method="POST" action={`/api/pages/${p.id}/action`}>
                      <input type="hidden" name="action" value="publish" />
                      <button className="btn" type="submit">Publish</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pages.length === 0 && <p className="py-4 text-sm text-navy/50">No pages yet — create one below.</p>}
      </div>

      <div className="card max-w-2xl">
        <h2 className="mb-3 font-serif text-lg font-bold text-navy">New answer page</h2>
        <form method="POST" action="/api/pages" className="space-y-3">
          <div><label className="label">Title</label><input name="title" required className="input" placeholder="Fees at Meridian Wealth Advisors, answered" /></div>
          <div>
            <label className="label">Approved blocks to include (in order)</label>
            <select name="block_ids" multiple size={Math.min(6, Math.max(3, approvedBlocks.length))} className="input">
              {approvedBlocks.map((b) => <option key={b.id} value={b.id}>{b.question}</option>)}
            </select>
            <p className="mt-1 text-xs text-navy/50">Only approved blocks are listed — unapproved content is not offerable here by construction.</p>
          </div>
          <button className="btn" type="submit">Create page (draft)</button>
        </form>
      </div>

      <div className="card">
        <h2 className="mb-1 font-serif text-lg font-bold text-navy">Machine-readable output</h2>
        <p className="text-sm text-navy/60">
          Published pages render FAQPage JSON-LD automatically and are listed in{" "}
          <a className="text-mintdark underline" href={`/a/${s.org}/llms.txt`} target="_blank">/a/{s.org}/llms.txt</a>.
        </p>
      </div>
    </div>
  );
}
