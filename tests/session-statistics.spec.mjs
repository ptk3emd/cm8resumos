import {settingsFor} from './page-navigation.mjs';
import {test,expect} from '@playwright/test';

async function ready(page){await page.goto('./');await expect(page.locator('#nFSRSCards')).toHaveText('0');}
async function rate(page){await page.locator('[data-action="reveal"]').first().click();await page.locator('[data-grade="3"]').click();await expect(page.locator('#fsrsUndoBtn')).toBeEnabled();}
async function firstReview(page){await page.locator('#startReviewBtn').click();await rate(page);await expect(page.locator('#nFSRSCards')).toHaveText('1');}
async function records(page){return page.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('cm8-fsrs-v1');r.onsuccess=()=>{const db=r.result,tx=db.transaction('cards'),q=tx.objectStore('cards').getAll();q.onsuccess=()=>resolve(q.result);tx.oncomplete=()=>db.close();};}));}

test('registered readings sum across the library, ignore unknown IDs and stay independent of filters',async({page})=>{
 await ready(page);await page.evaluate(()=>CMNProgressIO.applyReadCounts({'1.1.1':3,'2.1.1':5,'999.9.9':100}));await expect(page.locator('#nReadTotal')).toHaveText('8');
 await page.locator('#searchBox').fill('1.1.1');await expect(page.locator('#card-1-1-1')).toBeVisible();await expect(page.locator('#nReadTotal')).toHaveText('8');
 await page.locator('#card-1-1-1 [data-action="reveal"]').click();await expect(page.locator('#nReadTotal')).toHaveText('8');
 await page.locator('#card-1-1-1 [data-action="count-read"]').click();await expect(page.locator('#nReadTotal')).toHaveText('9');await expect(page.locator('#nFSRSCards')).toHaveText('0');
 await page.locator('#card-1-1-1 [data-action="done"]').click();await expect(page.locator('#nReadTotal')).toHaveText('9');
 await page.reload();await expect(page.locator('#nReadTotal')).toHaveText('9');
});

test('FSRS cards are distinct, ratings count repetitions, and undo restores the totals',async({page})=>{
 await ready(page);await firstReview(page);await expect(page.locator('#nFSRSReviews')).toHaveText('1');await expect(page.locator('#nFSRSToday')).toHaveText('1');await expect(page.locator('#nReadTotal')).toHaveText('0');
 const original=(await records(page))[0];await page.clock.setFixedTime(new Date(original.card.dueAt));await page.reload();await page.locator('[data-mode="fsrs"]').click();
 await rate(page);await expect(page.locator('#nFSRSReviews')).toHaveText('2');await expect(page.locator('#nFSRSCards')).toHaveText('1');await expect(page.locator('#nFSRSToday')).toHaveText('1');
 await page.locator('#fsrsUndoBtn').click();await expect(page.locator('#fsrsFeedbackText')).toContainText('Avaliação desfeita');await expect(page.locator('#nFSRSReviews')).toHaveText('1');await expect(page.locator('#nFSRSCards')).toHaveText('1');await expect(page.locator('#nFSRSToday')).toHaveText('0');
});

test('undoing the first-ever rating returns activity to zero without erasing readings',async({page})=>{
 await ready(page);await page.evaluate(()=>CMNProgressIO.applyReadCounts({'1.1.1':4}));await firstReview(page);await page.locator('#fsrsUndoBtn').click();
 await expect(page.locator('#nFSRSReviews')).toHaveText('0');await expect(page.locator('#nFSRSCards')).toHaveText('0');await expect(page.locator('#nReadTotal')).toHaveText('4');
});

test('readings and FSRS activity synchronize across tabs without reloading the dashboard',async({page,context})=>{
 await ready(page);const other=await context.newPage();await other.goto('./');await expect(other.locator('#nFSRSCards')).toHaveText('0');
 await other.locator('[data-action="count-read"]').first().click();await expect(page.locator('#nReadTotal')).toHaveText('1');await expect(page.locator('.cmn-read-number').first()).toHaveText('1');
 await firstReview(other);await expect(page.locator('#nFSRSCards')).toHaveText('1');await expect(page.locator('#nFSRSReviews')).toHaveText('1');
 await other.evaluate(()=>CMNProgressIO.applyReadCounts({}));await expect(page.locator('#nReadTotal')).toHaveText('0');
});

