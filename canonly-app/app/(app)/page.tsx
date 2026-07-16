import Link from "next/link";
import { all, one, type AuditEvent } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { fmtDate } from "@/lib/util";
import { StatusPill } from "@/components/StatusPill";

export const dynamic = "force-dynamic";

export default function Dashboard() {
  const s = getSession()!;
  const org = s.org;
  const counts = {
    claims: one<{ n: number }>("SELECT COUNT(*) n FROM claims WHERE org_id=?", org)!.n,
    approvedClaims: one<{ n: number }>("SELECT COUNT(*) n FROM claims WHERE org_id=? AND status='approved'", org)!.n,
    blocks: one<{ n: number }>("SELECT COUNT(*) n FROM blocks WHERE org_id=?", org)!.n,
    inReview: one<{ n: number }>(
      "SELECT (SELECT COUNT(*) FROM claims WHERE org_id=? AND status='in_review') + (SELECT COUNT(*) FROM blocks WHERE org_id=? AND status='in_review') n", org, org
    )!.n,
    published: one<{ n: number }>("SELECT COUNT(*) n FROM pages WHERE org_id=? AND status='published'", org)!.n,
  };
  const autoApproved = one<{ n: number }>(
    "SELECT COUNT(*) n FROM audit_events WHERE org_id=? AND action='block.auto_approved'", org)!.n;
  const legalReviewed = one<{ n: number }>(
    "SELECT COUNT(*) n FROM audit_events WHERE org_id=? AND action='block.approved_by_legal'", org)!.n;
  const citedRate = one<{ rate: number | null }>(
    `SELECT CAST(SUM(s.cited) AS REAL)/COUNT(*) rate FROM samples s
     JOIN prompts p ON p.id=s.prompt_id WHERE p.org_id=?`, org)?.rate;
  const recent = all<AuditEvent>(
    "SELECT * FROM audit_events WHERE org_id=? ORDER BY id DESC LIMIT 10", org);

  const stat = (label: string, value: string | number, href?: string) => (
    <div className="card">
      <div className="text-xs font-semibold uppercase tracking-wide text-navy/50">{label}</div>
      <div className="mt-1 font-serif text-3xl font-bold text-navy">{value}</div>
      {href && <Link className="mt-1 inline-block text-xs font-semibold text-mintdark hover:underline" href={href}>view →</Link>}
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="font-serif text-2xl font-bold text-navy">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stat("Approved claims", `${counts.approvedClaims}/${counts.claims}`, "/claims")}
        {stat("Answer blocks", counts.blocks, "/blocks")}
        {stat("Awaiting review", counts.inReview, "/review")}
        {stat("Published pages", counts.published, "/pages")}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <div className="text-xs font-semibold uppercase tracking-wide text-navy/50">Meter 1 · Review velocity</div>
          <div className="mt-1 font-serif text-3xl font-bold text-navy">
            {autoApproved + legalReviewed === 0 ? "—" : `${Math.round((autoApproved / Math.max(1, autoApproved + legalReviewed)) * 100)}%`}
          </div>
          <p className="mt-1 text-sm text-navy/60">
            of blocks shipped with <b>no review cycle</b> ({autoApproved} auto-approved · {legalReviewed} via legal). Exception-only review, measured.
          </p>
        </div>
        <div className="card">
          <div className="text-xs font-semibold uppercase tracking-wide text-navy/50">Meter 2 · Citation rate</div>
          <div className="mt-1 font-serif text-3xl font-bold text-navy">
            {citedRate == null ? "—" : `${Math.round(citedRate * 100)}%`}
          </div>
          <p className="mt-1 text-sm text-navy/60">
            of samples across the prompt panel cite your published pages. <Link href="/citations" className="font-semibold text-mintdark hover:underline">Run the sampler →</Link>
          </p>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 font-serif text-lg font-bold text-navy">Audit trail (latest)</h2>
        <table className="w-full">
          <thead><tr className="border-b border-navy/10"><th className="th">When</th><th className="th">Actor</th><th className="th">Action</th><th className="th">Entity</th></tr></thead>
          <tbody>
            {recent.map((e) => (
              <tr key={e.id} className="border-b border-navy/5">
                <td className="td whitespace-nowrap text-navy/60">{fmtDate(e.created_at)}</td>
                <td className="td">{e.actor_label}</td>
                <td className="td"><StatusPill status={e.action.split(".").pop() ?? e.action} /></td>
                <td className="td text-navy/60">{e.entity_type} · {e.entity_id.slice(0, 12)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-navy/50">Append-only. There is no edit or delete path for audit events — that&apos;s the point.</p>
      </div>
    </div>
  );
}
