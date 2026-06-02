const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log("Navigating...");
    await page.goto('https://aranyavihaara.karnataka.gov.in/', { waitUntil: 'networkidle' });

    console.log("Getting districts...");
    const districts = await page.$$eval('#district option', options => 
      options.map(o => ({ value: o.value, text: o.text })).filter(o => o.value !== '' && !o.text.includes('ಆಯ್ಕೆ ಮಾಡಿ'))
    );
    
    if (districts.length > 0) {
      console.log(`Selecting district: ${districts[0].text}`);
      await page.selectOption('#district', districts[0].value);
      await page.waitForTimeout(2000);
      
      const treks = await page.$$eval('#trek option', options => 
        options.map(o => ({ value: o.value, text: o.text })).filter(o => o.value !== '' && !o.text.includes('ಆಯ್ಕೆ ಮಾಡಿ'))
      );

      if (treks.length > 0) {
        console.log(`Selecting trek: ${treks[0].text}`);
        await page.selectOption('#trek', treks[0].value);
        
        console.log("Waiting 5 seconds for calendar...");
        await page.waitForTimeout(5000);
        
        const html = await page.content();
        fs.writeFileSync('calendar_dump.html', html);
        console.log("Dumped HTML to calendar_dump.html");
      } else {
        console.log("No treks found in district.");
      }
    }
  } catch(e) {
    console.error(e);
  } finally {
    if (browser) await browser.close();
  }
})();
