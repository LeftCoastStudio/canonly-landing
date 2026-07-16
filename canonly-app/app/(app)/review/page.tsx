import Link from "next/link";
import { all, type Claim, type Block } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default function Review() {
  const s = getSession()!;
  const claims = all<Claim>("SELECT * FROM claims WHERE org_id=? AND status='in_review' ORDER BY created_at", s.org);
  const blocks = all<Block>("SELECT * FROM blocks WHERE org_id=? AND status='in_review' ORDER BY created_at", s.org);
  const isLegal = s.role === "legal" || s.role === "admin";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="font-serif text-2xl font-bold text-navy">Review Queue</h1>
      <p className="text-sm text-navy/60">
        Only <b>exceptions</b> land here: new claims awaiting first approval, and blocks containing novel language.
        Everything composed purely from approved claims never enters this queue.
        {!isLegal && " (You can view the queue; approving requires the legal role.)"}
      </p>

      <div className="card">
        <h2 className="mb-3 font-serif text-lg font-bold text-navy">Claims awaiting approval ({claims.length})</h2>
        {claims.length === 0 && <p className="text-sm text-navy/50">Queue is empty.</p>}
        {claims.map((c) => (
          <div key={c.id} className="flex items-center justify-between border-b border-navy/5 py-3">
            <div>
              <Link href={`/claims/${c.id}`} className="font-semibold text-navy hover:underline">{c.title}</Link>
              <div className="text-xs text-navy/60">{c.substantiation_note ?? "No substantiation on file"}</div>
            </div>
            {isLegal && (
              <form method="POST" action={`/api/claims/${c.id}/action`}>
                <input type="hidden" name="action" value="approve" />
                <button className="btn" type="submit">Approve</button>
              </form>
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="mb-3 font-serif text-lg font-bold text-navy">Blocks with novel language ({blocks.length})</h2>
        {blocks.length === 0 && <p className="text-sm text-navy/50">Queue is empty.</p>}
        {blocks.map((b) => (
          <div key={b.id} className="flex items-center justify-between border-b border-navy/5 py-3">
            <div>
              <Link href={`/blocks/${b.id}`} className="font-semibold text-navy hover:underline">{b.question}</Link>
              <div className="text-xs text-amber-700">flag: {b.review_reason}</div>
            </div>
            {isLegal && (
              <form method="POST" action={`/api/blocks/${b.id}/action`}>
                <input type="hidden" name="action" value="approve" />
                <button className="btn" type="submit">Approve</button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
