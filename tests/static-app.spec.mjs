import {test,expect} from '@playwright/test';

test('1206 cards and 31 topics, no horizontal document overflow',async({page},testInfo)=>{
 await page.goto('./');await page.waitForFunction(()=>window.CM8Source);
 await expect(page.locator('#nTotal')).toHaveText('1206');
 await expect(page.locator('#listSub')).toContainText('1206 resultados');
 await expect(page.locator('#topicList .topic-btn')).toHaveCount(32);
 await expect(page.locator('#cardsContainer .study-card')).toHaveCount(22);
 const ok=await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2);
 expect(ok,'No page-level horizontal overflow at '+testInfo.project.name).toBeTruthy();
});

test('topic navigation and mobile controls',async({page,isMobile})=>{
 await page.goto('./');await page.waitForFunction(()=>window.CM8Source);
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
 await page.goto('./');await page.waitForFunction(()=>window.CM8Source);
 const first=page.locator('.study-card').first();
 await expect(first.locator('.audit-status')).toContainText('Triagem estrutural');
 await first.locator('.audit-info summary').click();
 await expect(first.locator('.audit-body')).toContainText('validação clínica');
 await first.locator('[data-action="done"]').click();
 await expect(page.locator('#nDone')).toHaveText('1');
 await page.locator('.study-card').first().locator('details.more-actions summary').click();
 await page.locator('.study-card').first().locator('[data-action="star"]').click();
 expect(await page.evaluate(()=>document.activeElement?.closest('details.more-actions')?.open===true)).toBeTruthy();
 await page.keyboard.press('Escape');
 await expect(page.locator('.study-card').first().locator('details.more-actions')).not.toHaveAttribute('open','');
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
 await page.goto('./');await page.waitForFunction(()=>window.CM8Source);
 const legacy={format:'cmn-flashcards-progresso',version:1,cards:{'1.1.1':{status:'done',star:true}}};
 await page.locator('#importFile').setInputFiles({name:'progresso-antigo.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy))});
 await expect(page.locator('#importReviewTitle')).toHaveText('Confirmar importação');
 await page.locator('#confirmImportBtn').click();
 await expect(page.locator('#nDone')).toHaveText('1');
 const downloadPromise=page.waitForEvent('download');
 await page.locator('#exportBtn').click();
 const download=await downloadPromise;
 expect(download.suggestedFilename()).toMatch(/\.xml$/);
 const fs=await import('node:fs/promises');
 const xml=await fs.readFile(await download.path(),'utf8');
 expect(xml).toContain('<cmn-progress');
 expect(xml).toContain('schema-version="1"');
 await page.locator('#importFile').setInputFiles({name:'progresso.xml',mimeType:'application/xml',buffer:Buffer.from(xml)});
 await expect(page.locator('#importReviewTitle')).toHaveText('Confirmar importação');
 await page.locator('#confirmImportBtn').click();
 await expect(page.locator('#nDone')).toHaveText('1');
});

test('invalid XML is rejected before overwriting existing progress',async({page})=>{
 await page.goto('./');await page.waitForFunction(()=>window.CM8Source);
 await page.locator('.study-card [data-action="done"]').first().click();
 await expect(page.locator('#nDone')).toHaveText('1');
 const invalid='<?xml version="1.0" encoding="UTF-8"?><cmn-progress format="cmn-flashcards-progresso" schema-version="1" exported-at="2026-11-15T00:00:00.000Z" card-count="970"><card id="1.1.1" status="invalid"/></cmn-progress>';
 await page.locator('#importFile').setInputFiles({name:'invalido.xml',mimeType:'application/xml',buffer:Buffer.from(invalid)});
 await expect(page.locator('#importReviewTitle')).toHaveText('Não foi possível importar');
 await expect(page.locator('#confirmImportBtn')).toBeHidden();
 await expect(page.locator('#nDone')).toHaveText('1');
});

test('conservative content formatting and classifying numbered lists',async({page})=>{
 await page.goto('./');await page.waitForFunction(()=>window.CM8Source);
 if(await page.locator('#mobileTopics').isVisible())await page.locator('#mobileTopics').click();
 await page.locator('#topicList [data-topic="1"]').click();
 await page.locator('#moreBtn').click();
 const item=page.locator('#card-1-5-2');
 await expect(item).toBeVisible();
 await item.locator('[data-action="reveal"]').first().click();
 await expect(item.locator('.answer-points > li').first()).toBeVisible();
 expect(await item.locator('.answer-points').first().evaluate(el=>el.tagName)).toBe('OL');
 expect(await item.locator('.answer-points').getAttribute('aria-label')).toBe('Itens numerados da resposta');
});

test('PWA manifests correct relative scope and offline shell on Chromium',async({page,context,browserName})=>{
 test.skip(browserName!=='chromium','Offline is verified on Chromium; engine emulation does not replace physical iOS Safari');
 await page.goto('./');await page.waitForFunction(()=>window.CM8Source);
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
  await expect(page.locator('#nTotal')).toHaveText('1206');
  await expect(page.locator('#listSub')).toContainText('1206 resultados');
 }finally{await context.setOffline(false);}
});


test('overdrive: a long clinical answer exposes semantic sections and a functional outline',async({page,isMobile})=>{
 await page.goto('./');await page.waitForFunction(()=>window.CM8Source);
 await page.locator('#searchBox').fill('4.2.5');
 await expect(page.locator('#card-4-2-5')).toBeVisible();
 await page.locator('#card-4-2-5 [data-action="reveal"]').first().click();
 const card=page.locator('#card-4-2-5');
 await expect(card.locator('section.answer-section')).toHaveCount(4);
 const nav=card.locator('nav.answer-outline');
 await expect(nav).toBeVisible();
 await expect(nav.locator('a')).toHaveCount(4);
 const sectionLink=nav.locator('a').nth(2);
 await expect(sectionLink).toHaveAttribute('href','#answer-4-2-5-3');
 if(isMobile)await sectionLink.tap();else await sectionLink.click();
 await expect(page).toHaveURL(/#answer-4-2-5-3$/);
 await expect(card.locator('#answer-4-2-5-3 h4')).toContainText('GESTAÇÃO');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2)).toBe(true);
});

