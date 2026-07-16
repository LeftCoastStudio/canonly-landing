"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type ClaimLite = { id: string; title: string; text: string; variants: string[]; pairing: string | null };
type Seg = { type: "claim"; claimId: string; variantIndex: number } | { type: "text"; text: string };

export default function Composer({ claims }: { claims: ClaimLite[] }) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [segments, setSegments] = useState<Seg[]>([]);
  const [violations, setViolations] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [rationale, setRationale] = useState<string | null>(null);

  async function draftWithAI() {
    setDrafting(true);
    setRationale(null);
    const res = await fetch("/api/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    setDrafting(false);
    if (res.ok) {
      const d = (await res.json()) as { segments: Seg[]; rationale: string; mode: string };
      setSegments(d.segments);
      setRationale(`AI draft (${d.mode}): ${d.rationale}`);
    }
  }

  const byId = new Map(claims.map((c) => [c.id, c]));
  const hasNovelText = segments.some((s) => s.type === "text" && s.text.trim().length > 0);

  const move = (i: number, d: number) => {
    const next = [...segments];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setSegments(next);
  };

  async function submit() {
    setBusy(true);
    setViolations([]);
    const res = await fetch("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, segments }),
    });
    setBusy(false);
    if (res.ok) {
      const { id } = (await res.json()) as { id: string };
      router.push(`/blocks/${id}`);
      router.refresh();
    } else {
      const data = (await res.json().catch(() => ({ violations: [{ message: "Something went wrong." }] }))) as {
        violations?: { message: string }[];
      };
      setViolations((data.violations ?? []).map((v) => v.message));
    }
  }

  return (
    <div className="space-y-5">
      <div className="card space-y-4">
        <div>
          <label className="label">The buyer question this block answers</label>
          <div className="flex gap-2">
            <input className="input" value={question} onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., How much does Meridian charge?" />
            <button className="btn shrink-0" disabled={drafting || !question.trim()} onClick={draftWithAI} type="button">
              {drafting ? "Drafting…" : "✦ Draft with AI"}
            </button>
          </div>
          <p className="mt-1 text-xs text-navy/50">
            The AI can only select and order approved claims — it cannot write claim language. Anything it adds as
            connective text routes to legal automatically.
          </p>
          {rationale && <p className="mt-2 rounded-lg bg-mint/10 px-3 py-2 text-xs text-mintdark">{rationale}</p>}
        </div>

        <div>
          <div className="label">Composition</div>
          {segments.length === 0 && (
            <p className="rounded-lg border border-dashed border-navy/20 px-4 py-6 text-center text-sm text-navy/50">
              Add approved claims below. Blocks built only from approved claims publish with no review cycle.
            </p>
          )}
          <ol className="space-y-2">
            {segments.map((seg, i) => (
              <li key={i} className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${seg.type === "claim" ? "border-mint/40 bg-mint/5" : "border-amber-300 bg-amber-50"}`}>
                <div className="flex-1">
                  {seg.type === "claim" ? (
                    <>
                      <div className="text-xs font-bold uppercase tracking-wide text-mintdark">Approved claim · verbatim</div>
                      <div className="text-sm font-semibold">{byId.get(seg.claimId)?.title}</div>
                      <select
                        className="input mt-1"
                        value={seg.variantIndex}
                        onChange={(e) => {
                          const next = [...segments];
                          (next[i] as Extract<Seg, { type: "claim" }>).variantIndex = Number(e.target.value);
                          setSegments(next);
                        }}
                      >
                        <option value={0}>{byId.get(seg.claimId)?.text}</option>
                        {byId.get(seg.claimId)?.variants.map((v, vi) => (
                          <option key={vi} value={vi + 1}>{v}</option>
                        ))}
                      </select>
                      {byId.get(seg.claimId)?.pairing && (
                        <div className="mt-1 text-xs text-amber-700">Pairing rule: must appear with “{byId.get(byId.get(seg.claimId)!.pairing!)?.title ?? "required claim"}”.</div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-xs font-bold uppercase tracking-wide text-amber-700">Connective text · novel language → routes to legal</div>
                      <textarea className="input mt-1" rows={2} value={seg.text}
                        onChange={(e) => {
                          const next = [...segments];
                          (next[i] as Extract<Seg, { type: "text" }>).text = e.target.value;
                          setSegments(next);
                        }} />
                    </>
                  )}
                </div>
                <div className="flex flex-col gap-1 text-xs">
                  <button className="btn-ghost px-2 py-1" onClick={() => move(i, -1)}>↑</button>
                  <button className="btn-ghost px-2 py-1" onClick={() => move(i, 1)}>↓</button>
                  <button className="btn-danger px-2 py-1" onClick={() => setSegments(segments.filter((_, x) => x !== i))}>✕</button>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-navy/10 pt-4">
          <select id="claimPick" className="input max-w-xs" defaultValue="">
            <option value="" disabled>Add an approved claim…</option>
            {claims.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <button className="btn-ghost" onClick={() => {
            const el = document.getElementById("claimPick") as HTMLSelectElement;
            if (el.value) setSegments([...segments, { type: "claim", claimId: el.value, variantIndex: 0 }]);
          }}>+ Claim</button>
          <button className="btn-ghost" onClick={() => setSegments([...segments, { type: "text", text: "" }])}>+ Connective text</button>
        </div>
      </div>

      {violations.length > 0 && (
        <div className="card border-red-300 bg-red-50">
          <div className="mb-1 text-sm font-bold text-red-800">The rules engine blocked this composition:</div>
          <ul className="list-disc pl-5 text-sm text-red-700">{violations.map((v, i) => <li key={i}>{v}</li>)}</ul>
        </div>
      )}

      <div className="card flex items-center justify-between">
        <p className="text-sm text-navy/70">
          {hasNovelText
            ? "Contains novel language → will route to the legal review queue."
            : "Composed entirely of approved claims → will auto-approve with a full audit record."}
        </p>
        <button className="btn" disabled={busy || !question.trim() || segments.length === 0} onClick={submit}>
          {busy ? "Checking rules…" : "Submit block"}
        </button>
      </div>
    </div>
  );
}
