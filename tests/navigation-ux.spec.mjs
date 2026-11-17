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


test('mobile quick entry opens the topic selector early and returns focus on Escape',async({page,isMobile})=>{
 test.skip(!isMobile,'The early topic picker is mobile-specific');
 await page.goto('./');
 const quick=page.locator('#quickTopicsBtn');
 await expect(quick).toBeVisible();
 await quick.click();
 await expect(page.locator('#sidebar')).toHaveClass(/mobile-open/);
 await expect(quick).toHaveAttribute('aria-expanded','true');
 await expect(page.locator('#mobileTopics')).toHaveAttribute('aria-expanded','true');
 await expect(page.locator('#topicJump')).toBeFocused();
 await page.keyboard.press('Escape');
 await expect(quick).toHaveAttribute('aria-expanded','false');
 await expect(quick).toBeFocused();
 await expect(page.locator('#sidebar')).not.toBeVisible();
});

test('FSRS keeps topic context, active filter chip and topic pager synchronized',async({page})=>{
 await page.goto('./?topic=1&mode=fsrs');
 await expect(page.locator('#startReviewBtn')).toBeEnabled();
 await expect(page.locator('[data-mode="fsrs"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#topicPager')).toBeVisible();
 await expect(page.locator('#topicPosition')).toHaveText('Tema 1 de 31');
 await expect(page.locator('#activeFilters [data-clear="topic"]')).toBeVisible();
 const name=await page.locator('#topicList [data-topic="1"] .topic-name').textContent();
 await expect(page.locator('#listSub')).toContainText(name.trim());
 await page.locator('#nextTopic').click();
 await expect(page).toHaveURL(/topic=2&mode=fsrs/);
 await expect(page.locator('#topicPosition')).toHaveText('Tema 2 de 31');
 await expect(page.locator('#activeFilters [data-clear="topic"]')).toBeVisible();
 await page.goBack();
 await expect(page.locator('#topicPosition')).toHaveText('Tema 1 de 31');
});


test('topic pager remains keyboard-operable for successive themes',async({page})=>{
 await page.goto('./?topic=2');
 const next=page.locator('#nextTopic');
 await next.focus();
 await page.keyboard.press('Enter');
 await expect(page.locator('#topicPosition')).toHaveText('Tema 3 de 31');
 await expect(next).toBeFocused();
 await page.keyboard.press('Enter');
 await expect(page.locator('#topicPosition')).toHaveText('Tema 4 de 31');
 await expect(next).toBeFocused();
 const prev=page.locator('#prevTopic');
 await prev.focus();
 await page.keyboard.press('Enter');
 await expect(page.locator('#topicPosition')).toHaveText('Tema 3 de 31');
 await expect(prev).toBeFocused();
});


for(const mode of ['focus','fsrs']){
 test('mobile '+mode+' Show topics opens actual navigation with accurate state',async({page,isMobile})=>{
  test.skip(!isMobile,'Mobile sidebar only');
  await page.goto('./?topic=3&mode='+mode);
  if(mode==='fsrs')await expect(page.locator('#startReviewBtn')).toBeEnabled();
  const button=page.locator('#focusSidebarToggle');
  await expect(button).toBeVisible();
  await expect(button).toContainText('Mostrar temas');
  await button.click();
  await expect(page.locator('#sidebar')).toBeVisible();
  await expect(page.locator('#sidebar')).toHaveClass(/mobile-open/);
  await expect(button).toHaveAttribute('aria-expanded','true');
  await expect(button).toContainText('Ocultar temas');
  await expect(page.locator('#topicJump')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#sidebar')).not.toBeVisible();
  await expect(button).toHaveAttribute('aria-expanded','false');
  await expect(button).toBeFocused();
 });
}
