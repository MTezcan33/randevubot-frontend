import puppeteer from 'puppeteer';

const URL = process.argv[2] || 'http://localhost:3002/dashboard/appointments';
const OUT = process.argv[3] || 'C:/Users/Mehmet/randevubot/tmp-screenshot.png';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1400,900'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  // Login
  await page.goto('http://localhost:3002/login', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.type('input[type="email"]', 'info@mtmasaj.com');
  await page.type('input[type="password"]', 'Tezcan33.');

  // Find and click login button
  const allBtns = await page.$$('button');
  for (const b of allBtns) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text.toLowerCase().includes('gir')) {
      await b.click();
      break;
    }
  }

  // Wait for navigation
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));

  // Go to target page
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  await page.screenshot({ path: OUT, fullPage: false });
  console.log('Screenshot saved:', OUT);
  await browser.close();
}

run().catch(e => console.error('Error:', e.message));
