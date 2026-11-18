import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

test('static entry has external CSS, JavaScript and byte-identical medical JSON',async({page,request})=>{
 const html=await (await request.get('./')).text();
 expect(html).not.toMatch(/<style\b|<script(?![^>]*\bsrc=)[^>]*>/i);
 const data=await readFile(new URL('../data/flashcards.json',import.meta.url));
 expect(createHash('sha256').update(data).digest('hex')).toBe('b14362b069985d9ae1c01b02e3ee5c8ef521f5a0269f9e15fcc0aa3abb0526df');
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('./');await expect(page.locator('#workspace')).toHaveAttribute('aria-busy','false');
 await expect(page.locator('.study-card')).toHaveCount(22);
 expect(errors).toEqual([]);
 const cachePaths=await page.evaluate(async()=>{await navigator.serviceWorker.ready;const names=await caches.keys();const cache=await caches.open(names.find(n=>n.startsWith('cm8resumos-shell-')));return (await cache.keys()).map(r=>new URL(r.url).pathname);});
 for(const path of ['/assets/app.css','/assets/app.js','/assets/fsrs.js','/data/flashcards.json'])expect(cachePaths).toContain(path);
});

test('failed JSON loading offers retry and preserves existing progress',async({page,context})=>{
 await context.addInitScript(()=>localStorage.setItem('cmn-flashcards-v1',JSON.stringify({cards:{'1.1.1':{status:'done'}}})));
 await page.route('**/data/flashcards.json',route=>route.fulfill({status:503,body:'unavailable'}));
 await page.goto('./');await expect(page.locator('#libraryLoadStatus')).toContainText('Seu progresso salvo foi preservado');
 await expect(page.locator('#retryLibrary')).toBeVisible();
 await expect(page.locator('#workspace')).toHaveAttribute('inert','');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('cmn-flashcards-v1')).cards['1.1.1'].status)).toBe('done');
 await page.unroute('**/data/flashcards.json');await page.locator('#retryLibrary').click();
 await expect(page.locator('#libraryLoad')).toBeHidden();await expect(page.locator('#nDone')).toHaveText('1');
 await expect(page.locator('.study-card')).toHaveCount(22);
});

test('returning users land on compact tools without losing data or keyboard access',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('cm8.guideOpen','1');localStorage.setItem('cm8.exploreOpen','1');localStorage.setItem('cm8.mapOpen','1');});
 await page.goto('./');await expect(page.locator('#workspace')).toHaveAttribute('aria-busy','false');
 for(const id of ['studyGuide','studyOverview'])await expect(page.locator('#'+id)).not.toHaveAttribute('open','');
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:1000});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
  const top=await page.locator('.study-card').first().evaluate(e=>e.getBoundingClientRect().top);
  expect(top).toBeLessThan(width===320?1000:900);
 }
 await page.locator('[data-page-link=stats]').focus();await page.keyboard.press('Enter');await expect(page.locator('#nDone')).toBeVisible();
});
