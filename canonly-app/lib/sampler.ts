// Citation sampler.
// AI answers are non-deterministic, so a single sample proves nothing:
// we take repeated samples per prompt per engine and report citation RATE.
//
// Adapters:
//  - perplexity: real API call when PERPLEXITY_API_KEY is set (returns citations).
//  - simulated: deterministic simulation (hash-based) used when no key is present,
//    clearly labeled `mode: simulated` in stored samples and in the UI.
//    Simulation heuristic: prompts that overlap keywords with *published* answer
//    pages cite at a materially higher rate — so the demo shows the before/after
//    story without pretending to be real data.

import { createHash } from "node:crypto";
import { all, one, run, now, type PageRow, type Prompt } from "./db";
import { baseUrl } from "./util";

export const ENGINES = ["perplexity", "google-aio", "chatgpt"] as const;

function keywords(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 5);
}

function publishedCorpus(orgId: string): { texts: string[]; urls: string[] } {
  const pages = all<PageRow>(`SELECT * FROM pages WHERE org_id = ? AND status = 'published'`, orgId);
  const texts: string[] = [];
  const urls: string[] = [];
  for (const p of pages) {
    texts.push(p.title.toLowerCase());
    urls.push(`${baseUrl()}/a/${orgId}/${p.slug}`);
  }
  return { texts, urls };
}

function simSample(orgId: string, prompt: Prompt, engine: string, runIndex: number) {
  const { texts, urls } = publishedCorpus(orgId);
  const kws = keywords(prompt.text);
  const matchIdx = texts.findIndex((t) => kws.some((k) => t.includes(k)));
  const matched = matchIdx >= 0;
  const p = matched ? 0.62 : 0.12; // published, on-topic content cites ~5x more often
  const h = createHash("sha256").update(`${prompt.id}|${engine}|${runIndex}`).digest()[0] / 255;
  const cited = h < p;
  return {
    cited,
    citedUrl: cited && matched ? urls[matchIdx] : null,
    note: matched ? "keyword overlap with published page" : "no published page matches prompt",
  };
}

async function perplexitySample(prompt: Prompt, orgId: string) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "sonar",
        messages: [{ role: "user", content: prompt.text }],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { citations?: string[] };
    const host = new URL(baseUrl()).host;
    const hit = (data.citations ?? []).find((c) => c.includes(host));
    return { cited: !!hit, citedUrl: hit ?? null, note: `citations: ${(data.citations ?? []).length}` };
  } catch {
    return null;
  }
}

export async function runSampler(orgId: string, samplesPerEngine = 5) {
  const prompts = all<Prompt>(`SELECT * FROM prompts WHERE org_id = ?`, orgId);
  let inserted = 0;
  for (const prompt of prompts) {
    for (const engine of ENGINES) {
      for (let i = 0; i < samplesPerEngine; i++) {
        const priorRuns = one<{ n: number }>(
          `SELECT COUNT(*) as n FROM samples WHERE prompt_id = ? AND engine = ?`, prompt.id, engine
        )!.n;
        let mode = "simulated";
        let result = null as null | { cited: boolean; citedUrl: string | null; note: string };
        if (engine === "perplexity") {
          const real = await perplexitySample(prompt, orgId);
          if (real) { result = real; mode = "live"; }
        }
        if (!result) result = simSample(orgId, prompt, engine, priorRuns + i);
        run(
          `INSERT INTO samples (prompt_id, engine, mode, cited, cited_url, note, ran_at) VALUES (?,?,?,?,?,?,?)`,
          prompt.id, engine, mode, result.cited ? 1 : 0, result.citedUrl, result.note, now()
        );
        inserted++;
      }
    }
  }
  return inserted;
}

export function citationRates(orgId: string) {
  return all<{ prompt_id: string; text: string; engine: string; mode: string; total: number; cited: number }>(
    `SELECT p.id as prompt_id, p.text as text, s.engine as engine, s.mode as mode,
            COUNT(*) as total, SUM(s.cited) as cited
     FROM prompts p JOIN samples s ON s.prompt_id = p.id
     WHERE p.org_id = ?
     GROUP BY p.id, s.engine, s.mode
     ORDER BY p.created_at, s.engine`,
    orgId
  );
}
