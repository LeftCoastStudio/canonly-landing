import { all, type Claim } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Composer from "@/components/Composer";

export const dynamic = "force-dynamic";

export default function NewBlock() {
  const s = getSession()!;
  const claims = all<Claim>(
    "SELECT * FROM claims WHERE org_id=? AND status='approved' ORDER BY title", s.org
  ).map((c) => ({
    id: c.id, title: c.title, text: c.text,
    variants: JSON.parse(c.variants) as string[],
    pairing: c.requires_pairing_claim_id,
  }));
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-serif text-2xl font-bold text-navy">Compose an answer block</h1>
      <Composer claims={claims} />
    </div>
  );
}
