import Link from "next/link";
import { all, claimIsExpired, type Claim } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { StatusPill } from "@/components/StatusPill";

export const dynamic = "force-dynamic";

export default function Claims({ searchParams }: { searchParams: { ok?: string } }) {
  const s = getSession()!;
  const claims = all<Claim>("SELECT * FROM claims WHERE org_id=? ORDER BY created_at DESC", s.org);
  const others = claims.filter((c) => c.id);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-navy">Claim Library</h1>
      </div>
      {searchParams.ok && <p className="rounded-lg bg-mint/15 px-4 py-2 text-sm font-medium text-mintdark">Claim saved and routed to legal review.</p>}

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-navy/10"><th className="th">Claim</th><th className="th">Status</th><th className="th">Substantiation</th><th className="th">Expiry</th><th className="th">Pairing</th></tr></thead>
          <tbody>
            {others.map((c) => {
              const expired = claimIsExpired(c);
              return (
                <tr key={c.id} className="border-b border-navy/5 align-top">
                  <td className="td">
                    <Link href={`/claims/${c.id}`} className="font-semibold text-navy hover:underline">{c.title}</Link>
                    <div className="mt-0.5 max-w-md text-xs text-navy/60">{c.text}</div>
                  </td>
                  <td className="td"><StatusPill status={expired ? "expired" : c.status} /></td>
                  <td className="td text-xs text-navy/60">{c.substantiation_note ?? "—"}</td>
                  <td className="td text-xs text-navy/60">{c.expires_at ? c.expires_at.slice(0, 10) : "—"}</td>
                  <td className="td text-xs text-navy/60">{c.requires_pairing_claim_id ? "requires pairing" : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card max-w-2xl">
        <h2 className="mb-3 font-serif text-lg font-bold text-navy">Add a claim</h2>
        <p className="mb-4 text-sm text-navy/60">New claims enter the library as <b>in review</b> — legal approves them once, then marketing composes from them forever.</p>
        <form method="POST" action="/api/claims" className="space-y-3">
          <div><label className="label">Title</label><input name="title" required className="input" placeholder="e.g., Flat advisory fee — 0.75% AUM" /></div>
          <div><label className="label">Canonical approved wording</label><textarea name="text" required rows={2} className="input" placeholder="The exact sentence legal signs off on." /></div>
          <div><label className="label">Alternate phrasing (optional)</label><textarea name="variant" rows={2} className="input" placeholder="An approved shorter/longer variant." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Substantiation URL</label><input name="substantiation_url" className="input" placeholder="https://…" /></div>
            <div><label className="label">Substantiation note</label><input name="substantiation_note" className="input" placeholder="Form ADV Part 2A, Item 5" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Expires (optional)</label><input name="expires_at" type="date" className="input" /></div>
            <div>
              <label className="label">Must be paired with (optional)</label>
              <select name="requires_pairing_claim_id" className="input">
                <option value="">— none —</option>
                {claims.filter((c) => c.status === "approved").map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          </div>
          <button className="btn" type="submit">Save claim → legal review</button>
        </form>
      </div>
    </div>
  );
}
