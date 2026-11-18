import {test,expect} from '@playwright/test';
const ready=async(page,path='./')=>{await page.goto(path);await expect(page.locator('#workspace')).toHaveAttribute('aria-busy','false');};
test('three real pages have accessible navigation, isolated content and no overflow',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [url,kind] of [['./','study'],['./estatisticas.html','stats'],['./configuracoes.html','settings']]){
  await ready(page,url);await expect(page.locator('.app-navigation a[aria-current=page]')).toHaveAttribute('data-page-link',kind);
  await expect(page.locator('.app-navigation a')).toHaveCount(3);
  if(kind==='study'){await expect(page.locator('.study-card').first()).toBeVisible();await expect(page.locator('#nReadTotal')).toBeHidden();}
  if(kind==='stats'){await expect(page.locator('#nReadTotal')).toBeVisible();await expect(page.locator('.study-card').first()).toBeHidden();}
  if(kind==='settings'){await expect(page.locator('#exportBtn')).toBeVisible();await expect(page.locator('#fsrsDaily')).toBeVisible();}
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();const bounds=await page.locator('.app-navigation a').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().height));expect(bounds.every(h=>h>=44)).toBeTruthy();}
 }
 expect(errors).toEqual([]);
});
test('readings and manual status persist across pages and stats link to filtered study',async({page})=>{
 await ready(page);await page.locator('.study-card').first().locator('[data-action=count-read]').click();await page.locator('.study-card').first().locator('[data-action=done]').click();
 await page.locator('[data-page-link=stats]').click();await expect(page.locator('#nReadTotal')).toHaveText('1');await expect(page.locator('#nDone')).toHaveText('1');await page.locator('[data-jump=done]').click();await expect(page.locator('[data-filter=done]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('.study-card')).toHaveCount(1);await page.locator('[data-filter=all]').click();await expect(page.locator('.study-card')).toHaveCount(22);await page.goBack();await expect(page.locator('.study-card')).toHaveCount(1);
});
test('settings preserve daily limit and theme and confirm imports',async({page})=>{
 await ready(page,'./configuracoes.html');await page.locator('#themeBtn').click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await page.locator('#fsrsDaily').fill('7');await page.locator('#fsrsDaily').press('Tab');await page.reload();await expect(page.locator('#fsrsDaily')).toHaveValue('7');await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.locator('#importFile').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'cmn-flashcards-progresso',version:1,cards:{'1.1.1':{status:'done'}}}))});await expect(page.locator('#confirmImportBtn')).toBeVisible();await page.locator('#cancelImportBtn').click();await expect(page.locator('#importReview')).toBeHidden();
});
test('each page keeps its own offline navigation fallback',async({page,context,browserName})=>{
 test.skip(browserName==='webkit','WebKit disconnected navigation is covered by origin-unavailable test');
 await ready(page);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);
 for(const [path,title] of [['./estatisticas.html?offline=1','Estatísticas'],['./configuracoes.html?offline=1','Configurações'],['./index.html?offline=1','Estudar']]){await ready(page,path);await expect(page.locator('h1:visible')).toHaveText(title);}
 await context.setOffline(false);
});

test('FSRS totals are visible on statistics after a real study review',async({page})=>{
 await ready(page);await expect(page.locator('#startReviewBtn')).toBeEnabled();await page.locator('#startReviewBtn').click();await page.locator('[data-action=reveal]').first().click();await page.locator('[data-grade="3"]').click();await expect(page.locator('#fsrsUndoBtn')).toBeEnabled();await page.locator('[data-page-link=stats]').click();await expect(page.locator('#nFSRSCards')).toHaveText('1');await expect(page.locator('#nFSRSCards')).toBeVisible();await expect(page.locator('#nFSRSToday')).toHaveText('1');
});
