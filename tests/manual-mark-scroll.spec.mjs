import {test,expect} from '@playwright/test';

test('Estudado and Revisar keep the clicked control at a fixed viewport position',async({page})=>{
 await page.goto('./');
 const card=page.locator('#cardsContainer .study-card').nth(9);
 for(const [action,pressed] of [['done','true'],['done','false'],['review','true'],['review','false']]){
  const button=card.locator('[data-action="'+action+'"]');
  await button.scrollIntoViewIfNeeded();
  await button.evaluate(e=>{
   window.__manualMarkClickTop=null;
   e.addEventListener('click',()=>{window.__manualMarkClickTop=e.getBoundingClientRect().top;},{capture:true,once:true});
  });
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed',pressed);
  const before=await page.evaluate(()=>window.__manualMarkClickTop);
  expect(before).not.toBeNull();
  await expect.poll(async()=>Math.abs((await button.evaluate(e=>e.getBoundingClientRect().top))-before)).toBeLessThan(6);
  await page.waitForTimeout(90);
  const after=await button.evaluate(e=>e.getBoundingClientRect().top);
  expect(Math.abs(after-before),action+' changed the position after the click').toBeLessThan(6);
 }
});

for(const action of ['done','review']){
 test('marking '+action+' in Não estudados keeps the next card in view',async({page})=>{
  await page.goto('./');
  await page.locator('#statusFilters [data-filter="todo"]').click();
  const card=page.locator('#cardsContainer .study-card').nth(5);
  const removed=await card.getAttribute('id');
  const next=await page.locator('#cardsContainer .study-card').nth(6).getAttribute('id');
  const button=card.locator('[data-action="'+action+'"]');
  await button.scrollIntoViewIfNeeded();
  await button.click();
  await expect(page.locator('#'+removed)).toHaveCount(0);
  const replacement=page.locator('#'+next);
  await expect(replacement.locator('.question')).toBeFocused();
  await expect(replacement).toBeInViewport();
  const position=await replacement.evaluate(e=>({top:e.getBoundingClientRect().top,height:innerHeight}));
  expect(position.top).toBeGreaterThanOrEqual(-4);
  expect(position.top).toBeLessThan(position.height*.75);
 });
}

test('manual status toggles remain stable in Focus',async({page})=>{
 await page.goto('./');
 await page.locator('[data-mode="focus"]').click();
 const card=page.locator('#cardsContainer .study-card');
 for(const action of ['done','review']){
  const button=card.locator('[data-action="'+action+'"]');
  await button.scrollIntoViewIfNeeded();
  const before=await button.evaluate(e=>e.getBoundingClientRect().top);
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed','true');
  const after=await button.evaluate(e=>e.getBoundingClientRect().top);
  expect(Math.abs(after-before)).toBeLessThan(5);
 }
 await expect(page.locator('#cardsContainer .study-card')).toHaveCount(1);
});
