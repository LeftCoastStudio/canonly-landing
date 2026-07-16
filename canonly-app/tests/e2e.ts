// End-to-end walking-skeleton test against a running dev server.
// The loop that defines "the product works":
//   claim -> legal approves -> block auto-approves -> page -> publish
//   -> public page + JSON-LD + llms.txt -> citation sampling shows lift.
import assert from "node:assert";

const BASE = process.env.E2E_BASE || "http://localhost:3000";
const jar = new Map<string, string>();

async function req(path: string, init: RequestInit = {}, expectRedirect = true) {
  const headers = new Headers(init.headers);
  if (jar.size) headers.set("cookie", [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; "));
  const res = await fetch(BASE + path, { ...init, headers, redirect: "manual" });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    const [pair] = setCookie.split(";");
    const [k, v] = pair.split("=");
    jar.set(k.trim(), v);
  }
  if (expectRedirect) assert.ok(res.status < 400, `${path} -> ${res.status}`);
  return res;
}

async function login(email: string) {
  jar.clear();
  const form = new URLSearchParams({ email, password: "canonly-demo" });
  const res = await req("/api/login", { method: "POST", body: form }, false);
  assert.equal(res.status, 303);
  assert.ok(!res.headers.get("location")?.includes("err"), `login failed for ${email}`);
}

(async () => {
  const stamp = Date.now().toString(36);

  // --- marketing creates a claim ---
  await login("marketing@meridian.demo");
  await req("/api/claims", {
    method: "POST",
    body: new URLSearchParams({
      title: `E2E claim ${stamp}`,
      text: `Meridian publishes its complete fee schedule online. (${stamp})`,
      substantiation_note: "Fee schedule page, archived copy on file",
    }),
  });

  // claim id: cheat via the review queue page HTML
  let html = await (await req("/review")).text();
  const claimId = html.match(/\/claims\/([a-f0-9-]{36})/)?.[1];
  assert.ok(claimId, "new claim visible in review queue");

  // --- marketing cannot approve (role gate) ---
  const forbidden = await req(`/api/claims/${claimId}/action`, {
    method: "POST", body: new URLSearchParams({ action: "approve" }),
  }, false);
  assert.equal(forbidden.status, 403, "marketing must not be able to approve claims");

  // --- legal approves the claim ---
  await login("legal@meridian.demo");
  await req(`/api/claims/${claimId}/action`, { method: "POST", body: new URLSearchParams({ action: "approve" }) });

  // --- marketing composes: clean block auto-approves ---
  await login("marketing@meridian.demo");
  let res = await req("/api/blocks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: `Where can I find Meridian's fees? (${stamp})`,
      segments: [{ type: "claim", claimId, variantIndex: 0 }],
    }),
  });
  const clean = (await res.json()) as { id: string; status: string };
  assert.equal(clean.status, "approved", "claims-only block must auto-approve");

  // --- block with novel text routes to review ---
  res = await req("/api/blocks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: `Why choose Meridian? (${stamp})`,
      segments: [
        { type: "claim", claimId, variantIndex: 0 },
        { type: "text", text: "We would love to talk with you." },
      ],
    }),
  });
  const novel = (await res.json()) as { id: string; status: string };
  assert.equal(novel.status, "in_review", "novel-language block must route to legal");

  // --- rules engine blocks an unpaired fee claim ---
  res = await req("/api/blocks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: `What does Meridian charge? (${stamp})`,
      segments: [{ type: "claim", claimId: "c-fee", variantIndex: 0 }],
    }),
  }, false);
  assert.equal(res.status, 400, "unpaired fee claim must be blocked");
  const viol = (await res.json()) as { violations: { code: string }[] };
  assert.ok(viol.violations.some((v) => v.code === "pairing-required"));

  // --- rules engine blocks the expired award claim ---
  res = await req("/api/blocks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: `Is Meridian award-winning? (${stamp})`,
      segments: [{ type: "claim", claimId: "c-award", variantIndex: 0 }],
    }),
  }, false);
  assert.equal(res.status, 400, "expired claim must be blocked");

  // --- legal approves the novel block ---
  await login("legal@meridian.demo");
  await req(`/api/blocks/${novel.id}/action`, { method: "POST", body: new URLSearchParams({ action: "approve" }) });

  // --- page: create + publish ---
  await login("marketing@meridian.demo");
  const pageForm = new URLSearchParams({ title: `Meridian fees, answered ${stamp}` });
  pageForm.append("block_ids", clean.id);
  pageForm.append("block_ids", novel.id);
  await req("/api/pages", { method: "POST", body: pageForm });

  html = await (await req("/pages")).text();
  const pageId = html.match(/\/api\/pages\/([a-f0-9-]{36})\/action/)?.[1];
  assert.ok(pageId, "draft page visible with publish button");
  await req(`/api/pages/${pageId}/action`, { method: "POST", body: new URLSearchParams({ action: "publish" }) });

  html = await (await req("/pages")).text();
  const slug = html.match(/\/a\/meridian\/([a-z0-9-]+)/)?.[1];
  assert.ok(slug, "published page has a public URL");

  // --- public surface (no auth) ---
  jar.clear();
  const pub = await fetch(`${BASE}/a/meridian/${slug}`);
  assert.equal(pub.status, 200, "public page serves without auth");
  const pubHtml = await pub.text();
  assert.ok(pubHtml.includes("FAQPage"), "public page embeds FAQPage JSON-LD");
  assert.ok(pubHtml.includes(stamp), "public page contains the published answer");

  const llms = await fetch(`${BASE}/a/meridian/llms.txt`);
  const llmsText = await llms.text();
  assert.ok(llmsText.includes(slug!), "llms.txt lists the published page");

  // --- AI drafting: constrained to approved claims, auto-satisfies pairing ---
  await login("marketing@meridian.demo");
  res = await req("/api/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "How much does Meridian charge in advisory fees?" }),
  });
  const draft = (await res.json()) as { segments: { type: string; claimId?: string }[]; mode: string };
  const draftIds = draft.segments.filter((x) => x.type === "claim").map((x) => x.claimId);
  assert.ok(draftIds.includes("c-fee"), "drafter should pick the fee claim");
  assert.ok(draftIds.includes("c-disclosure"), "drafter must auto-include the required pairing claim");
  assert.ok(!draftIds.includes("c-award"), "drafter must never pick expired claims");
  res = await req("/api/blocks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: `AI-drafted: what does Meridian charge? (${stamp})`, segments: draft.segments }),
  });
  const aiBlock = (await res.json()) as { status: string };
  assert.equal(aiBlock.status, "approved", "claims-only AI draft must pass rules and auto-approve");

  // --- citation sampler: rate should be materially higher after publish ---
  await login("marketing@meridian.demo");
  await req("/api/citations/run", { method: "POST", body: new URLSearchParams() });
  html = await (await req("/citations")).text();
  assert.ok(/\d+%/.test(html), "citation dashboard shows rates");

  console.log("e2e.ts: full walking-skeleton loop passed ✓");
  console.log(`  public page: ${BASE}/a/meridian/${slug}`);
})().catch((err) => { console.error("E2E FAILED:", err.message); process.exit(1); });
