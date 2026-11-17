import {test,expect} from '@playwright/test';

test('topic pager, URL state and browser back/forward work without losing the cards',async({page,isMobile})=>{
 await page.goto('./');
 await expect(page.locator('#nTotal')).toHaveText('1206');
 if(isMobile)await page.locator('#mobileTopics').click();
 await page.locator('#topicList [data-topic="1"]').click();
 await expect(page).toHaveURL(/\?topic=1(?:$|&)/);
 await expect(page.locator('#topicPosition')).toHaveText('Tema 1 de 31');
 await expect(page.locator('#prevTopic')).toBeDisabled();
 await expect(page.locator('#nextTopic')).toBeEnabled();
 await expect(page.locator('#listTitle')).toBeFocused();
 await page.locator('#nextTopic').click();
 await expect(page).toHaveURL(/\?topic=2(?:$|&)/);
 await expect(page.locator('#topicPosition')).toHaveText('Tema 2 de 31');
 await expect(page.locator('#topicList [data-topic="2"]')).toHaveAttribute('aria-current','page');
 await page.goBack();
 await expect(page).toHaveURL(/\?topic=1(?:$|&)/);
 await expect(page.locator('#topicPosition')).toHaveText('Tema 1 de 31');
 await page.goForward();
 await expect(page.locator('#topicPosition')).toHaveText('Tema 2 de 31');
 await expect(page.locator('#cardsContainer .study-card').first()).toBeVisible();
});

test('direct links restore topic and mode without a reload loop',async({page})=>{
 await page.goto('./?topic=4&mode=focus');
 await expect(page.locator('#topicPosition')).toHaveText('Tema 4 de 31');
 await expect(page.locator('[data-mode="focus"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#cardsContainer .study-card')).toHaveCount(1);
 await page.locator('[data-mode="list"]').click();
 await expect(page).toHaveURL(/topic=4/);
 await expect(page).not.toHaveURL(/mode=focus/);
 await expect(page.locator('#cardsContainer .study-card').first()).toBeVisible();
 await page.goBack();
 await expect(page.locator('[data-mode="focus"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#cardsContainer .study-card')).toHaveCount(1);
});

test('mobile picker jumps directly to a distant topic and Escape dismisses navigation',async({page,isMobile})=>{
 test.skip(!isMobile,'Mobile navigation picker is intentionally shown only at compact widths');
 await page.goto('./');
 await page.locator('#mobileTopics').click();
 await expect(page.locator('#topicJump')).toBeVisible();
 await expect(page.locator('#topicJump option')).toHaveCount(32);
 await page.locator('#topicJump').selectOption('31');
 await expect(page).toHaveURL(/\?topic=31(?:$|&)/);
 await expect(page.locator('#listTitle')).toBeFocused();
 await expect(page.locator('#sidebar')).not.toHaveClass(/mobile-open/);
 await page.locator('#mobileTopics').click();
 await expect(page.locator('#topicJump')).toHaveValue('31');
 await page.keyboard.press('Escape');
 await expect(page.locator('#mobileTopics')).toHaveAttribute('aria-expanded','false');
 await expect(page.locator('#mobileTopics')).toBeFocused();
 await expect(page.locator('#sidebar')).not.toBeVisible();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2);
 expect(overflow).toBeFalsy();
});

test('answer outline hash navigation is not mistaken for topic history',async({page})=>{
 await page.goto('./');
 await page.locator('#searchBox').fill('4.2.5');
 await expect(page.locator('#card-4-2-5')).toBeVisible();
 await page.locator('#card-4-2-5 [data-action="reveal"]').first().click();
 await page.locator('#card-4-2-5 nav.answer-outline a').first().click();
 await expect(page).toHaveURL(/#answer-4-2-5-1$/);
 await expect(page.locator('#card-4-2-5')).toBeVisible();
});