test('overdrive: numbered medical classifications use native HTML ol/li',async({page})=>{
 await page.goto('./');await page.waitForFunction(()=>window.CM8Source);
 await page.locator('#searchBox').fill('2.5.3');
 await expect(page.locator('#card-2-5-3')).toBeVisible();
 await page.locator('#card-2-5-3 [data-action="reveal"]').first().click();
 const list=page.locator('#card-2-5-3 ol.answer-points').first();
 await expect(list).toBeVisible();
 await expect(list.locator(':scope > li')).toHaveCount(3);
 await expect(list.locator(':scope > li').first()).toHaveAttribute('value','1');
 await expect(list).toHaveAttribute('aria-label','Itens numerados da resposta');
});

test('overdrive: clinical formula is HTML with true superscripts, never raw LaTeX',async({page})=>{
 await page.goto('./');await page.waitForFunction(()=>window.CM8Source);
 await page.locator('#searchBox').fill('7.4.3');
 await expect(page.locator('#card-7-4-3')).toBeVisible();
 await page.locator('#card-7-4-3 [data-action="reveal"]').first().click();
 const card=page.locator('#card-7-4-3');
 await expect(card.locator('.answer-formula')).toHaveCount(1);
 await expect(card.locator('.answer-formula sup')).toHaveCount(2);
 await expect(card.locator('.answer-formula')).toContainText('Na+/K+');
 await expect(card.locator('.answer-copy')).not.toContainText('$\\text');
});

