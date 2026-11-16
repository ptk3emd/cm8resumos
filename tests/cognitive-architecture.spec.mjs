import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
async function open(page){await page.goto('./');await page.locator('#cognitiveTools summary').click();await page.locator('#cognitiveEnabled').check();await expect(page.locator('#cognitiveToday')).toContainText('revisados hoje');}
async function dump(page){return page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('cm8-fsrs-v1');r.onsuccess=()=>{const db=r.result,tx=db.transaction('cards'),q=tx.objectStore('cards').getAll();q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);tx.oncomplete=()=>db.close();};r.onerror=()=>reject(r.error);}));}
async function seed(page,ids,reps=4){return page.evaluate(async({ids,reps})=>{
 const scheduler=await CM8FSRS.DefaultScheduler({version:'FSRS-7',desiredRetention:.9,enableFuzz:false}),now=new Date(),last=new Date(now-30*86400000);
 const rows=ids.map(id=>{let card=scheduler.review({card:scheduler.newCard({cardId:id,now:last}),grade:4,now:last}).card;card={...card,stability:60,stabilityFast:10,difficulty:5,reps};const days=scheduler.nextInterval(card,.9,{card,grade:3,elapsedDays:0});card.dueAt=new Date(last.getTime()+days*86400000);card.scheduledDays=days;return {id,card,logs:[]};});
 await new Promise((resolve,reject)=>{const r=indexedDB.open('cm8-fsrs-v1');r.onsuccess=()=>{const db=r.result,tx=db.transaction('cards','readwrite');for(const row of rows)tx.objectStore('cards').put(row);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});return rows;
 },{ids,reps});}

test('cognitive: graph covers every hub, rejects cycles, and propagation caps S without D or fake reviews',async({page})=>{
 await open(page);
 const result=await page.evaluate(async()=>{
  const data=JSON.parse(document.querySelector('#sourceData').textContent),state=CMNCognitive.migrate(data.cards);state.enabled=true;
  const graph=CMNCognitive.graph(data.cards,state),s=await CM8FSRS.DefaultScheduler({version:'FSRS-7',desiredRetention:.9,enableFuzz:false}),last=new Date('2026-01-01'),rows=new Map();
  for(const id of ['26.1.2','26.1.3','26.1.4']){let c=s.review({card:s.newCard({cardId:id,now:last}),grade:4,now:last}).card;c={...c,stability:60,stabilityFast:10,difficulty:5};c.scheduledDays=s.nextInterval(c,.9,{card:c,grade:3,elapsedDays:0});c.dueAt=new Date(+last+c.scheduledDays*86400000);rows.set(id,{id,card:c,logs:[]});}
  const before=structuredClone([...rows.values()]),interval=(id,c)=>s.nextInterval(c,.9,{card:c,grade:3,elapsedDays:0});
  let updates=CMNCognitive.propagateStability('26.1.1',3,rows,graph,state,interval);const delta=updates.map((r,i)=>(+r.card.dueAt-+before[i].card.dueAt)/86400000);
  for(let i=0;i<20;i++){for(const row of updates)rows.set(row.id,row);updates=CMNCognitive.propagateStability('26.1.1',3,rows,graph,state,interval);}
  const invalid=structuredClone(state);invalid.metadata['26.1.1'].dependsOn=['26.1.2'];let cycle=false;try{CMNCognitive.validate(invalid,new Set(data.cards.map(c=>c.id)));}catch{cycle=true;}
  return {hubs:Object.keys(graph).filter(k=>k.startsWith('theme:')).length,delta,capped:updates.every(r=>r.card.stability<=90&&r.card.difficulty===5&&r.card.reps===1&&r.logs.length===0),again:CMNCognitive.propagateStability('26.1.1',1,rows,graph,state,interval).length,cycle};
 });
 expect(result.hubs).toBe(31);expect(result.delta).toHaveLength(3);expect(result.delta.every(d=>d>=1)).toBeTruthy();expect(result.capped).toBeTruthy();expect(result.again).toBe(0);expect(result.cycle).toBeTruthy();
});

test('cognitive: XML round trip preserves graph, confusables, variants and metrics; legacy remains valid',async({page})=>{
 await open(page);
 const r=await page.evaluate(()=>{
  const data=JSON.parse(document.querySelector('#sourceData').textContent),ids=new Set(data.cards.map(c=>c.id)),state=CMNCognitive.migrate(data.cards);state.enabled=true;
  state.events=[{id:'test-1',kind:'contrast',cardId:'26.1.1',topic:26,time:new Date().toISOString(),success:1,total:2,cycle:1,variant:0}];
  const xml=CMNProgressIO.encodeXML({'26.1.1':{star:true}},data.cards.length,state),decoded=CMNProgressIO.parse(xml,ids);
  let invalid=false;try{CMNProgressIO.parse(xml.replace('success="1"','success="99"'),ids);}catch{invalid=true;}
  return {state:CMNCognitive.validate(state,ids),decoded:decoded.cognitive,marks:decoded.cards,legacy:CMNProgressIO.parse(CMNProgressIO.encodeXML({'26.1.1':{star:true}},1206),ids),invalid,xml};
 });
 expect(r.decoded).toEqual(r.state);expect(r.marks['26.1.1'].star).toBe(true);expect(r.legacy.cognitive).toBeUndefined();expect(r.invalid).toBe(true);
 await fs.writeFile('/tmp/cm8-cognitive-roundtrip.xml',r.xml);
});

test('cognitive: pool partition is disjoint, complete and includes linked verbatim items',async({page})=>{
 await open(page);const x=await page.evaluate(()=>{const data=JSON.parse(document.querySelector('#sourceData').textContent),state=CMNCognitive.migrate(data.cards);state.enabled=true;const p=CMNCognitive.pools(data.cards,new Map(),state);return {A:p.A.length,B:p.B.length,n:data.cards.length,unique:new Set([...p.A,...p.B].map(c=>c.id)).size,linked:p.A.some(c=>c.id==='26.1.1'),transfer:p.B.some(c=>c.id==='26.1.3')};});
 expect(x.A+x.B).toBe(x.n);expect(x.unique).toBe(x.n);expect(x.linked&&x.transfer).toBeTruthy();
 await page.locator('[data-mode=fsrs]').click();await page.locator('[data-pool=B]').click();await expect(page.locator('.study-card .chip').filter({hasText:/Gist|Transferência/})).toBeVisible();
 await page.locator('[data-pool=C]').click();await expect(page.locator('#listTitle')).toHaveText('Intervenções agendadas');await expect(page.locator('[data-session-index]')).toHaveCount(31);
});

test('cognitive: contextual session leaves FSRS untouched and suppresses weekly reminder',async({page})=>{
 await open(page);await page.locator('#cognitiveTopic').selectOption('26');const before=await dump(page);
 await page.locator('[data-practice=context]').click();await expect(page.locator('.context-card')).toHaveCount(15);await expect(page.locator('[data-cognitive-action=reveal]')).toHaveCount(1);
 await page.locator('[data-cognitive-action=reveal]').click();await page.locator('[data-cognitive-action=success]').click();await expect(page.locator('.intervention')).toContainText('Prática registrada');expect(await dump(page)).toEqual(before);
 await page.locator('[data-cognitive-action=back]').click();await page.locator('[data-pool=C]').click();await expect(page.locator('[data-session-index]')).toHaveCount(30);
 await page.reload();await expect(page.locator('#cognitiveToday')).toContainText('1 intervenções');
});

test('cognitive: contrast after four reviews has actual matching, separate accuracy and no FSRS mutation',async({page})=>{
 await open(page);await seed(page,['26.2.1']);await page.reload();await page.locator('[data-mode=fsrs]').click();await page.locator('[data-pool=C]').click();await expect(page.locator('[data-session-index]').filter({hasText:'Contraste'})).toHaveCount(1);
 await page.locator('[data-session-index]').filter({hasText:'Contraste'}).click();const before=await dump(page);await page.locator('#contrast-0').selectOption('26.2.1');await page.locator('#contrast-1').selectOption('26.2.2');await page.locator('#contrastForm button[type=submit]').click();await expect(page.locator('.intervention')).toContainText('2 de 2');expect(await dump(page)).toEqual(before);await page.locator('.cognitive-metrics summary').click();await expect(page.locator('#cognitiveMetrics')).toContainText('100%');
});

test('cognitive: real anchor rating commits propagation to at least three mature dependents',async({page})=>{
 await open(page);const before=await seed(page,['26.1.2','26.1.3','26.1.4']);await page.reload();await page.locator('#searchBox').fill('26.1.1');await page.locator('[data-mode=fsrs]').click();await page.locator('[data-action=reveal]').first().click();await page.locator('[data-grade="3"]').click();await expect.poll(async()=> (await dump(page)).length).toBe(4);
 const after=await dump(page);for(const b of before){const a=after.find(r=>r.id===b.id);expect((Date.parse(a.card.dueAt)-Date.parse(b.card.dueAt))/86400000).toBeGreaterThanOrEqual(1);expect(a.card.difficulty).toBe(b.card.difficulty);expect(a.card.reps).toBe(b.card.reps);}
});

test('cognitive: real retention policies use unchanged model and measured longer intervals',async({page})=>{
 await open(page);const x=await page.evaluate(async()=>{const intervals={};for(const [type,desiredRetention] of Object.entries(CMNCognitive.RETENTION)){const s=await CM8FSRS.DefaultScheduler({version:'FSRS-7',desiredRetention,enableFuzz:false,enableShortTerm:false});let now=new Date('2025-01-01'),c=s.newCard({cardId:'measure',now});const samples=[];for(let i=0;i<6;i++){now=new Date(+now+30*86400000);c=s.review({card:c,grade:3,now}).card;samples.push(c.scheduledDays);}intervals[type]=samples;}return intervals;});
 for(let i=0;i<6;i++){expect(x.gist[i]).toBeGreaterThan(x.verbatim[i]);expect(x.transfer[i]).toBeGreaterThan(x.gist[i]);}
 console.log('RETENTION_RATIO',x.gist.reduce((s,v,i)=>s+v/x.verbatim[i],0)/6); // No artificial 20–30% clamp.
});

test('cognitive: transfer cycles variants and records success on the scheduled cardId',async({page})=>{
 await open(page);await page.locator('#cognitiveTopic').selectOption('26');await page.locator('[data-practice=transfer]').click();await expect(page.locator('.question')).toContainText('Após tratamento');await page.locator('[data-action=reveal]').click();await page.locator('[data-grade="3"]').click();await expect.poll(async()=> (await dump(page)).length).toBe(1);const rows=await dump(page);expect(rows[0].id).toBe('26.1.3');expect(rows[0].cognitiveEvents[0]).toMatchObject({kind:'transfer',success:1,variant:0});
 // Move only the browser clock to the actual scheduled due date; no forced early review.
 await page.clock.setFixedTime(new Date(rows[0].card.dueAt));await page.reload();await page.locator('#cognitiveTools summary').click();await page.locator('#cognitiveTopic').selectOption('26');await page.locator('[data-practice=transfer]').click();await expect(page.locator('.question')).toContainText('lise tumoral espontânea');
});

test('cognitive: latest FSRS backup in another tab and invalid import preserve history',async({page,context})=>{
 await open(page);const second=await context.newPage();await second.goto('./');await page.locator('[data-mode=fsrs]').click();await page.locator('[data-action=reveal]').first().click();await page.locator('[data-grade="3"]').click();await expect.poll(async()=> (await dump(page)).length).toBe(1);
 await second.locator('[data-mode=fsrs]').click();await second.locator('.fsrs-backup summary').click();const promise=second.waitForEvent('download');await second.locator('#fsrsExport').click();const data=JSON.parse(await fs.readFile(await (await promise).path(),'utf8'));expect(data.records).toHaveLength(1);
 delete data.records[0].card.lapses;await second.locator('#fsrsImport').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await expect(second.locator('#toast')).toContainText(/lapses|inválido/);expect(await dump(second)).toHaveLength(1);
});

test('cognitive: exported XML restores events and variants through the real import UI',async({page,context})=>{
 await open(page);await page.locator('#cognitiveTopic').selectOption('26');await page.locator('[data-practice=context]').click();await page.locator('[data-cognitive-action=reveal]').click();await page.locator('[data-cognitive-action=success]').click();await expect(page.locator('.intervention')).toContainText('Prática registrada');
 const d=page.waitForEvent('download');await page.locator('#exportBtn').click();const xml=await fs.readFile(await (await d).path());
 const fresh=await context.browser().newContext();try{const p=await fresh.newPage();await p.goto(page.url());await p.locator('#importFile').setInputFiles({name:'cognitive.xml',mimeType:'application/xml',buffer:xml});await expect(p.locator('#importReviewText')).toContainText('metadados cognitivos');await p.locator('#confirmImportBtn').click();await expect(p.locator('#cognitiveToday')).toContainText('1 intervenções');await p.reload();await p.locator('#cognitiveTools summary').click();await expect(p.locator('#cognitiveEnabled')).toBeChecked();await p.locator('#cognitiveTopic').selectOption('26');await p.locator('[data-practice=transfer]').click();await expect(p.locator('.question')).toContainText('Após tratamento');}finally{await fresh.close();}
});

test('cognitive: shared daily quota is enforced across two already revealed cards and zero persists',async({page,context})=>{
 await open(page);await page.locator('[data-mode=fsrs]').click();await page.locator('#fsrsDaily').fill('1');await page.locator('#fsrsDaily').dispatchEvent('change');
 const other=await context.newPage();await other.goto('./');await other.locator('#searchBox').fill('2.1.1');await expect(other.locator('#searchStatus')).toContainText('encontrados');await other.locator('[data-mode=fsrs]').click();await other.locator('[data-action=reveal]').first().click();await page.locator('[data-action=reveal]').first().click();
 await page.locator('[data-grade="3"]').click();await expect.poll(async()=> (await dump(page)).length).toBe(1);
 // A stale open card may remain visible, but its write must respect the transaction quota.
 await other.locator('[data-grade="3"]').click();await expect(other.locator('#cardsContainer')).toContainText('Limite diário');expect(await dump(other)).toHaveLength(1);
 await other.locator('#fsrsDaily').fill('0');await other.locator('#fsrsDaily').dispatchEvent('change');await other.reload();await other.locator('[data-mode=fsrs]').click();await expect(other.locator('#fsrsDaily')).toHaveValue('0');await expect(other.locator('#fsrsSummary')).toContainText('0 novos');
});

test('cognitive: next due refreshes without reload and cognitive assets work offline',async({page,context})=>{
 await page.clock.install();await page.goto('./');await page.locator('#searchBox').fill('1.1.1');await page.locator('[data-mode=fsrs]').click();await page.locator('[data-action=reveal]').first().click();await page.locator('[data-grade="1"]').click();await expect(page.locator('#fsrsSummary')).toContainText('0 vencidos');await page.clock.fastForward(65000);await expect(page.locator('#fsrsSummary')).toContainText('1 vencidos');
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);try{await page.reload();await expect(page.locator('#nTotal')).toHaveText('1206');await page.locator('#cognitiveTools summary').click();await page.locator('#cognitiveEnabled').check();await page.locator('#cognitiveTopic').selectOption('26');await page.locator('[data-practice=context]').click();await expect(page.locator('.context-card')).toHaveCount(15);}finally{await context.setOffline(false);}
});
