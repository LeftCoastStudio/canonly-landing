export function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved: "bg-mint/15 text-mintdark",
    published: "bg-mint/15 text-mintdark",
    in_review: "bg-amber-100 text-amber-800",
    draft: "bg-navy/10 text-navy/70",
    retired: "bg-red-100 text-red-700",
    expired: "bg-red-100 text-red-700",
    live: "bg-mint/15 text-mintdark",
    simulated: "bg-navy/10 text-navy/60",
  };
  return <span className={`pill ${styles[status] ?? "bg-navy/10 text-navy/70"}`}>{status.replace("_", " ")}</span>;
}
