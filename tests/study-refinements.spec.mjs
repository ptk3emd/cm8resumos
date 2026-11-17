import {test,expect} from '@playwright/test';

async function rows(page){return page.evaluate(()=>new Promise((resolve,reject)=>{
 const request=indexedDB.open('cm8-fsrs-v1');request.onsuccess=()=>{const db=request.result,tx=db.transaction('cards'),q=tx.objectStore('cards').getAll();q.onsuccess=()=>resolve(q.result);tx.oncomplete=()=>db.close();tx.onerror=()=>reject(tx.error);};request.onerror=()=>reject(request.error);
}));}
async function start(page){await page.goto('./');await page.locator('#startReviewBtn').click();}
async function grade(page){await page.locator('[data-action=reveal]').first().click();await page.locator('[data-grade="3"]').click();await expect(page.locator('#fsrsUndoBtn')).toBeEnabled();await expect(page.locator('#fsrsFeedbackText')).toContainText('Avaliado como');}
async function seedDependents(page){
 await page.goto('./');await expect(page.locator('#startReviewBtn')).toBeEnabled();
 await page.locator('#studyOverview summary').first().click();await page.locator('#cognitiveTools summary').click();await page.locator('#cognitiveEnabled').check();
 await page.evaluate(async()=>{
  const s=await CM8FSRS.DefaultScheduler({version:'FSRS-7',desiredRetention:.9,enableFuzz:false}),last=new Date(Date.now()-30*86400000);
  const values=['26.1.2','26.1.3','26.1.4'].map(id=>{let c=s.review({card:s.newCard({cardId:id,now:last}),grade:4,now:last}).card;c={...c,stability:60,stabilityFast:10,difficulty:5,reps:4};c.scheduledDays=s.nextInterval(c,.9,{card:c,grade:3,elapsedDays:0});c.dueAt=new Date(+last+c.scheduledDays*86400000);return {id,card:c,logs:[]};});
  await new Promise((resolve,reject)=>{const r=indexedDB.open('cm8-fsrs-v1');r.onsuccess=()=>{const db=r.result,tx=db.transaction('cards','readwrite');for(const row of values)tx.objectStore('cards').put(row);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});
 });await page.reload();await page.locator('#searchBox').fill('26.1.1');await expect(page.locator('#listSub')).toContainText('1 resultado');await page.locator('[data-mode=fsrs]').click();return rows(page);
}

test('undo restores a new card, quota and independent manual/read progress, including an empty queue',async({page})=>{
 await start(page);await page.locator('#fsrsDaily').fill('1');await page.locator('#fsrsDaily').dispatchEvent('change');
 await page.locator('[data-mode=focus]').click();await page.locator('[data-action=done]').first().click();await page.locator('[data-action=count-read]').first().click();
 await page.locator('[data-mode=fsrs]').click();await grade(page);await expect(page.locator('#fsrsSummary')).toContainText('0 novos');await expect(page.locator('.fsrs-empty')).toContainText('Limite diário');
 await page.locator('#fsrsUndoBtn').click();await expect(page.locator('#fsrsFeedbackText')).toContainText('Avaliação desfeita');await expect(page.locator('.meta-id')).toHaveText('1.1.1');await expect(page.locator('.answer-box')).toBeVisible();await expect(page.locator('#fsrsSummary')).toContainText('1 novos');
 expect(await rows(page)).toEqual([]);await expect(page.locator('#nDone')).toHaveText('1');await expect(page.locator('.cmn-read-number')).toHaveText('1');
 await page.reload();expect(await rows(page)).toEqual([]);await expect(page.locator('#nDone')).toHaveText('1');await expect(page.locator('.cmn-read-number').first()).toHaveText('1');
});

test('undo rolls back the anchor and every propagated interval atomically',async({page})=>{
 const before=await seedDependents(page);await grade(page);await expect.poll(async()=>(await rows(page)).length).toBe(4);
 const after=await rows(page);expect(after.some(row=>row.graphBonus)).toBeTruthy();await page.locator('#fsrsUndoBtn').click();await expect(page.locator('#fsrsFeedbackText')).toContainText('Avaliação desfeita');expect(await rows(page)).toEqual(before);
 await expect(page.locator('#fsrsUndoBtn')).toBeHidden();await page.reload();expect(await rows(page)).toEqual(before);
});

test('undo never overwrites a dependent changed by another tab',async({page,context})=>{
 await seedDependents(page);await grade(page);await expect.poll(async()=>(await rows(page)).length).toBe(4);
 const other=await context.newPage();await other.goto('./');await expect(other.locator('#startReviewBtn')).toBeEnabled();
 await other.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('cm8-fsrs-v1');r.onsuccess=()=>{const db=r.result,tx=db.transaction('cards','readwrite'),store=tx.objectStore('cards'),q=store.get('26.1.2');q.onsuccess=()=>store.put({...q.result,updatedByOtherTab:true});tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};}));
 const changed=await rows(other);await page.locator('#fsrsUndoBtn').click();await expect(page.locator('#fsrsFeedbackText')).toContainText('mudou em outra aba');expect(await rows(page)).toEqual(changed);
});

