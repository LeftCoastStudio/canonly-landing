import Link from "next/link";
import { all, type Block } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { StatusPill } from "@/components/StatusPill";

export const dynamic = "force-dynamic";

export default function Blocks() {
  const s = getSession()!;
  const blocks = all<Block>("SELECT * FROM blocks WHERE org_id=? ORDER BY created_at DESC", s.org);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-navy">Answer Blocks</h1>
        <Link href="/blocks/new" className="btn">+ Compose block</Link>
      </div>
      <div className="card">
        <table className="w-full">
          <thead><tr className="border-b border-navy/10"><th className="th">Question</th><th className="th">Status</th><th className="th">Route</th></tr></thead>
          <tbody>
            {blocks.map((b) => (
              <tr key={b.id} className="border-b border-navy/5">
                <td className="td"><Link className="font-semibold text-navy hover:underline" href={`/blocks/${b.id}`}>{b.question}</Link></td>
                <td className="td"><StatusPill status={b.status} /></td>
                <td className="td text-xs text-navy/60">{b.review_reason ? `legal review (${b.review_reason})` : "auto-approved — no review cycle"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
