const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },  // iPhone 14 viewport
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
  });
  const page = await ctx.newPage();
  const results = [];
  const check = (id, pass, note='') => results.push({ id, pass, note });

  const BASE = 'https://sound-platform-dev.web.app';

  // Navigate
  await page.goto(BASE + '/general/home', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Screenshot: initial state
  await page.screenshot({ path: 'qa_01_initial.png', fullPage: false });

  // QA 1: avatar button exists
  const avatarBtn = page.locator('.app-header__avatar').first();
  const avatarExists = await avatarBtn.count() > 0;
  check('Q1_avatar_exists', avatarExists, avatarExists ? 'avatar button found' : 'NO avatar button');

  // QA 2: click avatar, hub opens
  if (avatarExists) {
    const urlBefore = page.url();
    await avatarBtn.click();
    await page.waitForTimeout(600);
    const hubVisible = await page.locator('.ach-sheet').count() > 0;
    check('Q2_hub_opens', hubVisible, hubVisible ? 'hub sheet rendered' : 'hub NOT found');

    // QA 3: URL does not change
    const urlAfter = page.url();
    check('Q3_url_unchanged', urlBefore === urlAfter, `before=${urlBefore} after=${urlAfter}`);

    // Screenshot: hub open
    await page.screenshot({ path: 'qa_02_hub_open.png', fullPage: false });

    // QA 4: close button closes it
    const closeBtn = page.locator('.ach-sheet__close').first();
    const closeBtnExists = await closeBtn.count() > 0;
    if (closeBtnExists) {
      await closeBtn.click();
      await page.waitForTimeout(400);
      const hubGone = await page.locator('.ach-sheet').count() === 0;
      check('Q4_close_btn', hubGone, hubGone ? 'hub closed' : 'hub still visible after close');
    } else {
      check('Q4_close_btn', false, 'close button not found');
    }

    // QA 5: backdrop click closes it — reopen first
    await avatarBtn.click();
    await page.waitForTimeout(600);
    const backdrop = page.locator('.ach-backdrop').first();
    if (await backdrop.count() > 0) {
      await backdrop.click({ position: { x: 10, y: 10 } });
      await page.waitForTimeout(400);
      const hubGone2 = await page.locator('.ach-sheet').count() === 0;
      check('Q5_backdrop_close', hubGone2, hubGone2 ? 'closed on backdrop' : 'backdrop click did not close');
    } else {
      check('Q5_backdrop_close', false, 'backdrop element not found');
    }

    // QA 6: Escape key closes it — reopen
    await avatarBtn.click();
    await page.waitForTimeout(600);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const hubGone3 = await page.locator('.ach-sheet').count() === 0;
    check('Q6_escape_close', hubGone3, hubGone3 ? 'Escape closed hub' : 'Escape did not close hub');

    // QA 7–10: Privacy Center
    await avatarBtn.click();
    await page.waitForTimeout(600);
    // Check sections visible
    const bodyText = await page.locator('.ach-body').first().textContent().catch(() => '');
    const sections = ['الحساب','الخصوصية','النشاط والتواصل','الاشتراكات والمال','الإعلانات','الراديو','الموسيقى والحقوق','المسابقات','الدعم والثقة'];
    for (const s of sections) {
      const found = bodyText.includes(s);
      check(`SECTION_${s}`, found, found ? 'visible' : 'MISSING');
    }

    // Click مركز الخصوصية
    const privacyBtn = page.getByText('مركز الخصوصية').first();
    if (await privacyBtn.count() > 0) {
      await privacyBtn.click();
      await page.waitForTimeout(500);
      const panelVisible = await page.locator('.ach-privacy-panel').count() > 0;
      check('Q8_privacy_panel_opens', panelVisible, panelVisible ? 'privacy panel opened' : 'panel NOT found');

      // Screenshot: privacy center
      await page.screenshot({ path: 'qa_03_privacy_center.png', fullPage: false });

      // Back button
      const backBtn = page.locator('.ach-privacy-panel__back').first();
      if (await backBtn.count() > 0 && panelVisible) {
        await backBtn.click();
        await page.waitForTimeout(400);
        const panelGone = await page.locator('.ach-privacy-panel').count() === 0;
        check('Q10_privacy_back', panelGone, panelGone ? 'back worked' : 'back did NOT close panel');
      } else {
        check('Q10_privacy_back', false, 'back button not found or panel was not open');
      }
    } else {
      check('Q8_privacy_panel_opens', false, 'مركز الخصوصية button not found');
      check('Q10_privacy_back', false, 'skipped — panel did not open');
    }

    // QA 11: عرض ملفي navigation
    // Hub may be closed from back test — reopen
    const hubNow = await page.locator('.ach-sheet').count();
    if (hubNow === 0) { await avatarBtn.click(); await page.waitForTimeout(600); }
    const viewProfileBtn = page.getByText('عرض ملفي').first();
    if (await viewProfileBtn.count() > 0) {
      await viewProfileBtn.click();
      await page.waitForTimeout(800);
      const newUrl = page.url();
      const meRoute = newUrl.includes('/me');
      check('Q11_view_profile_route', meRoute, `navigated to: ${newUrl}`);
    } else {
      check('Q11_view_profile_route', false, 'عرض ملفي button not found');
    }

  } else {
    // Skip remaining checks
    for (const n of ['Q2','Q3','Q4','Q5','Q6','Q7','Q8','Q10','Q11']) check(n, false, 'skipped — avatar not found');
  }

  await browser.close();

  // Print results
  console.log('\n=== QA RESULTS ===');
  let passed = 0, failed = 0;
  for (const r of results) {
    const status = r.pass ? 'PASS' : 'FAIL';
    console.log(`${status}  ${r.id}  ${r.note}`);
    if (r.pass) passed++; else failed++;
  }
  console.log(`\nTotal: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