test('only the latest grade is undone and previous reviews persist',async({page})=>{
 await start(page);await grade(page);await expect.poll(async()=>(await rows(page)).length).toBe(1);const first=await rows(page);
 await grade(page);await expect.poll(async()=>(await rows(page)).length).toBe(2);await page.locator('#fsrsUndoBtn').click();await expect(page.locator('#fsrsFeedbackText')).toContainText('Avaliação desfeita');expect(await rows(page)).toEqual(first);
});

test('entry is compact, metadata and header targets readable, and dark reading counter meets AA',async({page})=>{
 await page.goto('./');await expect(page.locator('#contentMap')).not.toHaveAttribute('open','');
 const result=await page.evaluate(()=>({y:document.querySelector('.study-card').getBoundingClientRect().top,overflow:document.documentElement.scrollWidth>innerWidth,targets:[...document.querySelectorAll('.topbtn')].map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}))}));
 expect(result.y).toBeLessThan(1100);expect(result.overflow).toBeFalsy();for(const box of result.targets){expect(box.w).toBeGreaterThanOrEqual(44);expect(box.h).toBeGreaterThanOrEqual(44);}
 await page.locator('#themeBtn').click();await page.waitForTimeout(300);
 const contrast=await page.locator('.cmn-read-counter').first().evaluate(e=>{
  const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number),lum=rgb=>rgb.map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((v,n,i)=>v+n*[.2126,.7152,.0722][i],0);
  const a=lum(rgb(getComputedStyle(e).color)),b=lum(rgb(getComputedStyle(e.closest('.study-card')).backgroundColor));return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 });expect(contrast).toBeGreaterThanOrEqual(4.5);
});

test('metric action explains experimental opt-in without enabling it silently',async({page})=>{
 await page.goto('./');await page.locator('#studyOverview summary').first().click();await page.locator('.cognitive-metrics summary').click();await page.locator('[data-metric-practice=gist]').click();await expect(page.locator('#cognitiveEnabled')).toBeFocused();await expect(page.locator('#cognitiveEnabled')).not.toBeChecked();await expect(page.locator('#cognitiveStateHint')).toContainText('desativada');
});

test('undo restores an existing review with its complete previous log',async({page})=>{
 await start(page);await grade(page);await expect.poll(async()=>(await rows(page)).length).toBe(1);const before=await rows(page);
 await page.clock.setFixedTime(new Date(before[0].card.dueAt));await page.reload();await page.locator('#startReviewBtn').click();await expect(page.locator('.meta-id')).toHaveText(before[0].id);
 await grade(page);await expect.poll(async()=>(await rows(page)).find(row=>row.id===before[0].id).logs.length).toBe(2);
 await page.locator('#fsrsUndoBtn').click();await expect(page.locator('#fsrsFeedbackText')).toContainText('Avaliação desfeita');expect(await rows(page)).toEqual(before);
});
