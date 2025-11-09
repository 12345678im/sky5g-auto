import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

// تثبيت المتصفح تلقائيًا إن لم يكن موجودًا
try {
  console.log('⏳ تثبيت متصفحات Playwright إذا لم تكن موجودة...');
  execSync('npx playwright install chromium', { stdio: 'inherit' });
} catch (err) {
  console.error('❌ فشل تثبيت المتصفح:', err.message);
  process.exit(1);
}

(async () => {
  const phones = (await fs.readFile('phones.txt', 'utf8'))
    .split('\n')
    .filter(Boolean);
  const resultPath = path.resolve('result.txt');
  const browser = await chromium.launch({ headless: true });

  for (const phone of phones) {
    const page = await browser.newPage();

    try {
      await page.goto('https://rn.sky-5g.net/', { waitUntil: 'networkidle' });

      await page.waitForSelector('input[name="phoneNumber"]', { timeout: 30000 });
      await page.fill('input[name="phoneNumber"]', phone);

      const value = await page.inputValue('input[name="phoneNumber"]');
      if (value !== phone) {
        const msg = `❌ لم يتم إدخال الرقم بشكل صحيح`;
        console.error(`${msg}: ${phone}`);
        await fs.appendFile(resultPath, `${phone} → ${msg}\n`);
        await page.close();
