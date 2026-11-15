import {test,expect} from '@playwright/test';

test('970 cards and 25 topics, no horizontal document overflow',async({page},testInfo)=>{
 await page.goto('./');
 await expect(page.locator('#nTotal')).toHaveText('970');
 await expect(page.locator('#listSub')).toContainText('970 resultados');
 await expect(page.locator('#topicList .topic-btn')).toHaveCount(26);
 await expect(page.locator('#cardsContainer .study-card')).toHaveCount(22);
 const ok=await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2);
 expect(ok,'No page-level horizontal overflow at '+testInfo.project.name).toBeTruthy();
});

test('topic navigation and mobile controls',async({page,isMobile})=>{
 await page.goto('./');
 if(isMobile){
  const open=page.locator('#mobileTopics');
  await open.click();
  await expect(page.locator('#sidebar')).toHaveClass(/mobile-open/);
  const arrows=page.locator('#topicsNext');
  const box=await arrows.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  const before=await page.locator('#topicList').evaluate(e=>e.scrollLeft);
  await arrows.click();await page.waitForTimeout(500);
  const after=await page.locator('#topicList').evaluate(e=>e.scrollLeft);
  expect(after).toBeGreaterThan(before);
 }
 await page.locator('#topicList [data-topic="1"]').click();
 await expect(page.locator('#listSub')).toContainText('35 resultados');
 await expect(page.locator('#cardsContainer .study-card')).toHaveCount(22);
});

test('studied/review, secondary menu, source disclosure and focus mode',async({page,isMobile})=>{
 await page.goto('./');
 const first=page.locator('.study-card').first();
 await expect(first.locator('.audit-status')).toContainText('Triagem estrutural');
 await first.locator('.audit-info summary').click();
 await expect(first.locator('.audit-body')).toContainText('validação clínica');
 await first.locator('[data-action="done"]').click();
 await expect(page.locator('#nDone')).toHaveText('1');
 await page.locator('.study-card').first().locator('details.more-actions summary').click();
 await page.locator('.study-card').first().locator('[data-action="star"]').click();
 await page.locator('.study-card').first().locator('[data-action="review"]').click();
 await expect(page.locator('#nReview')).toHaveText('1');
 await page.locator('[data-mode="focus"]').click();
 await expect(page.locator('#focusNav')).toBeVisible();
 await expect(page.locator('#cardsContainer .study-card')).toHaveCount(1);
 if(!isMobile){
  await expect(page.locator('.main-shell')).toHaveClass(/focus-immersive/);
  await expect(page.locator('#sidebar')).toBeHidden();
  await page.locator('#focusSidebarToggle').click();
  await expect(page.locator('#sidebar')).toBeVisible();
 }
 const summary=page.locator('.study-card details.more-actions summary').first();
 const rect=await summary.boundingBox();
 expect(rect.height).toBeGreaterThanOrEqual(44);
});

test('XML export/import and legacy JSON import preserve state',async({page})=>{
 await page.goto('./');
 const legacy={format:'cmn-flashcards-progresso',version:1,cards:{'1.1.1':{status:'done',star:true}}};
 await page.locator('#importFile').setInputFiles({name:'progresso-antigo.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy))});
 await expect(page.locator('#importReviewTitle')).toHaveText('Confirmar importação');
 await page.locator('#confirmImportBtn').click();
 await expect(page.locator('#nDone')).toHaveText('1');
 const downloadPromise=page.waitForEvent('download');
 await page.locator('#exportBtn').click();
 const download=await downloadPromise;
 expect(download.suggestedFilename()).toMatch(/\.xml$/);
 const xml=await import('node:fs/promises').then(fs=>fs.readFile(await download.path(),'utf8'));
 expect(xml).toContain('<cmn-progress');
 expect(xml).toContain('schema-version="1"');
 await page.locator('#importFile').setInputFiles({name:'progresso.xml',mimeType:'application/xml',buffer:Buffer.from(xml)});
 await expect(page.locator('#importReviewTitle')).toHaveText('Confirmar importação');
 await page.locator('#confirmImportBtn').click();
 await expect(page.locator('#nDone')).toHaveText('1');
});

test('invalid XML is rejected before overwriting existing progress',async({page})=>{
 await page.goto('./');
 await page.locator('.study-card [data-action="done"]').first().click();
 await expect(page.locator('#nDone')).toHaveText('1');
 const invalid='<?xml version="1.0" encoding="UTF-8"?><cmn-progress format="cmn-flashcards-progresso" schema-version="1" exported-at="2026-11-15T00:00:00.000Z" card-count="970"><card id="1.1.1" status="invalid"/></cmn-progress>';
 await page.locator('#importFile').setInputFiles({name:'invalido.xml',mimeType:'application/xml',buffer:Buffer.from(invalid)});
 await expect(page.locator('#importReviewTitle')).toHaveText('Não foi possível importar');
 await expect(page.locator('#confirmImportBtn')).toBeHidden();
 await expect(page.locator('#nDone')).toHaveText('1');
});

test('conservative content formatting and classifying numbered lists',async({page})=>{
 await page.goto('./');
 if(await page.locator('#mobileTopics').isVisible())await page.locator('#mobileTopics').click();
 await page.locator('#topicList [data-topic="1"]').click();
 await page.locator('#moreBtn').click();
 const item=page.locator('#card-1-5-2');
 await expect(item).toBeVisible();
 await item.locator('[data-action="reveal"]').first().click();
 await expect(item.locator('.answer-points [role="listitem"]').first()).toBeVisible();
 expect(await item.locator('.answer-points').getAttribute('aria-label')).toBe('Itens numerados da resposta');
});

test('PWA manifests correct relative scope and offline shell on Chromium',async({page,context,browserName})=>{
 test.skip(browserName!=='chromium','Offline is verified on Chromium; engine emulation does not replace physical iOS Safari');
 await page.goto('./');
 const manifest=await page.request.get('./manifest.webmanifest');
 expect(manifest.ok()).toBeTruthy();
 const data=await manifest.json();
 expect(data.start_url).toBe('./');
 expect(data.scope).toBe('./');
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await context.setOffline(true);
 try{
  await page.reload();
  await expect(page.locator('#nTotal')).toHaveText('970');
  await expect(page.locator('#listSub')).toContainText('970 resultados');
 }finally{await context.setOffline(false);}
});
