import { all, type Prompt } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { citationRates, ENGINES } from "@/lib/sampler";
import { StatusPill } from "@/components/StatusPill";

export const dynamic = "force-dynamic";

export default function Citations({ searchParams }: { searchParams: { ran?: string } }) {
  const s = getSession()!;
  const prompts = all<Prompt>("SELECT * FROM prompts WHERE org_id=? ORDER BY created_at", s.org);
  const rates = citationRates(s.org);
  const key = (pid: string, engine: string) => rates.filter((r) => r.prompt_id === pid && r.engine === engine);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-navy">Citation Tracking</h1>
        <form method="POST" action="/api/citations/run">
          <button className="btn" type="submit">Run sampler (5 samples × {ENGINES.length} engines)</button>
        </form>
      </div>
      {searchParams.ran && (
        <p className="rounded-lg bg-mint/15 px-4 py-2 text-sm font-medium text-mintdark">
          Sampler ran: {searchParams.ran} samples recorded.
        </p>
      )}
      <p className="text-sm text-navy/60">
        AI answers are non-deterministic, so we report <b>citation rate over repeated samples</b>, never a single
        run. Engines without API keys run in <StatusPill status="simulated" /> mode (deterministic, clearly labeled) —
        set <code>PERPLEXITY_API_KEY</code> for <StatusPill status="live" /> Perplexity sampling.
      </p>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-navy/10">
              <th className="th">Prompt</th>
              {ENGINES.map((e) => <th key={e} className="th">{e}</th>)}
            </tr>
          </thead>
          <tbody>
            {prompts.map((p) => (
              <tr key={p.id} className="border-b border-navy/5 align-top">
                <td className="td max-w-xs font-medium">{p.text}</td>
                {ENGINES.map((e) => {
                  const rows = key(p.id, e);
                  if (rows.length === 0) return <td key={e} className="td text-navy/40">no samples</td>;
                  return (
                    <td key={e} className="td">
                      {rows.map((r) => (
                        <div key={r.mode} className="mb-1">
                          <span className="font-serif text-xl font-bold text-navy">{`${Math.round((r.cited / r.total) * 100)}%`}</span>
                          <span className="ml-1 text-xs text-navy/50">{`(${r.cited}/${r.total})`}</span>
                          <span className="ml-1"><StatusPill status={r.mode} /></span>
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card max-w-xl">
        <h2 className="mb-3 font-serif text-lg font-bold text-navy">Add a prompt to the panel</h2>
        <form method="POST" action="/api/prompts" className="flex gap-2">
          <input name="text" required className="input" placeholder="A question your buyers ask an AI engine" />
          <button className="btn shrink-0" type="submit">Add</button>
        </form>
      </div>
    </div>
  );
}
