import {test,expect} from '@playwright/test';

test('Estudado and Revisar keep the clicked control at a fixed viewport position',async({page})=>{
 await page.goto('./');
 const card=page.locator('#cardsContainer .study-card').nth(9);
 for(const [action,pressed] of [['done','true'],['done','false'],['review','true'],['review','false']]){
  const button=card.locator('[data-action="'+action+'"]');
  await button.scrollIntoViewIfNeeded();
  const before=await button.evaluate(e=>({top:e.getBoundingClientRect().top,y:window.scrollY}));
  expect(before.y).toBeGreaterThan(100);
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed',pressed);
  const after=await button.evaluate(e=>({top:e.getBoundingClientRect().top,y:window.scrollY}));
  expect(Math.abs(after.top-before.top),action+' changed viewport position').toBeLessThan(5);
  expect(Math.abs(after.y-before.y),action+' moved page scroll').toBeLessThan(6);
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
  const top=await replacement.evaluate(e=>e.getBoundingClientRect().top);
  expect(top).toBeGreaterThanOrEqual(-3);
  expect(top).toBeLessThanOrEqual(128);
  await expect(replacement).toBeInViewport();
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
