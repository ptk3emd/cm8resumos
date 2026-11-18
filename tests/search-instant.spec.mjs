import {test,expect} from '@playwright/test';

const ready=async page=>{await page.goto('./');await expect(page.locator('#workspace')).toHaveAttribute('aria-busy','false');};
const firstCardId=page=>page.locator('#cardsContainer .study-card').first().getAttribute('id');

test('busca por ID exato traz o cartão em primeiro lugar',async({page})=>{
 await ready(page);
 await page.locator('#searchBox').fill('4.2.5');
 await expect.poll(()=>firstCardId(page)).toBe('card-4-2-5');
 await expect(page.locator('#searchStatus')).toContainText('encontrado');
});

test('vários termos em qualquer ordem e sem acentos',async({page})=>{
 await ready(page);
 await page.locator('#searchBox').fill('pneumonia comunidade');
 await expect(page.locator('#searchStatus')).toContainText('por relevância');
 const ordered=await page.locator('#searchStatus').textContent();
 await page.locator('#searchBox').fill('COMUNIDADE pneumônia');
 await expect(page.locator('#searchStatus')).toHaveText(ordered.replace('pneumonia comunidade','COMUNIDADE pneumônia'));
 await expect(page.locator('#cardsContainer mark.hit').first()).toBeVisible();
});

test('selo indica o campo sem revelar a resposta oculta',async({page})=>{
 await ready(page);
 await page.locator('#searchBox').fill('4.2.5');
 const card=page.locator('#card-4-2-5');
 await expect(card.locator('.search-where')).toContainText('Encontrado em');
 await expect(card.locator('.answer-box')).toHaveCount(0);
 const text=await card.locator('.search-where').textContent();
 expect(text.length).toBeLessThan(80);
});

test('texto editado pelo usuário entra no índice',async({page})=>{
 await page.goto('./');
 await page.evaluate(()=>localStorage.setItem('cm8-text-edits-v1',JSON.stringify({'1.1.1':{question:'<p>Palavrachaveunica de teste</p>',scenario:'',answer:'<p>Resposta editada</p>'}})));
 await ready(page);
 await page.locator('#searchBox').fill('palavrachaveunica');
 await expect.poll(()=>firstCardId(page)).toBe('card-1-1-1');
 await expect(page.locator('#listSub')).toContainText('1 resultado');
});

test('teclado: seta para baixo leva ao primeiro resultado e Alt+seta percorre',async({page,isMobile})=>{
 test.skip(isMobile,'atalhos de teclado físico');
 await ready(page);
 await page.locator('#searchBox').fill('pneumonia');
 await expect(page.locator('#searchStatus')).toContainText('por relevância');
 await page.locator('#searchBox').press('ArrowDown');
 const first=page.locator('#cardsContainer .study-card').nth(0).locator('.question');
 await expect(first).toBeFocused();
 await page.keyboard.press('Alt+ArrowDown');
 await expect(page.locator('#cardsContainer .study-card').nth(1).locator('.question')).toBeFocused();
 await page.keyboard.press('Alt+ArrowUp');
 await expect(first).toBeFocused();
});

test('sem Web Worker a busca dá o mesmo resultado no thread principal',async({page})=>{
 await ready(page);
 await page.locator('#searchBox').fill('insuficiencia renal');
 await expect(page.locator('#searchStatus')).toContainText('encontrado');
 const withWorker=[await page.locator('#listSub').textContent(),await firstCardId(page)];
 await page.addInitScript(()=>{delete window.Worker;});
 await ready(page);
 expect(await page.evaluate(()=>typeof window.Worker)).toBe('undefined');
 await page.locator('#searchBox').fill('insuficiencia renal');
 await expect(page.locator('#searchStatus')).toContainText('encontrado');
 expect([await page.locator('#listSub').textContent(),await firstCardId(page)]).toEqual(withWorker);
});

test('resposta atrasada não sobrescreve a busca mais recente',async({page})=>{
 await ready(page);
 const box=page.locator('#searchBox');
 for(const q of ['p','pn','pne','pneu','4.2','4.2.5'])await box.fill(q);
 await expect.poll(()=>firstCardId(page)).toBe('card-4-2-5');
 await expect(page.locator('#searchStatus')).toContainText('“4.2.5”');
});

test('índice com 1206 cartões responde rápido',async({page})=>{
 await ready(page);
 const ms=await page.evaluate(async()=>{const box=document.getElementById('searchBox');const done=new Promise(r=>document.addEventListener('cm8:search',r,{once:true}));const t=performance.now();box.value='diabetes';box.dispatchEvent(new Event('input',{bubbles:true}));await done;return performance.now()-t;});
 expect(ms).toBeLessThan(1500);
 const core=await page.evaluate(()=>{const docs=window.CM8Source?.cards||[];const idx=CMNSearch.build(docs.map(c=>({id:c.id,question:c.question,scenario:c.scenario,answer:c.answer,topic:''})));const t=performance.now();for(let i=0;i<10;i++)CMNSearch.query(idx,'diabetes tipo');return {n:idx.length,ms:(performance.now()-t)/10};});
 expect(core.n).toBe(1206);
 expect(core.ms).toBeLessThan(100);
});
