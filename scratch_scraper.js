const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("Navigating to Aranya Vihaara...");
  await page.goto('https://aranyavihaara.karnataka.gov.in/', { waitUntil: 'networkidle' });

  console.log("Waiting 3 seconds...");
  await page.waitForTimeout(3000);
  
  const content = await page.content();
  fs.writeFileSync('page.html', content);
  console.log("Saved page.html");
  
  // Let's also try to find any dropdowns or links that might contain districts/treks
  const selects = await page.$$eval('select', selects => selects.map(s => ({
    id: s.id,
    name: s.name,
    options: Array.from(s.options).map(o => o.text.trim())
  })));
  console.log("Selects found:", JSON.stringify(selects, null, 2));

  const links = await page.$$eval('a', links => links.map(l => ({
    text: l.innerText.trim(),
    href: l.href
  })).filter(l => l.text.toLowerCase().includes('trek') || l.href.toLowerCase().includes('trek')));
  console.log("Trek links found:", JSON.stringify(links, null, 2));

  await browser.close();
})();
