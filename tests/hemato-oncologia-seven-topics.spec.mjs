import {test,expect} from '@playwright/test';

test('hemato-oncologia: sete temas, níveis 1–3 e perguntas atômicas',async({page})=>{
 await page.goto('./');
 const result=await page.locator('#sourceData').evaluate(node=>{
  const d=JSON.parse(node.textContent);
  const ids=[20,26,27,28,29,30,31];
  const groups=ids.map(id=>{
   const cards=d.cards.filter(c=>c.topic===id);
   return {id,n:cards.length,levels:[1,2,3].map(l=>cards.filter(c=>c.level===l).length),
    unique:new Set(cards.map(c=>c.id)).size,
    allHaveQuestion:cards.every(c=>typeof c.question==='string'&&c.question.trim().endsWith('?')),
    shortAnswers:cards.every(c=>typeof c.answer==='string'&&c.answer.length<=270),
    sourced:cards.every(c=>/^https:\/\//.test(c.audit?.fonte||''))};
  });
  return {groups,n:d.cards.length,unique:new Set(d.cards.map(c=>c.id)).size,other:d.cards.filter(c=>!ids.includes(c.topic)).length};
 });
 expect(result.n).toBe(1206);
 expect(result.unique).toBe(1206);
 expect(result.other).toBe(1041);
 expect(result.groups).toHaveLength(7);
 for(const g of result.groups){
  expect(g.n,`topic ${g.id}`).toBe(15);
  expect(g.levels).toEqual([5,5,5]);
  expect(g.unique).toBe(15);
  expect(g.allHaveQuestion).toBe(true);
  expect(g.shortAnswers).toBe(true);
  expect(g.sourced).toBe(true);
 }
});
