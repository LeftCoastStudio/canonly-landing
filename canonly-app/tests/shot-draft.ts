import { chromium } from "playwright-core";
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 980 } })).newPage();
  await p.goto("http://localhost:3000/login");
  await p.fill('input[name="email"]', "marketing@meridian.demo");
  await p.fill('input[name="password"]', "canonly-demo");
  await p.click('button[type="submit"]');
  await p.waitForURL("http://localhost:3000/");
  await p.goto("http://localhost:3000/blocks/new");
  await p.fill('input[placeholder*="How much"]', "How much does Meridian charge in advisory fees?");
  await p.click('text=✦ Draft with AI');
  await p.waitForSelector("text=AI draft", { timeout: 10000 });
  await p.waitForTimeout(400);
  await p.screenshot({ path: "/home/claude/work/shots/08-ai-draft.png", fullPage: true });
  await b.close();
  console.log("done");
})();
