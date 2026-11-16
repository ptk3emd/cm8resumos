import {test,expect} from '@playwright/test';

test('sete temas têm nível 1, 2, 3 e dois cartões de caso cada',async({page})=>{
 await page.goto('./');
 const r=await page.locator('#sourceData').evaluate(node=>{
  const d=JSON.parse(node.textContent);
  return [20,26,27,28,29,30,31].map(topic=>{
   const cards=d.cards.filter(c=>c.topic===topic);
   return {name:d.themes.find(t=>t.id===topic)?.title,
     levels:[1,2,3].map(level=>cards.filter(c=>c.level===level&&c.kind!=='case').length),
     cases:cards.filter(c=>c.kind==='case').length,
     bad:cards.filter(c=>!c.question||!c.answer||c.answer.length>270||c.level<1||c.level>3||!c.audit?.fonte).map(c=>c.id)};
  });
 });
 expect(r).toHaveLength(7);
 for(const x of r){expect(x.name).toBeTruthy();expect(x.levels).toEqual([7,7,7]);expect(x.cases).toBe(2);expect(x.bad).toEqual([]);}
});

test('total, IDs únicos e outras disciplinas preservados',async({page})=>{
 await page.goto('./');
 const r=await page.locator('#sourceData').evaluate(node=>{
  const d=JSON.parse(node.textContent),ids=[20,26,27,28,29,30,31];
  return {total:d.cards.length,topics:d.themes.length,cases:d.cards.filter(c=>c.kind==='case').length,unique:new Set(d.cards.map(c=>c.id)).size,untouched:d.cards.filter(c=>!ids.includes(c.topic)).length};
 });
 expect(r).toEqual({total:1202,topics:31,cases:254,unique:1202,untouched:1041});
});
