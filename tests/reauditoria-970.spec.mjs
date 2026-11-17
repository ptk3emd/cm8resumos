import {test,expect} from '@playwright/test';

test('cardinalidade do baralho expandido e IDs únicos',async({page})=>{
 await page.goto('./');await page.waitForFunction(()=>window.CM8Source);
 const x=await page.evaluate(()=>{
  const d=window.CM8Source;
  return {n:d.cards.length,unique:new Set(d.cards.map(c=>c.id)).size,themes:d.themes.length,cases:d.cards.filter(c=>c.kind==='case').length};
 });
 expect(x).toEqual({n:1206,unique:1206,themes:31,cases:240});
});
test('reanálise clínica: ressalva full-house preservada em questão e resposta',async({page})=>{
 await page.goto('./');await page.waitForFunction(()=>window.CM8Source);
 const d=JSON.stringify(await page.evaluate(()=>window.CM8Source)),c=JSON.parse(d).cards.find(x=>x.id==='11.2.2');
 expect(c.question).not.toContain('patognomônico');
 expect(c.answer).toContain('não é patognomônico');
});
test('reanálise clínica: ANCA descrito sem equivalência antigênica absoluta',async({page})=>{
 await page.goto('./');await page.waitForFunction(()=>window.CM8Source);
 const c=JSON.parse(JSON.stringify(await page.evaluate(()=>window.CM8Source))).cards.find(x=>x.id==='12.4.2');
 expect(c.answer).toContain('essas associações não são absolutas');
 expect(c.answer).not.toContain('GPA (Wegener) = c-ANCA');
});
test('reanálise clínica: hidratação da hipercalcemia não impõe vazão fixa universal',async({page})=>{
 await page.goto('./');await page.waitForFunction(()=>window.CM8Source);
 const c=JSON.parse(JSON.stringify(await page.evaluate(()=>window.CM8Source))).cards.find(x=>x.id==='28.1.5');
 expect(c.answer).toContain('individualizada');
 expect(c.answer).not.toContain('HIDRATAÇÃO VENOSA VIGOROSA COM SF 0,9% (200 a 300 mL/hora');
});
test('reanálise editorial: termos fragmentados eliminados nos cartões identificados',async({page})=>{
 await page.goto('./');await page.waitForFunction(()=>window.CM8Source);
 const a=JSON.parse(JSON.stringify(await page.evaluate(()=>window.CM8Source))).cards;
 const ids=['3.2.5','3.4.3','3.4.5','4.4.4','5.5.1'];
 for(const id of ids){
  const c=a.find(x=>x.id===id);
  expect(c?.answer,'cartão '+id).toBeTruthy();
  expect(c.answer).not.toMatch(/CA-MRS A|alfa-to xina|Furuncu lose|Tri metoprima|Hipertensã o/);
 }
});
