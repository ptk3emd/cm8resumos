import {test,expect} from '@playwright/test';

test('study guide explains independent manual status, reads and FSRS without obstructing cards',async({page})=>{
 await page.goto('./');
 const guide=page.locator('#studyGuide');
 await expect(guide.locator('summary')).toHaveText('Guia rápido de estudo');
 await guide.locator('summary').click();
 await expect(guide).toHaveAttribute('open','');
 await expect(guide).toContainText('independente de “Estudado”');
 await expect(guide).toContainText('Só essa avaliação agenda a próxima revisão');
 const positioned=await page.evaluate(()=>{
  const cards=document.querySelector('#cardsContainer'),advanced=document.querySelector('#studyOverview');
  return !!(cards.compareDocumentPosition(advanced)&Node.DOCUMENT_POSITION_FOLLOWING);
 });
 expect(positioned).toBe(true);
 await expect(page.locator('#studyOverview>summary')).toHaveText('Ferramentas avançadas');
 await expect(page.locator('#cardsContainer .study-card')).toHaveCount(22);
});

test('topic index and picker display all 31 topics in sequential numeric order',async({page,isMobile})=>{
 await page.goto('./');
 const ids=await page.locator('#topicList .topic-btn[data-topic]').evaluateAll(nodes=>nodes.map(node=>node.dataset.topic));
 expect(ids).toEqual(['all',...Array.from({length:31},(_,i)=>String(i+1))]);
 if(isMobile){
  await page.locator('#mobileTopics').click();
  const optionValues=await page.locator('#topicJump option').evaluateAll(nodes=>nodes.map(node=>node.value));
  expect(optionValues).toEqual(ids);
 }
 await page.goto('./?topic=21');
 await expect(page.locator('#topicPosition')).toHaveText('Tema 21 de 31');
 await page.locator('#nextTopic').click();
 await expect(page).toHaveURL(/topic=22/);
});

test('empty list clears refinements without losing the current topic',async({page})=>{
 await page.goto('./?topic=1');
 await page.locator('#levelSelect').selectOption('1');
 await page.locator('#searchBox').fill('string_that_cannot_match_any_medical_card_987654');
 await expect(page.locator('#cardsContainer .empty')).toBeVisible();
 await expect(page.locator('.empty [data-action="clearRefinements"]')).toHaveText('Limpar filtros deste tema');
 await page.locator('.empty [data-action="clearRefinements"]').click();
 await expect(page).toHaveURL(/topic=1/);
 await expect(page.locator('#levelSelect')).toHaveValue('all');
 await expect(page.locator('#searchBox')).toHaveValue('');
 await expect(page.locator('#cardsContainer .study-card')).toHaveCount(22);
});

test('clearing only the search preserves the selected level',async({page})=>{
 await page.goto('./');
 await page.locator('#levelSelect').selectOption('1');
 await page.locator('#searchBox').fill('pneumonia');
 await expect(page.locator('#searchClear')).toBeVisible();
 await page.locator('#searchClear').click();
 await expect(page.locator('#levelSelect')).toHaveValue('1');
 await expect(page.locator('#searchBox')).toHaveValue('');
 await expect(page.locator('#activeFilters [data-clear="level"]')).toBeVisible();
});

test('load more takes keyboard focus to first newly loaded question',async({page})=>{
 await page.goto('./');
 const before=await page.locator('#cardsContainer .study-card').count();
 expect(before).toBe(22);
 const next=page.locator('#cardsContainer .study-card').nth(before);
 await page.locator('#moreBtn').click();
 await expect(page.locator('#cardsContainer .study-card')).toHaveCount(44);
 await expect(next.locator('.question')).toBeFocused();
 await expect(next.locator('.question')).toBeInViewport();
});

test('dark mode keeps guide and functional controls legible with AA contrast',async({page})=>{
 await page.goto('./');
 await page.locator('#themeBtn').click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.locator('#studyGuide summary').click();
 await page.locator('#levelSelect').selectOption('1');
 const contrasts=await page.evaluate(()=>{
  const rgb=str=>{const m=str.match(/rgba?\(([^)]+)\)/);if(!m)return null;return m[1].split(/[\s,\/]+/).filter(Boolean).slice(0,3).map(Number);};
  const luminance=c=>c.map(v=>{const x=v/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
  const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  return ['#studyGuide summary','#studyGuide dd','#studyOverview>summary','#levelSelect','#searchBox','#activeFilters .filter-chip','#listTitle'].map(selector=>{
   const node=document.querySelector(selector);
   let ancestor=node,bg=null;
   while(ancestor&&!bg){
    const style=getComputedStyle(ancestor),color=style.backgroundColor;
    if(color!=='transparent'&&color!=='rgba(0, 0, 0, 0)'&&color!=='rgb(0 0 0 / 0)')bg=rgb(color);
    ancestor=ancestor.parentElement;
   }
   return{selector,value:ratio(rgb(getComputedStyle(node).color),bg||[25,25,25])};
  });
 });
 for(const entry of contrasts)expect(entry.value,entry.selector).toBeGreaterThanOrEqual(4.5);
});

test('mobile status rail has working overflow controls and keeps active choice visible',async({page,isMobile})=>{
 test.skip(!isMobile,'Status rail controls are mobile-specific');
 await page.goto('./');
 const rail=page.locator('#statusFilters'),next=page.locator('#filterScrollCue'),prev=page.locator('#filterScrollPrev');
 await expect(next).toBeVisible();
 await next.click();
 await expect.poll(()=>rail.evaluate(e=>e.scrollLeft)).toBeGreaterThan(0);
 await expect(prev).toBeVisible();
 await rail.locator('[data-filter="star"]').click();
 await expect(rail.locator('[data-filter="star"]')).toHaveAttribute('aria-pressed','true');
 const visible=await rail.evaluate(e=>{
  const a=e.querySelector('[data-filter="star"]').getBoundingClientRect(),r=e.getBoundingClientRect();
  return a.left>=r.left-2&&a.right<=r.right+2;
 });
 expect(visible).toBe(true);
 await prev.click();
 await expect.poll(()=>rail.evaluate(e=>e.scrollLeft)).toBeLessThan(100);
});
