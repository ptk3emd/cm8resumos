/* Cognitive study policies v1. Experimental, independent of the bundled FSRS model. */
(function(global){
'use strict';
const DAY=86400000, RETENTION=Object.freeze({verbatim:.9,gist:.8,transfer:.75});
const fail=msg=>{throw Error('Dados cognitivos inválidos: '+msg);};
const plain=o=>o&&typeof o==='object'&&!Array.isArray(o);
function classify(c){
 if(Object.hasOwn(RETENTION,c.traceType))return c.traceType;
 if(c.transferVariants?.length)return 'transfer';
 if(c.kind==='case'||c.scenario)return 'gist';
 if(/\{\{c\d+::/.test(c.question)||(/\b(definição|define|significa|qual é|quais são)\b/i.test(c.question)&&c.answer.length<220))return 'verbatim';
 return c.answer.length<150?'verbatim':'gist';
}
function migrate(cards){
 const metadata=Object.create(null),ids=new Set(cards.map(c=>c.id));
 for(const c of cards)metadata[c.id]={traceType:classify(c),anchor:c.anchor===true,dependsOn:(c.dependsOn||[]).filter(id=>ids.has(id)),confusableWith:(c.confusableWith||[]).filter(id=>ids.has(id)),transferVariants:c.transferVariants||[],weights:c.weights||{}};
 // Deliberate authored example: tumor lysis syndrome, relationships—not new medical claims.
 if(metadata['26.1.1'])metadata['26.1.1'].anchor=true;
 for(const id of ['26.1.2','26.1.3','26.1.4'])if(metadata[id])metadata[id].dependsOn=['26.1.1'];
 if(metadata['26.2.1']&&metadata['26.2.2']){metadata['26.2.1'].confusableWith=['26.2.2'];metadata['26.2.2'].confusableWith=['26.2.1'];}
 if(metadata['26.1.3']){metadata['26.1.3'].traceType='transfer';metadata['26.1.3'].transferVariants=[{prompt:'Após tratamento de um linfoma, uma pessoa desenvolve lise tumoral e arritmia. Qual distúrbio eletrolítico da SLT pode causar arritmia fatal rapidamente?',answer:'Hipercalemia.'},{prompt:'Na vigilância de uma pessoa com lise tumoral espontânea, qual alteração do potássio representa risco de arritmia fatal?',answer:'Hipercalemia.'}];}
 return {version:1,enabled:false,metadata,events:[]};
}
function validate(value,allowedIds){
 if(!plain(value)||value.version!==1||typeof value.enabled!=='boolean'||!plain(value.metadata)||!Array.isArray(value.events)||value.events.length>50000)fail('estrutura');
 const metadata=Object.create(null),seen=new Set();
 for(const [id,m] of Object.entries(value.metadata)){
  if(!allowedIds.has(id)||!plain(m)||!Object.hasOwn(RETENTION,m.traceType)||typeof m.anchor!=='boolean')fail('cartão '+id);
  for(const key of ['dependsOn','confusableWith'])if(!Array.isArray(m[key])||m[key].length>100||new Set(m[key]).size!==m[key].length||m[key].some(ref=>!allowedIds.has(ref)||ref===id))fail('referências '+id);
  if(!Array.isArray(m.transferVariants)||m.transferVariants.length>20||m.transferVariants.some(v=>!plain(v)||typeof v.prompt!=='string'||!v.prompt.trim()||v.prompt.length>10000||typeof v.answer!=='string'||!v.answer.trim()||v.answer.length>10000))fail('variações '+id);
  if(m.traceType==='transfer'&&!m.transferVariants.length)fail('transferência sem variações '+id);
  const weights=m.weights||{};if(!plain(weights)||Object.entries(weights).some(([ref,w])=>!m.dependsOn.includes(ref)||!Number.isFinite(w)||w<=0||w>1))fail('força de aresta '+id);
  metadata[id]={traceType:m.traceType,anchor:m.anchor,dependsOn:[...m.dependsOn],confusableWith:[...m.confusableWith],transferVariants:m.transferVariants.map(v=>({prompt:v.prompt,answer:v.answer})),weights:Object.fromEntries(m.dependsOn.map(ref=>[ref,weights[ref]??1]))};
 }
 if(Object.keys(metadata).length!==allowedIds.size)fail('metadados incompletos para este baralho');
 // Iterative topological sort rejects cycles without recursion depth risk.
 const degree=new Map(Object.entries(metadata).map(([id,m])=>[id,m.dependsOn.length])),children=new Map();
 for(const [id,m] of Object.entries(metadata))for(const parent of m.dependsOn){if(!metadata[parent])fail('pré-requisito ausente');if(!children.has(parent))children.set(parent,[]);children.get(parent).push(id);}
 const ready=[...degree].filter(([,n])=>!n).map(([id])=>id);let visited=0;
 for(let i=0;i<ready.length;i++){visited++;for(const child of children.get(ready[i])||[]){degree.set(child,degree.get(child)-1);if(!degree.get(child))ready.push(child);}}
 if(visited!==degree.size)fail('ciclo no grafo');
 const events=value.events.map(e=>{
  if(!plain(e)||typeof e.id!=='string'||!e.id||e.id.length>160||seen.has(e.id)||!['contrast','context','transfer','gist'].includes(e.kind)||!allowedIds.has(e.cardId)||!Number.isInteger(e.topic)||e.topic!==Number(e.cardId.split('.')[0])||typeof e.time!=='string'||!/^\d{4}-\d\d-\d\dT/.test(e.time)||!Number.isFinite(Date.parse(e.time))||!Number.isInteger(e.success)||!Number.isInteger(e.total)||e.total<1||e.total>3||e.success<0||e.success>e.total||!Number.isInteger(e.cycle)||e.cycle<0||!Number.isInteger(e.variant)||e.variant<0)fail('evento');
  seen.add(e.id);return {id:e.id,kind:e.kind,cardId:e.cardId,topic:e.topic,time:e.time,success:e.success,total:e.total,cycle:e.cycle,variant:e.variant};
 });
 return {version:1,enabled:value.enabled,metadata,events};
}
function graph(cards,state){
 const result=Object.create(null);
 for(const c of cards){const hubId='theme:'+c.topic;if(!result[hubId])result[hubId]={prerequisites:[],dependents:[],hubId:null};result[hubId].dependents.push(c.id);result[c.id]={prerequisites:state.metadata[c.id]?.dependsOn||[],dependents:[],hubId};}
 for(const c of cards)for(const parent of result[c.id].prerequisites)result[parent]?.dependents.push(c.id);
 return result;
}
function propagateStability(cardId,rating,records,g,state,interval){
 if(!state.enabled||rating<3)return [];
 const node=g[cardId],weights=new Map();if(!node)return [];
 for(const id of node.dependents)weights.set(id,.15*(state.metadata[id]?.weights?.[cardId]??1));
 if(state.metadata[cardId]?.anchor)for(const id of g[node.hubId].dependents)if(id!==cardId)weights.set(id,Math.max(weights.get(id)||0,.08));
 const updates=[];
 for(const [id,bonus] of weights){
  const row=records.get(id);if(!row||row.card.state!==2||!row.card.lastReviewAt||!(row.card.stability>0))continue;
  const c=row.card,base=row.graphBaseStability??c.stability,stability=Math.min(base*1.5,c.stability*(1+bonus));
  const next={...c,stability},days=interval(id,next);
  if(!Number.isFinite(days)||days<=0)continue;
  const dueAt=new Date(Math.max(new Date(c.dueAt).getTime(),new Date(c.lastReviewAt).getTime()+days*DAY));
  updates.push({...row,graphBaseStability:base,card:{...next,dueAt,scheduledDays:Math.max(c.scheduledDays,days)},graphBonus:{source:cardId,factor:stability/base}});
 }
 return updates;
}
function pools(cards,records,state){
 const A=[],B=[];for(const c of cards)(state.enabled&&state.metadata[c.id]?.traceType!=='verbatim'?B:A).push(c);
 return {A,B}; // Related verbatim cards remain reachable in A; they are never dropped.
}
function sessions(cards,records,state,now=new Date()){
 const events=state.events,contrast=[],context=[],topics=new Map();
 for(const c of cards){if(!topics.has(c.topic))topics.set(c.topic,c);const m=state.metadata[c.id];if(m?.traceType!=='verbatim'||!m.confusableWith.length)continue;
  const cycle=Math.floor((records.get(c.id)?.card.reps||0)/4);if(cycle&& !events.some(e=>e.kind==='contrast'&&e.cardId===c.id&&e.cycle>=cycle))contrast.push({kind:'contrast',cardId:c.id,topic:c.topic,cycle});
 }
 for(const [topic,c] of topics){const last=events.filter(e=>e.kind==='context'&&e.topic===topic).reduce((t,e)=>Math.max(t,Date.parse(e.time)),0);if(!last||now-last>=7*DAY)context.push({kind:'context',cardId:c.id,topic,cycle:Math.floor(now/(7*DAY))});}
 return [...contrast,...context];
}
function metrics(events){const result={};for(const kind of ['contrast','transfer','gist']){const rows=events.filter(e=>e.kind===kind),success=rows.reduce((n,e)=>n+e.success,0),total=rows.reduce((n,e)=>n+e.total,0);result[kind]={success,total,rate:total?success/total:null};}return result;}
function mergeEvents(...lists){return [...new Map(lists.flat().map(e=>[e.id,e])).values()];}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function encodeXML(state){
 const lines=['  <cognitive schema-version="1" enabled="'+state.enabled+'">'];
 for(const [id,m] of Object.entries(state.metadata)){
  lines.push('    <cognitive-card id="'+esc(id)+'" trace-type="'+m.traceType+'" anchor="'+m.anchor+'">');
  for(const ref of m.dependsOn)lines.push('      <depends-on ref="'+esc(ref)+'" weight="'+(m.weights?.[ref]??1)+'"/>');
  for(const ref of m.confusableWith)lines.push('      <confusable-with ref="'+esc(ref)+'"/>');
  for(const v of m.transferVariants)lines.push('      <transfer-variant><prompt>'+esc(v.prompt)+'</prompt><answer>'+esc(v.answer)+'</answer></transfer-variant>');
  lines.push('    </cognitive-card>');
 }
 for(const e of state.events)lines.push('    <event '+Object.entries(e).map(([k,v])=>k+'="'+esc(v)+'"').join(' ')+'/>');
 lines.push('  </cognitive>');return lines.join('\n');
}
function decodeXML(root,allowedIds){
 function attrs(node,allowed){if(node.namespaceURI||node.getAttributeNames().some(k=>!allowed.includes(k)))fail('atributo XML');}
 function elements(node){for(const n of node.childNodes)if(n.nodeType===3&&n.textContent.trim())fail('texto XML inesperado');else if(![1,3,8].includes(n.nodeType))fail('nó XML');return [...node.children];}
 attrs(root,['schema-version','enabled']);if(root.getAttribute('schema-version')!=='1'||!['true','false'].includes(root.getAttribute('enabled')))fail('versão XML');
 const state={version:1,enabled:root.getAttribute('enabled')==='true',metadata:Object.create(null),events:[]};
 let eventsStarted=false;
 for(const node of elements(root)){
  if(node.tagName==='cognitive-card'){
   if(eventsStarted)fail('ordem XML');
   attrs(node,['id','trace-type','anchor']);const id=node.getAttribute('id');if(Object.hasOwn(state.metadata,id)||!['true','false'].includes(node.getAttribute('anchor')))fail('cartão XML');
   const m={traceType:node.getAttribute('trace-type'),anchor:node.getAttribute('anchor')==='true',dependsOn:[],confusableWith:[],transferVariants:[],weights:{}};
   let childOrder=0;for(const child of elements(node)){
    const order={'depends-on':0,'confusable-with':1,'transfer-variant':2}[child.tagName];if(order===undefined||order<childOrder)fail('ordem de relações XML');childOrder=order;
    if(['depends-on','confusable-with'].includes(child.tagName)){attrs(child,child.tagName==='depends-on'?['ref','weight']:['ref']);if(elements(child).length)fail('referência XML');const ref=child.getAttribute('ref');m[child.tagName==='depends-on'?'dependsOn':'confusableWith'].push(ref);if(child.tagName==='depends-on')m.weights[ref]=child.hasAttribute('weight')?Number(child.getAttribute('weight')):1;}
    else if(child.tagName==='transfer-variant'){attrs(child,[]);const parts=elements(child);if(parts.length!==2||parts[0].tagName!=='prompt'||parts[1].tagName!=='answer')fail('variação XML');for(const part of parts){attrs(part,[]);if(part.children.length)fail('texto da variação');}m.transferVariants.push({prompt:parts[0].textContent,answer:parts[1].textContent});}
    else fail('elemento XML');
   }state.metadata[id]=m;
  }else if(node.tagName==='event'){eventsStarted=true;
   const keys=['id','kind','cardId','topic','time','success','total','cycle','variant'];attrs(node,keys);if(elements(node).length||keys.some(k=>!node.hasAttribute(k)))fail('evento XML');const e=Object.fromEntries(keys.map(k=>[k,node.getAttribute(k)]));for(const k of ['topic','success','total','cycle','variant']){if(!/^\d+$/.test(e[k]))fail('número XML');e[k]=Number(e[k]);}state.events.push(e);
  }else fail('elemento XML');
 }
 return validate(state,allowedIds);
}
global.CMNCognitive=Object.freeze({DAY,RETENTION,classify,migrate,validate,graph,propagateStability,pools,sessions,metrics,mergeEvents,encodeXML,decodeXML});
})(window);
