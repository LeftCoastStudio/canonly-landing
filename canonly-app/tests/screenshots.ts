import { chromium } from "playwright-core";

const BASE = "http://localhost:3000";
const OUT = "/home/claude/work/shots";

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

  async function login(email: string) {
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "canonly-demo");
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/`);
  }

  await page.goto(`${BASE}/login`);
  await page.screenshot({ path: `${OUT}/01-login.png` });

  await login("jason@leftcoastagency.com");
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/02-dashboard.png` });

  await page.goto(`${BASE}/claims`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/03-claims.png` });

  // Composer with a rule violation moment: fee claim alone shows pairing note
  await page.goto(`${BASE}/blocks/new`);
  await page.fill('input[placeholder*="How much"]', "What does Meridian charge for advisory services?");
  await page.selectOption("#claimPick", "c-fee");
  await page.click('text=+ Claim');
  await page.selectOption("#claimPick", "c-disclosure");
  await page.click('text=+ Claim');
  await page.click('text=+ Connective text');
  await page.fill("textarea", "Have questions about how our fee compares? We publish everything.");
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/04-composer.png`, fullPage: true });

  await page.goto(`${BASE}/review`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/05-review.png` });

  await page.goto(`${BASE}/citations`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/06-citations.png` });

  // public page: find slug from pages screen
  await page.goto(`${BASE}/pages`);
  const href = await page.getAttribute('a[href^="/a/meridian/"]', "href");
  if (href) {
    await page.goto(`${BASE}${href}`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/07-public-page.png`, fullPage: true });
  }

  await browser.close();
  console.log("screenshots done");
})();