test('XML import updates reading totals through the actual confirmation flow',async({page})=>{
 await ready(page);const xml=await page.evaluate(()=>{CMNProgressIO.applyReadCounts({'1.1.1':7,'2.1.1':2});const text=CMNProgressIO.encodeXML({},1206);CMNProgressIO.applyReadCounts({});return text;});
 await expect(page.locator('#nReadTotal')).toHaveText('0');await (await settingsFor(page)).locator('#importFile').setInputFiles({name:'leituras.xml',mimeType:'application/xml',buffer:Buffer.from(xml)});await (await settingsFor(page)).locator('#confirmImportBtn').click();await expect(page.locator('#nReadTotal')).toHaveText('9');await page.reload();await expect(page.locator('#nReadTotal')).toHaveText('9');
});

test('unavailable FSRS storage is displayed as unavailable, never as zero',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(window,'indexedDB',{value:{open(){throw Error('Unavailable for test');}}});});await page.goto('./');
 await expect(page.locator('#reviewStartSummary')).toContainText('Histórico indisponível');await expect(page.locator('#fsrsActivityDefinition')).toContainText('Histórico indisponível');await expect(page.locator('#nFSRSCards')).toHaveText('—');await expect(page.locator('#nFSRSReviews')).toHaveText('—');await expect(page.locator('#nReadTotal')).toHaveText('0');await expect(page.locator('#fsrsActivityMetric')).toHaveAttribute('aria-busy','false');
});

test('today resets at the local date boundary without resetting cumulative activity',async({page})=>{
 await page.clock.install({time:new Date(2026,10,17,12,0,0)});await ready(page);await firstReview(page);await expect(page.locator('#nFSRSToday')).toHaveText('1');const untilMidnight=await page.evaluate(()=>{const now=new Date();return +new Date(now.getFullYear(),now.getMonth(),now.getDate()+1)-Date.now()+1000;});await page.clock.fastForward(untilMidnight);await expect(page.locator('#nFSRSToday')).toHaveText('0');await expect(page.locator('#nFSRSCards')).toHaveText('1');await expect(page.locator('#nFSRSReviews')).toHaveText('1');
});

test('large counts, dark theme and reduced motion remain usable at narrow widths',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await ready(page);await page.evaluate(()=>CMNProgressIO.applyReadCounts({'1.1.1':10000000,'2.1.1':10000000}));await expect(page.locator('#nReadTotal')).toHaveText('20.000.000');await (await settingsFor(page)).locator('#themeBtn').click();
 for(const width of [320,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();}
 expect(await page.locator('#nReadTotal').evaluate(e=>e.getAnimations().length)).toBe(0);
 await page.waitForTimeout(200);
 const ratios=await page.locator('#startFocusBtn,#mobileTopics,.session-definition,.session-heading>span').evaluateAll(nodes=>{
  const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number),lum=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  return nodes.map(e=>{const foreground=lum(rgb(getComputedStyle(e).color)),background=lum(rgb(getComputedStyle(document.body).backgroundColor));return (Math.max(foreground,background)+.05)/(Math.min(foreground,background)+.05);});
 });expect(ratios.every(ratio=>ratio>=4.5)).toBeTruthy();
 await page.goto('./estatisticas.html');await expect(page.locator('#workspace')).toHaveAttribute('aria-busy','false');await expect(page.locator('[data-jump="done"]')).toBeVisible();await page.locator('[data-jump="done"]').click();await expect(page.locator('[data-filter="done"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#nReadTotal')).toHaveText('20.000.000');
});


test('stored scheduler records without review logs do not count as completed flashcards',async({page})=>{
 await ready(page);await page.evaluate(async()=>{
  const s=await CM8FSRS.DefaultScheduler({version:'FSRS-7',desiredRetention:.9}),now=new Date(),card=s.review({card:s.newCard({cardId:'1.1.1',now}),grade:3,now}).card;
  await new Promise((resolve,reject)=>{const r=indexedDB.open('cm8-fsrs-v1');r.onsuccess=()=>{const db=r.result,tx=db.transaction('cards','readwrite');tx.objectStore('cards').put({id:'1.1.1',card,logs:[]});tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});
 });await page.reload();await expect(page.locator('#nFSRSCards')).toHaveText('0');await expect(page.locator('#nFSRSReviews')).toHaveText('0');expect(await records(page)).toHaveLength(1);
});
