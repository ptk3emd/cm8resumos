import {test,expect} from '@playwright/test';

// The medically reviewed LES deck should remain short and study-focused.
// Cases retain scenarios and two separate prompts per clinical vignette.
test('LES: 17 atomic questions in each level, 10 supplementary notes, 10 case cards',async({page})=>{
 await page.goto('./');await page.waitForFunction(()=>window.CM8Source);
 const r=await page.evaluate(()=>{
  const source=window.CM8Source,cards=source.cards.filter(c=>c.topic===11);
  const regular=cards.filter(c=>c.kind!=='case'),cases=cards.filter(c=>c.kind==='case');
  const levels=[1,2,3,4,5].map(level=>regular.filter(c=>c.level===level).length);
  const supplement=regular.filter(c=>c.level===0);
  const validRefs=regular.every(c=>/^https:\/\//.test(c.audit?.fonte||''));
  const concise=cards.every(c=>c.answer.length<=120&&c.question.length<=120);
  const unique=new Set(source.cards.map(c=>c.id)).size===source.cards.length;
  const badLevelIds=regular.filter(c=>/^11\.[1-5]\./.test(c.id)&&Number(c.id.split('.')[1])!==c.level).map(c=>c.id);
  const pairCount=new Set(cases.map(c=>c.case)).size;
  return {total:source.cards.length,les:cards.length,levels,supp:supplement.length,cases:cases.length,pairCount,
    validRefs,concise,unique,badLevelIds,other:source.cards.length-cards.length};
 });
 expect(r).toEqual({total:1206,les:105,levels:[17,17,17,17,17],supp:10,cases:10,pairCount:5,
  validRefs:true,concise:true,unique:true,badLevelIds:[],other:1101});
});

test('LES: classification is not a clinical diagnosis; full-house is not pathognomonic',async({page})=>{
 await page.goto('./');await page.waitForFunction(()=>window.CM8Source);
 const cards=await page.evaluate(()=>window.CM8Source.cards);
 const find=(id)=>cards.find(c=>c.id===id);
 expect(find('11.1.2').answer).toContain('FAN ≥1:80');
 expect(find('11.2.2').answer).toContain('não é patognomônico');
 expect(find('11.2.5').answer).toContain('dois imunossupressores');
 expect(find('11.3.5').answer).toContain('BAFF/BLyS');
});
