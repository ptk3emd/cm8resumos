import {test,expect} from '@playwright/test';

test('16 questões de alto risco mantêm revisão pendente após correções dirigidas',async({page})=>{
 await page.goto('./');await page.waitForFunction(()=>window.CM8Source);
 const result=await page.evaluate(()=>{
  const source=window.CM8Source;
  return {cards:source.cards.length,unique:new Set(source.cards.map(c=>c.id)).size,flagged:source.cards.filter(c=>!c.splitFrom&&c.audit?.status==='revisar').length,cases:source.cards.filter(c=>c.kind==='case').length};
 });
 expect(result).toEqual({cards:1206,unique:1206,flagged:15,cases:240});
});
test('SREAT não é diagnosticada isoladamente por anti-TPO e não garante resposta universal',async({page})=>{
 await page.goto('./');await page.waitForFunction(()=>window.CM8Source);
 const c=await page.evaluate(()=>window.CM8Source.cards.find(c=>c.id==='8.5.3'));
 expect(c.answer).toContain('inespecíficos');
 expect(c.answer).toContain('não é universal');
 expect(c.audit.status).toBe('revisar');
});
test('anti-Ro identifica divergência entre ACR e SMFM',async({page})=>{
 await page.goto('./');await page.waitForFunction(()=>window.CM8Source);
 const c=await page.evaluate(()=>window.CM8Source.cards.find(c=>c.id==='16.2.5'));
 expect(c.answer).toContain('ACR');
 expect(c.answer).toContain('SMFM');
});
test('miastenia: CVF isolada não define intubação',async({page})=>{
 await page.goto('./');await page.waitForFunction(()=>window.CM8Source);
 const c=await page.evaluate(()=>window.CM8Source.cards.find(c=>c.id==='25.1.5'));
 expect(c.answer).toContain('NÃO critério isolado de intubação');
});
test('TDM em DII não apresenta tofacitinibe como opção para doença de Crohn',async({page})=>{
 await page.goto('./');await page.waitForFunction(()=>window.CM8Source);
 const cards=await page.evaluate(()=>window.CM8Source.cards);
 expect(cards.find(c=>c.id==='17.3.5.4').answer).toContain('Não é uma opção para doença de Crohn');
 expect(cards.find(c=>c.id==='17.3.5').answer).toContain('Confirmar atividade inflamatória');
});
test('SSc ILD contraindica primeira linha de glucocorticoide',async({page})=>{
 await page.goto('./');await page.waitForFunction(()=>window.CM8Source);
 const c=await page.evaluate(()=>window.CM8Source.cards.find(c=>c.id==='14.2.5'));
 expect(c.answer).toContain('NÃO utilizar corticosteroides sistêmicos como primeira linha');
});
test('SUDEP mantém incerteza sobre fisiopatologia e resultados cirúrgicos',async({page})=>{
 await page.goto('./');await page.waitForFunction(()=>window.CM8Source);
 const c=await page.evaluate(()=>window.CM8Source.cards.find(c=>c.id==='22.5.5'));
 expect(c.answer).toContain('mecanismos ainda não estão totalmente esclarecidos');
 expect(c.answer).not.toContain('curando 70-80%');
});
test('esquemas em B12 não pressupõem IM vitalícia após toda bariátrica',async({page})=>{
 await page.goto('./');await page.waitForFunction(()=>window.CM8Source);
 const c=await page.evaluate(()=>window.CM8Source.cards.find(c=>c.id==='21.3.5.1'));
 expect(c.answer).toContain('dependem do procedimento e da absorção');
});
