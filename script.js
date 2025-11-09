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
        continue;
      }

      await page.click('button.update-btn');
      console.log(`📤 إرسال: ${phone}`);

      try {
        // انتظار ظهور عنصر النتيجة
        await page.waitForFunction(() => {
          const notif = document.querySelector('.notification');
          return notif && notif.innerText.trim().length > 0 && notif.offsetParent !== null;
        }, { timeout: 2 * 60 * 1000 });

        // قراءة النص داخل العنصر
        const resultText = await page.evaluate(() => {
          const notif = document.querySelector('.notification');
          return notif ? notif.innerText.trim() : '';
        });

        // 🔍 تحليل النتيجة وتحديد حالتها
        if (
          /تم|نجاح|Done|Success|تحديث حزمة|إعادة التشغيل/i.test(resultText)
        ) {
          // ✅ في حال ظهور "جاري تحديث حزمة التصفح..." تُعتبر نجاح
          const msg = `✅ تم بنجاح (${resultText})`;
          console.log(`${msg}: ${phone}`);
          await fs.appendFile(resultPath, `${phone} → ${msg}\n`);
        } else if (/خطأ|error|غير موجود|فشل/i.test(resultText)) {
          const msg = `❌ فشل أو خطأ: ${resultText}`;
          console.warn(`${msg}: ${phone}`);
          await fs.appendFile(resultPath, `${phone} → ${msg}\n`);
        } else {
          const msg = `⚠️ نتيجة غير معروفة: ${resultText}`;
          console.warn(`${msg}: ${phone}`);
          await fs.appendFile(resultPath, `${phone} → ${msg}\n`);
        }

      } catch {
        const msg = `❌ لم تظهر نتيجة خلال دقيقتين`;
        console.error(`${msg}: ${phone}`);
        await fs.appendFile(resultPath, `${phone} → ${msg}\n`);
      }

    } catch (err) {
      const msg = `❌ خطأ أثناء المعالجة | ${err.message}`;
      console.error(`${msg}: ${phone}`);
      await fs.appendFile(resultPath, `${phone} → ${msg}\n`);
    }

    await page.close();
  }

  await browser.close();
})();