test('overdrive: case scenario and study question have correct native HTML structure',async({page})=>{
 await page.goto('./');await page.waitForFunction(()=>window.CM8Source);
 await page.locator('#searchBox').fill('1.CAS.01.R');
 await expect(page.locator('#card-1-CAS-01-R')).toBeVisible();
 const card=page.locator('#card-1-CAS-01-R');
 await expect(card.locator('.case-question .case-vignette')).toHaveCount(1);
 await expect(card.locator('.case-question h3.question.case-prompt')).toHaveCount(1);
 await expect(card.locator('p h3')).toHaveCount(0);
 await card.locator('[data-action="reveal"]').first().click();
 await expect(card.locator('.answer-copy p.answer-paragraph')).toHaveCount(1);
});

test('overdrive: all cards have unique IDs and the clinical audit count reflects focused replacement',async({page})=>{
 await page.goto('./');await page.waitForFunction(()=>window.CM8Source);
 const result=await page.evaluate(()=>{
  const data=window.CM8Source;
  const statuses={};for(const card of data.cards.filter(card=>!card.splitFrom))statuses[card.audit?.status]=(statuses[card.audit?.status]||0)+1;
  return{cards:data.cards.length,themes:data.themes.length,uniqueIds:new Set(data.cards.map(c=>c.id)).size,cases:data.cards.filter(c=>c.kind==='case').length,statuses};
 });
 expect(result).toMatchObject({cards:1206,themes:31,uniqueIds:1206,cases:240,statuses:{corrigido:289,triado:551,revisar:15,novo:240}});
});


test('polish: visual answer map references every original clinical section',async({page})=>{
 await page.goto('./');await page.waitForFunction(()=>window.CM8Source);
 await page.locator('#searchBox').fill('4.2.5');
 const card=page.locator('#card-4-2-5');
 await expect(card).toBeVisible();
 await card.locator('[data-action="reveal"]').click();
 const sections=card.locator('section.answer-section');
 const map=card.locator('nav.answer-outline');
 await expect(sections).toHaveCount(4);
 await expect(map.locator('a')).toHaveCount(4);
 await expect(map.locator('.answer-outline-node')).toHaveCount(4);
 await expect(map.locator('.answer-outline-title')).toContainText('Mapa da resposta');
 await map.locator('a').nth(2).click();
 await expect(page).toHaveURL(/#answer-4-2-5-3$/);
 await expect(card.locator('#answer-4-2-5-3')).toBeVisible();
});

test('polish: explicit mechanism and management labels get matching visual roles',async({page})=>{
 await page.goto('./');await page.waitForFunction(()=>window.CM8Source);
 await page.locator('#searchBox').fill('18.C.3');
 const card=page.locator('#card-18-C-3');
 await expect(card).toBeVisible();
 await card.locator('[data-action="reveal"]').click();
 await expect(card.locator('section.answer-section[data-role="mechanism"] .answer-subheading-text').filter({hasText:/^Fisiopatologia:$/})).toHaveCount(1);
 await expect(card.locator('section.answer-section[data-role="action"] .answer-subheading-text').filter({hasText:/^Manejo:$/})).toHaveCount(1);
 await expect(card.locator('.answer-outline-links').getByRole('link',{name:'Fisiopatologia',exact:false})).toBeVisible();
 await expect(card.locator('.answer-outline-links').getByRole('link',{name:'Manejo',exact:false})).toBeVisible();
});

test('polish: mobile answer navigation has touch target and no page overflow',async({page,isMobile})=>{
 test.skip(!isMobile,'Only emulated mobile runs');
 await page.goto('./');await page.waitForFunction(()=>window.CM8Source);
 await page.locator('#searchBox').fill('4.2.5');
 const card=page.locator('#card-4-2-5');
 await card.locator('[data-action="reveal"]').click();
 const link=card.locator('.answer-outline-links a').first();
 const box=await link.boundingBox();
 expect(box.height).toBeGreaterThanOrEqual(44);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2)).toBeTruthy();
 await link.click();
 await expect(page).toHaveURL(/#answer-4-2-5-1$/);
});
