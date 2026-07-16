import { notFound } from "next/navigation";
import { one, all, claimIsExpired, type Claim, type AuditEvent } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { fmtDate } from "@/lib/util";
import { StatusPill } from "@/components/StatusPill";

export const dynamic = "force-dynamic";

export default function ClaimDetail({ params }: { params: { id: string } }) {
  const s = getSession()!;
  const c = one<Claim>("SELECT * FROM claims WHERE id=? AND org_id=?", params.id, s.org);
  if (!c) notFound();
  const variants = JSON.parse(c.variants) as string[];
  const pairing = c.requires_pairing_claim_id
    ? one<Claim>("SELECT * FROM claims WHERE id=?", c.requires_pairing_claim_id) : undefined;
  const events = all<AuditEvent>(
    "SELECT * FROM audit_events WHERE org_id=? AND entity_type='claim' AND entity_id=? ORDER BY id DESC", s.org, c.id);
  const canApprove = (s.role === "legal" || s.role === "admin") && c.status === "in_review";
  const expired = claimIsExpired(c);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-serif text-2xl font-bold text-navy">{c.title}</h1>
        <StatusPill status={expired ? "expired" : c.status} />
      </div>
      <div className="card space-y-4">
        <div>
          <div className="label">Canonical approved wording</div>
          <p className="rounded-lg bg-tint px-3 py-2 text-sm">{c.text}</p>
        </div>
        {variants.length > 0 && (
          <div>
            <div className="label">Approved variants</div>
            {variants.map((v, i) => <p key={i} className="mb-1 rounded-lg bg-tint px-3 py-2 text-sm">{v}</p>)}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><div className="label">Substantiation</div>
            {c.substantiation_url ? <a className="text-mintdark underline" href={c.substantiation_url}>{c.substantiation_url}</a> : "—"}
            <div className="text-navy/60">{c.substantiation_note}</div>
          </div>
          <div><div className="label">Expiry</div>{c.expires_at ? c.expires_at.slice(0, 10) : "No expiry set"}</div>
        </div>
        {pairing && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Pairing rule: this claim can only be published together with <b>{pairing.title}</b>.
          </p>
        )}
        {canApprove && (
          <form method="POST" action={`/api/claims/${c.id}/action`} className="flex gap-2 border-t border-navy/10 pt-4">
            <input type="hidden" name="action" value="approve" />
            <button className="btn" type="submit">Approve claim (legal)</button>
          </form>
        )}
      </div>
      <div className="card">
        <h2 className="mb-3 font-serif text-lg font-bold text-navy">Audit trail</h2>
        {events.length === 0 && <p className="text-sm text-navy/50">No events yet.</p>}
        {events.map((e) => (
          <div key={e.id} className="border-b border-navy/5 py-2 text-sm">
            <span className="text-navy/50">{fmtDate(e.created_at)}</span> · <b>{e.actor_label}</b> · {e.action}
          </div>
        ))}
      </div>
    </div>
  );
}
