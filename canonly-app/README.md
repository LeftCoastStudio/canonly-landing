# Canonly — walking skeleton (V1)

The governed content system for regulated brands: **legal approves claims once,
marketing composes freely, AI answers cite the result.**

This is the pilot-grade walking skeleton: every module exists end-to-end, thin.
The loop that defines "working": a claim goes in → legal approves it once →
marketing composes an answer block (auto-approved if built purely from approved
claims) → the block publishes to a public answer page with FAQPage JSON-LD and
an org-level `llms.txt` → the citation sampler measures citation rate before/after.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000 — seeds a demo org on first boot
npm test           # rules-engine unit tests
npm run e2e        # full loop against the running dev server
```

Demo logins (password `canonly-demo`):

| Email | Role |
|---|---|
| jason@leftcoastagency.com | admin |
| marketing@meridian.demo | marketing (composes, cannot approve) |
| legal@meridian.demo | legal (approves claims & flagged blocks) |

## What's real in this skeleton

- **Claim Library** — claims with substantiation, approved phrasing variants,
  expiry, and pairing rules (e.g. a fee claim that cannot publish without its
  fee-disclosure claim).
- **Rules engine** (`lib/rules.ts`) — the compliance guarantee. Blocks may only
  contain verbatim approved phrasings; expired/unapproved claims are blocked at
  composition AND re-checked at publish; pairing rules enforced structurally.
- **Exception-only review** — blocks composed purely of approved claims
  auto-approve (with an audit event saying so); any novel connective text routes
  the block to the legal queue. This is the review-velocity story, working.
- **Role enforcement** — marketing cannot approve; legal can. Tested in e2e.
- **Append-only audit trail** — every action logged; no update/delete code path
  exists. Per-block **evidence packet** page (print → PDF for a regulator).
- **Publishing** — public answer pages with FAQPage JSON-LD + `/a/{org}/llms.txt`.
- **Citation sampler** — repeated samples per prompt per engine, reported as
  rates. Real Perplexity adapter when `PERPLEXITY_API_KEY` is set; otherwise a
  deterministic simulation, clearly labeled `simulated` in data and UI.

## Deliberate V1 simplifications (production roadmap)

| Skeleton | Production |
|---|---|
| SQLite (`node:sqlite`, `.data/canonly.db`) | Postgres (Neon) — data layer isolated in `lib/db.ts` |
| Session cookie auth (HMAC), seeded users | Clerk/WorkOS: SSO, SCIM, invites |
| Composer with select/reorder UI | TipTap block editor, drag-and-drop |
| Simulated engines + Perplexity live | Engine adapters: AI Overviews via SERP API, ChatGPT, Gemini; scheduled sampling |
| AI drafting: deterministic claim selection (relevance-ranked, pairing-aware); LLM mode activates with `ANTHROPIC_API_KEY` | Same contract, richer models: the drafter can only select/order approved phrasings; model-written connective text is auto-flagged to legal by the same rules path as human composition |
| Single container | Vercel + Neon; background jobs (Inngest) for samplers |
| — | SOC 2 posture: encryption at rest, access reviews, pen test before enterprise pilots |

## Environment

See `.env.example`. Nothing external is required to run the demo.
