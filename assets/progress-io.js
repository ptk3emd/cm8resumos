/* CM8 progress v1: strict XML schema validation + legacy JSON reader. No dependencies. */
(function(global){
'use strict';
const FORMAT='cmn-flashcards-progresso',VERSION='1',MAX_CARDS=10000;
const rootAttrs=['format','schema-version','exported-at','card-count'];
const cardAttrs=['id','status','star','hidden'];
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
function encodeXML(marks,total){
 const allowed=new Set(Object.keys(marks));
 const cards=normalize(marks,allowed);
 const lines=['<?xml version="1.0" encoding="UTF-8"?>',
  '<cmn-progress format="'+FORMAT+'" schema-version="'+VERSION+'" exported-at="'+new Date().toISOString()+'" card-count="'+total+'">'];
 for(const [id,mark] of Object.entries(cards)){
  let line='  <card id="'+xmlAttr(id)+'"';
  if(mark.status)line+=' status="'+mark.status+'"';
  if(mark.star)line+=' star="true"';
  if(mark.hidden)line+=' hidden="true"';
  lines.push(line+' />');
 }
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
 const elements=[];
 for(const node of root.childNodes){
  if(node.nodeType===1){if(node.tagName!=='card'||node.namespaceURI)error('O XML contém elementos não reconhecidos.');elements.push(node);}
  else if(node.nodeType===3){if(node.textContent.trim())error('O XML contém texto fora das marcações.');}
  else if(node.nodeType!==8)error('O XML contém estrutura não permitida.');
 }
 if(elements.length>MAX_CARDS)error('O backup tem mais de 10 mil marcações.');
 const cards=Object.create(null),seen=new Set();let ignored=0;
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
  if(!allowedIds.has(id)){ignored++;continue;}
  const mark=Object.create(null);
  if(status)mark.status=status;
  if(node.getAttribute('star')==='true')mark.star=true;
  if(node.getAttribute('hidden')==='true')mark.hidden=true;
  if(!Object.keys(mark).length)error('A marcação do cartão '+id+' está vazia.');
  cards[id]=mark;
 }
 if(elements.length&&!Object.keys(cards).length)error('Nenhum cartão do XML corresponde a esta biblioteca. O progresso foi preservado.');
 return{cards,valid:Object.keys(cards).length,ignored,format:'XML'};
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
 return trimmed.startsWith('<')?parseXML(trimmed,allowedIds):parseJSON(trimmed,allowedIds);
}
global.CMNProgressIO=Object.freeze({encodeXML,parse,version:VERSION});
})(window);
