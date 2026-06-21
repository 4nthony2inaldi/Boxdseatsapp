import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 1000 }, deviceScaleFactor: 2, ignoreHTTPSErrors: true });
const p = await ctx.newPage();
await p.goto("https://www.boxdseats.com/u/appreview/athlete/7bae8d9a-3cd9-4c0e-987f-d217c031a192", { waitUntil: "networkidle", timeout: 30000 });
await p.waitForTimeout(1500);
await p.screenshot({ path: "scratch-shots/athlete-stats.png", fullPage: true });
console.log("->", p.url());
await b.close();
