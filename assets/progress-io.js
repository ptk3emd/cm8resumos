/* CM8 progress v1: strict XML schema validation + legacy JSON reader. No dependencies. */
(function(global){
'use strict';
const FORMAT='cmn-flashcards-progresso',VERSION='1',MAX_CARDS=10000;
const rootAttrs=['format','schema-version','exported-at','card-count'];
const cardAttrs=['id','status','star','hidden','read-count'];
const error=message=>{throw new Error(message);};
function normalize(src,allowedIds){
 const cards=Object.create(null);
 if(!src||typeof src!=='object'||Array.isArray(src))return cards;
 for(const [id,mark] of Object.entries(src)){
  if(!allowedIds.has(id)||!mark||typeof mark!=='object'||Array.isArray(mark))continue;
  const one=Object.create(null);
  if(mark.status==='done'||mark.status==='review')one.status=mark.status;
  if(mark.star===true)one.star=true;
  if(mark.hidden===true)one.hidden=true;
  if(Object.keys(one).length)cards[id]=one;
 }
 return cards;
}
const xmlAttr=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function encodeXML(marks,total,cognitive){
 const allowed=new Set(Object.keys(marks));
 const cards=normalize(marks,allowed);
 const reads=getReads();
 for(const id of Object.keys(reads))if(!cards[id])cards[id]=Object.create(null);
 const lines=['<?xml version="1.0" encoding="UTF-8"?>',
  '<cmn-progress format="'+FORMAT+'" schema-version="'+VERSION+'" exported-at="'+new Date().toISOString()+'" card-count="'+total+'">'];
 for(const [id,mark] of Object.entries(cards)){
  let line='  <card id="'+xmlAttr(id)+'"';
  if(mark.status)line+=' status="'+mark.status+'"';
  if(mark.star)line+=' star="true"';
  if(mark.hidden)line+=' hidden="true"';
  if(reads[id])line+=' read-count="'+reads[id]+'"';
  lines.push(line+' />');
 }
 if(cognitive)lines.push(global.CMNCognitive.encodeXML(cognitive));
 lines.push('</cmn-progress>');
 return lines.join('\n');
}
function parseXML(raw,allowedIds){
 if(typeof DOMParser==='undefined')error('Este navegador não suporta leitura XML.');
 if(/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(raw))error('O backup XML contém declarações não permitidas.');
 const xml=new DOMParser().parseFromString(raw,'application/xml');
 if(xml.getElementsByTagName('parsererror').length||xml.doctype||xml.documentElement?.localName!=='cmn-progress'||xml.documentElement?.namespaceURI){
  error('XML inválido. Utilize um backup exportado por esta biblioteca.');
 }
 const root=xml.documentElement;
 if(root.getAttributeNames().some(k=>!rootAttrs.includes(k)))error('O XML possui atributos não reconhecidos no cabeçalho.');
 if(root.getAttribute('format')!==FORMAT)error('Este arquivo XML não pertence aos flashcards CMN.');
 if(root.getAttribute('schema-version')!==VERSION)error('A versão do XML não é compatível (necessária: 1).');
 const exportedAt=root.getAttribute('exported-at');
 if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(exportedAt||'')||!Number.isFinite(Date.parse(exportedAt)))error('O XML não contém uma data de exportação válida.');
 if(!/^\d+$/.test(root.getAttribute('card-count')||''))error('O XML não contém uma contagem de cartões válida.');
 const elements=[];let cognitive;
 for(const node of root.childNodes){
  if(node.nodeType===1){if(node.tagName==='cognitive'&&!node.namespaceURI){if(cognitive)error('Dados cognitivos duplicados.');cognitive=global.CMNCognitive.decodeXML(node,allowedIds);}else{if(node.tagName!=='card'||node.namespaceURI)error('O XML contém elementos não reconhecidos.');if(cognitive)error('Marcações devem preceder dados cognitivos.');elements.push(node);}}
  else if(node.nodeType===3){if(node.textContent.trim())error('O XML contém texto fora das marcações.');}
  else if(node.nodeType!==8)error('O XML contém estrutura não permitida.');
 }
 if(elements.length>MAX_CARDS)error('O backup tem mais de 10 mil marcações.');
 const cards=Object.create(null),readCounts=Object.create(null),seen=new Set();let ignored=0;
 for(const node of elements){
  if(node.children.length||node.textContent.trim())error('A marcação de um cartão não pode conter elementos ou texto.');
  if(node.getAttributeNames().some(k=>!cardAttrs.includes(k)))error('O XML possui atributos de cartão não reconhecidos.');
  const id=node.getAttribute('id');
  if(!id||!/^[\dA-Z.]+$/.test(id))error('O XML contém um identificador de cartão inválido.');
  if(seen.has(id))error('O XML contém cartões duplicados: '+id+'.');
  seen.add(id);
  const status=node.getAttribute('status');
  if(status!==null&&!['done','review'].includes(status))error('O XML contém um status inválido para o cartão '+id+'.');
  for(const key of ['star','hidden']){
   const value=node.getAttribute(key);
   if(value!==null&&value!=='true'&&value!=='false')error('O XML contém '+key+' inválido no cartão '+id+'.');
  }
  const rawRead=node.getAttribute('read-count');
  if(rawRead!==null&&(!/^(0|[1-9][0-9]*)$/.test(rawRead)||Number(rawRead)>MAX_READS))error('Contagem de leituras inválida no cartão '+id+'.');
  if(!allowedIds.has(id)){ignored++;continue;}
  if(rawRead!==null&&Number(rawRead)>0)readCounts[id]=Number(rawRead);
  const mark=Object.create(null);
  if(status)mark.status=status;
  if(node.getAttribute('star')==='true')mark.star=true;
  if(node.getAttribute('hidden')==='true')mark.hidden=true;
  if(!Object.keys(mark).length&&rawRead===null)error('A marcação do cartão '+id+' está vazia.');
  if(Object.keys(mark).length)cards[id]=mark;
 }
 if(elements.length&&!Object.keys(cards).length&&!Object.keys(readCounts).length)error('Nenhum cartão do XML corresponde a esta biblioteca. O progresso foi preservado.');
 return{cards,valid:new Set([...Object.keys(cards),...Object.keys(readCounts)]).size,ignored,format:'XML',readCounts,hasReadCounts:elements.some(el=>el.hasAttribute('read-count')),...(cognitive?{cognitive}:{})};
}
function parseJSON(raw,allowedIds){
 let object;
 try{object=JSON.parse(raw);}
 catch{error('O arquivo não é um JSON válido. Selecione o backup antigo correto.');}
 if(!object||typeof object!=='object'||Array.isArray(object))error('O arquivo JSON não contém um backup válido.');
 if(object.format&&object.format!==FORMAT)error('Este JSON pertence a outro aplicativo.');
 if(object.version!=null&&String(object.version)!=='1')error('A versão do backup JSON não é compatível.');
 if(!object.cards||typeof object.cards!=='object'||Array.isArray(object.cards)||(!object.format&&object.version==null)){
  error('Este JSON não contém um backup de progresso da biblioteca.');
 }
 const ids=Object.keys(object.cards);
 if(ids.length>MAX_CARDS)error('O backup contém mais de 10 mil marcações.');
 const cards=normalize(object.cards,allowedIds),valid=Object.keys(cards).length;
 const ignored=ids.filter(id=>!allowedIds.has(id)).length;
 if(ids.length&&!valid)error(ignored===ids.length?'Este JSON pertence a outra biblioteca. O progresso foi preservado.':'O JSON não contém marcações válidas. O progresso foi preservado.');
 return{cards,valid,ignored,format:'JSON legado'};
}
function parse(raw,allowedIds){
 if(!(allowedIds instanceof Set))error('Lista de cartões não informada.');
 if(typeof raw!=='string')error('Formato de arquivo não reconhecido.');
 const trimmed=raw.replace(/^\uFEFF/,'').trim();
 if(!trimmed)error('O arquivo está vazio.');
 const result=trimmed.startsWith('<')?parseXML(trimmed,allowedIds):parseJSON(trimmed,allowedIds);
 return result;
}

const READ_KEY='cmn-flashcards-read-counts-v1',MAX_READS=10000000;
const validCount=n=>Number.isSafeInteger(n)&&n>=0&&n<=MAX_READS;
function getReads(){
 try{
  const raw=JSON.parse(localStorage.getItem(READ_KEY)||'{}');
  const result=Object.create(null);
  if(raw&&typeof raw==='object'&&!Array.isArray(raw)){
   for(const [id,count] of Object.entries(raw))if(/^[0-9A-Z.]+$/.test(id)&&validCount(count)&&count>0)result[id]=count;
  }
  return result;
 }catch{return Object.create(null);}
}
function putReads(reads){try{localStorage.setItem(READ_KEY,JSON.stringify(reads));return true;}catch{return false;}}
function idForCard(card){return /^card-[0-9A-Z-]+$/.test(card?.id||'')?card.id.slice(5).replace(/-/g,'.'):null;}
function updateReadUI(id){
 const reads=getReads();
 document.querySelectorAll('.study-card[id^="card-"]').forEach(card=>{
  if(id&&idForCard(card)!==id)return;
  const output=card.querySelector('.cmn-read-number');
  if(output)output.textContent=String(reads[idForCard(card)]||0);
 });
 global.dispatchEvent(new Event('cmn:read-counts-changed'));
}
global.addEventListener('storage',event=>{if(event.key===READ_KEY||event.key===null)updateReadUI();});
function incrementRead(id){
 if(!id||!/^[0-9A-Z.]+$/.test(id))return;
 const reads=getReads(),n=reads[id]||0;
 if(n>=MAX_READS)return;
 reads[id]=n+1;
 if(putReads(reads))updateReadUI(id);
}
function mountReadCounters(){
 const container=document.getElementById('cardsContainer');
 if(!container)return;

 function decorate(){
  container.querySelectorAll('.study-card[id^="card-"]').forEach(card=>{
   if(!idForCard(card)||card.querySelector('.cmn-read-counter'))return;
   const box=document.createElement('div');box.className='cmn-read-counter';
   box.setAttribute('role','group');box.setAttribute('aria-label','Contador de leituras');
   const label=document.createElement('span');label.append('Leituras: ');
   const count=document.createElement('strong');count.className='cmn-read-number';count.textContent=String(getReads()[idForCard(card)]||0);
   label.append(count);
   const button=document.createElement('button');button.type='button';button.className='cmn-read-button';
   button.dataset.action='count-read';button.textContent='+ Registrar leitura';
   button.setAttribute('aria-label','Registrar mais uma leitura deste flashcard');
   button.title='Não altera o agendamento FSRS nem o status estudado';
   box.append(label,button);card.append(box);
  });
 }
 decorate();
 new MutationObserver(records=>{
  if(records.some(r=>Array.from(r.addedNodes).some(n=>n.nodeType===1&&(n.matches?.('.study-card')||n.querySelector?.('.study-card')))))decorate();
 }).observe(container,{childList:true,subtree:true});
 document.addEventListener('click',event=>{
  const target=event.target?.closest?.('[data-action]');
  const card=target?.closest?.('.study-card[id^="card-"]');
  if(!card)return;
  // Only an explicit counter action records a reading. Study status and FSRS stay independent.
  if(target.dataset.action==='count-read'){event.preventDefault();incrementRead(idForCard(card));}
 },true);

}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountReadCounters,{once:true});
else mountReadCounters();

function applyReadCounts(reads){if(!reads||typeof reads!=='object'||Array.isArray(reads)||Object.entries(reads).some(([id,count])=>!/^[0-9A-Z.]+$/.test(id)||!validCount(count)))return false;if(!putReads(reads))return false;updateReadUI();return true;}
global.CMNProgressIO=Object.freeze({encodeXML,parse,version:VERSION,getReadCounts:getReads,incrementRead,applyReadCounts});
})(window);
