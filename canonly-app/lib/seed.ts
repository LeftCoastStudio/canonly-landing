// Idempotent first-boot seed: a fictional design partner ("Meridian Wealth
// Advisors", a fee-only RIA) with a small claim library that demonstrates
// every rule: approved claims, a required pairing, an in-review claim, and
// an expired claim. All names/claims are fictional.
import bcrypt from "bcryptjs";
import type { DatabaseSync } from "node:sqlite";

export function seedIfEmpty(db: DatabaseSync) {
  const n = (db.prepare("SELECT COUNT(*) as n FROM orgs").get() as { n: number }).n;
  if (n > 0) return;

  const ts = new Date().toISOString();
  const hash = bcrypt.hashSync("canonly-demo", 10);
  const ORG = "meridian";

  db.prepare("INSERT INTO orgs (id, name, slug) VALUES (?,?,?)").run(ORG, "Meridian Wealth Advisors (demo)", "meridian");

  const users: [string, string, string, string][] = [
    ["u-jason", "jason@leftcoastagency.com", "Jason (Admin)", "admin"],
    ["u-legal", "legal@meridian.demo", "Dana Reyes (Legal/Compliance)", "legal"],
    ["u-mktg", "marketing@meridian.demo", "Sam Okafor (Marketing)", "marketing"],
  ];
  for (const [id, email, name, role] of users) {
    db.prepare("INSERT INTO users (id, org_id, email, name, password_hash, role) VALUES (?,?,?,?,?,?)")
      .run(id, ORG, email, name, hash, role);
  }

  const claim = db.prepare(
    `INSERT INTO claims (id, org_id, title, text, variants, substantiation_url, substantiation_note,
     requires_pairing_claim_id, expires_at, status, owner_id, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );

  // c-disclosure first (pairing target)
  claim.run(
    "c-disclosure", ORG,
    "Fee disclosure (required pairing)",
    "Advisory fees are described in Meridian's Form ADV Part 2A. Fees do not include underlying third-party fund expenses.",
    JSON.stringify(["Full fee details appear in our Form ADV Part 2A; third-party fund expenses are additional."]),
    "https://adviserinfo.sec.gov/", "Form ADV Part 2A, Item 5 (fees and compensation).",
    null, null, "approved", "u-legal", ts, ts
  );
  claim.run(
    "c-fee", ORG,
    "Flat advisory fee — 0.75% AUM",
    "Meridian charges a flat annual advisory fee of 0.75% of assets under management.",
    JSON.stringify(["Our advisory fee is a flat 0.75% of AUM per year — no tiers, no hidden charges."]),
    "https://adviserinfo.sec.gov/", "Form ADV Part 2A, Item 5. Verified 2026-06-02.",
    "c-disclosure", null, "approved", "u-legal", ts, ts
  );
  claim.run(
    "c-fiduciary", ORG,
    "Fee-only SEC-registered fiduciary",
    "Meridian Wealth Advisors is a fee-only fiduciary registered with the SEC.",
    JSON.stringify(["As a fee-only, SEC-registered fiduciary, Meridian is compensated only by clients — never by commissions."]),
    "https://adviserinfo.sec.gov/", "SEC IAPD registration record; fee-only status per Form ADV.",
    null, null, "approved", "u-legal", ts, ts
  );
  claim.run(
    "c-expense", ORG,
    "Client fund-expense reduction (UNSUBSTANTIATED — in review)",
    "Clients typically reduce their total underlying fund expenses within the first year.",
    JSON.stringify([]),
    null, "Needs a substantiation source before approval — internal study not yet on file.",
    null, null, "in_review", "u-mktg", ts, ts
  );
  claim.run(
    "c-award", ORG,
    "2024 'Top RIA' award (EXPIRED)",
    "Meridian was named a 2024 'Top RIA' by ExampleRating.",
    JSON.stringify([]),
    "https://example.com/top-ria-2024", "Award usage rights expired Jan 1, 2026 per ExampleRating terms.",
    null, "2026-01-01T00:00:00.000Z", "approved", "u-legal", ts, ts
  );

  // One pre-approved block so the library isn't empty.
  db.prepare(
    `INSERT INTO blocks (id, org_id, question, segments, status, review_reason, created_by, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).run(
    "b-fiduciary", ORG,
    "Is Meridian Wealth Advisors a fiduciary?",
    JSON.stringify([{ type: "claim", claimId: "c-fiduciary", variantIndex: 0 }]),
    "approved", null, "u-mktg", ts, ts
  );

  const prompt = db.prepare("INSERT INTO prompts (id, org_id, text, created_at) VALUES (?,?,?,?)");
  prompt.run("p-1", ORG, "What is a fee-only fiduciary financial advisor?", ts);
  prompt.run("p-2", ORG, "How much does a wealth advisor charge in fees?", ts);
  prompt.run("p-3", ORG, "Is Meridian Wealth Advisors a fiduciary?", ts);
  prompt.run("p-4", ORG, "Best fee-only financial advisor for retirement planning", ts);

  const ev = db.prepare(
    `INSERT INTO audit_events (org_id, actor_label, entity_type, entity_id, action, detail, created_at) VALUES (?,?,?,?,?,?,?)`
  );
  ev.run(ORG, "system", "org", ORG, "seeded", JSON.stringify({ note: "demo seed" }), ts);
  ev.run(ORG, "Dana Reyes (Legal/Compliance)", "claim", "c-fee", "claim.approved", JSON.stringify({ substantiation: "Form ADV Part 2A" }), ts);
  ev.run(ORG, "Dana Reyes (Legal/Compliance)", "claim", "c-fiduciary", "claim.approved", null, ts);
  ev.run(ORG, "Dana Reyes (Legal/Compliance)", "claim", "c-disclosure", "claim.approved", null, ts);
  ev.run(ORG, "system", "block", "b-fiduciary", "block.auto_approved", JSON.stringify({ reason: "composed entirely of approved claims" }), ts);
}
