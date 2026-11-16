import {test,expect} from '@playwright/test';

test('manual read counter stays independent of studied/review actions and persists',async({page})=>{
 await page.goto('./');
 const first=page.locator('.study-card').first();
 const id=await first.getAttribute('id');
 await expect(first.locator('.cmn-read-number')).toHaveText('0');
 const button=first.locator('[data-action="count-read"]');
 const box=await button.boundingBox();
 expect(box.height).toBeGreaterThanOrEqual(44);
 await button.click();
 await expect(first.locator('.cmn-read-number')).toHaveText('1');
 await first.locator('[data-action="done"]').click();
 await expect(first.locator('.cmn-read-number')).toHaveText('1');
 await expect(page.locator('#nDone')).toHaveText('1');
 await first.locator('[data-action="review"]').click();
 await expect(first.locator('.cmn-read-number')).toHaveText('1');
 await expect(page.locator('#nReview')).toHaveText('1');
 await page.reload();
 await expect(page.locator('#'+id+' .cmn-read-number')).toHaveText('1');
 await page.locator('#'+id+' [data-action="count-read"]').click();
 await expect(page.locator('#'+id+' .cmn-read-number')).toHaveText('2');
 await expect(page.locator('#nReview')).toHaveText('1');
});

test('XML backup retains read totals and restores after import',async({page,isMobile})=>{
 await page.goto('./');
 const first=page.locator('.study-card').first();
 await first.locator('[data-action="count-read"]').click();
 await first.locator('[data-action="count-read"]').click();
 const downloadPromise=page.waitForEvent('download');
 await page.locator('#exportBtn').click();
 const download=await downloadPromise;
 const fs=await import('node:fs/promises');
 const xml=await fs.readFile(await download.path(),'utf8');
 expect(xml).toMatch(/read-count="2"/);
 await page.evaluate(()=>localStorage.removeItem('cmn-flashcards-read-counts-v1'));
 await page.reload();
 await expect(page.locator('.study-card .cmn-read-number').first()).toHaveText('0');
 await page.locator('#importFile').setInputFiles({name:'leituras.xml',mimeType:'application/xml',buffer:Buffer.from(xml)});
 await expect(page.locator('#importReviewTitle')).toHaveText('Confirmar importação');
 const confirm=page.locator('#confirmImportBtn');
 if(isMobile)await confirm.tap();else await confirm.click();
 await expect(page.locator('#importReview')).toBeHidden();
 await expect(page.locator('.study-card .cmn-read-number').first()).toHaveText('2');
});

test('read count XML rejects invalid values without mutating storage',async({page})=>{
 await page.goto('./');
 await page.locator('.study-card [data-action="count-read"]').first().click();
 const bad='<?xml version="1.0" encoding="UTF-8"?><cmn-progress format="cmn-flashcards-progresso" schema-version="1" exported-at="2026-11-16T00:00:00.000Z" card-count="1206"><card id="1.1.1" read-count="-1"/></cmn-progress>';
 await page.locator('#importFile').setInputFiles({name:'invalid.xml',mimeType:'application/xml',buffer:Buffer.from(bad)});
 await expect(page.locator('#importReviewTitle')).toHaveText('Não foi possível importar');
 await expect(page.locator('.study-card .cmn-read-number').first()).toHaveText('1');
});

test('XML readings wait for the effective confirmation after another tab changes progress',async({page})=>{
 await page.goto('./');
 await page.locator('.study-card [data-action="count-read"]').first().click();
 const xml=await page.evaluate(()=>CMNProgressIO.encodeXML({},1206));
 await page.locator('.study-card [data-action="count-read"]').first().click();
 await page.locator('#importFile').setInputFiles({name:'readings.xml',mimeType:'application/xml',buffer:Buffer.from(xml)});
 await expect(page.locator('#importReviewTitle')).toHaveText('Confirmar importação');
 await page.evaluate(()=>{
  const key='cmn-flashcards-v1',saved=JSON.parse(localStorage.getItem(key)||'{}');
  saved.cards={'1.1.1':{star:true}};
  localStorage.setItem(key,JSON.stringify(saved));
 });
 await page.locator('#confirmImportBtn').click();
 await expect(page.locator('#importReviewTitle')).toHaveText('Progresso alterado em outra aba');
 await expect(page.locator('.study-card .cmn-read-number').first()).toHaveText('2');
 await page.locator('#confirmImportBtn').click();
 await expect(page.locator('.study-card .cmn-read-number').first()).toHaveText('1');
});
