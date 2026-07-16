import Link from "next/link";
import { notFound } from "next/navigation";
import { one, all, type Block, type Claim, type Segment, type AuditEvent } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { renderSegments } from "@/lib/rules";
import { fmtDate } from "@/lib/util";
import { StatusPill } from "@/components/StatusPill";

export const dynamic = "force-dynamic";

export default function BlockDetail({ params }: { params: { id: string } }) {
  const s = getSession()!;
  const b = one<Block>("SELECT * FROM blocks WHERE id=? AND org_id=?", params.id, s.org);
  if (!b) notFound();
  const segments = JSON.parse(b.segments) as Segment[];
  const claims = all<Claim>("SELECT * FROM claims WHERE org_id=?", s.org);
  const byId = new Map(claims.map((c) => [c.id, c]));
  const rendered = renderSegments(segments, byId);
  const events = all<AuditEvent>(
    "SELECT * FROM audit_events WHERE org_id=? AND entity_type='block' AND entity_id=? ORDER BY id DESC", s.org, b.id);
  const canApprove = (s.role === "legal" || s.role === "admin") && b.status === "in_review";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-serif text-2xl font-bold text-navy">{b.question}</h1>
        <StatusPill status={b.status} />
      </div>

      <div className="card space-y-3">
        <div className="label">Rendered answer</div>
        <p className="rounded-lg bg-tint px-4 py-3 text-sm leading-relaxed">{rendered}</p>
        <div className="label">Composition</div>
        <ol className="space-y-1.5">
          {segments.map((seg, i) => (
            <li key={i} className={`rounded-lg border px-3 py-2 text-sm ${seg.type === "claim" ? "border-mint/40" : "border-amber-300 bg-amber-50"}`}>
              {seg.type === "claim" ? (
                <><b className="text-mintdark">[approved claim]</b> {byId.get(seg.claimId)?.title}</>
              ) : (
                <><b className="text-amber-700">[novel language]</b> {seg.text}</>
              )}
            </li>
          ))}
        </ol>
        <div className="flex gap-2 border-t border-navy/10 pt-3">
          {canApprove && (
            <form method="POST" action={`/api/blocks/${b.id}/action`}>
              <input type="hidden" name="action" value="approve" />
              <button className="btn" type="submit">Approve block (legal)</button>
            </form>
          )}
          <Link href={`/blocks/${b.id}/evidence`} className="btn-ghost">Evidence packet</Link>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 font-serif text-lg font-bold text-navy">Audit trail</h2>
        {events.map((e) => (
          <div key={e.id} className="border-b border-navy/5 py-2 text-sm">
            <span className="text-navy/50">{fmtDate(e.created_at)}</span> · <b>{e.actor_label}</b> · {e.action}
            {e.detail && <span className="text-navy/50"> · {e.detail}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
