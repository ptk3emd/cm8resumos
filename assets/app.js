
function startStudy(source){'use strict';
const pageKind=document.body.dataset.page||'study';
const CARDS=source.cards.slice().sort((a,b)=>Number(a.topic)-Number(b.topic)),TOPICS=source.themes.slice().sort((a,b)=>Number(a.id)-Number(b.id));
const ALL_IDS=new Set(CARDS.map(c=>c.id));const TOTAL=CARDS.length,STORE_KEY='cmn-flashcards-v1',THEME_KEY='cmn-flashcards-theme-v1';
const byId=new Map(CARDS.map(c=>[c.id,c]));const topicsById=new Map(TOPICS.map(t=>[t.id,t]));
const $=id=>document.getElementById(id);const qsa=s=>Array.from(document.querySelectorAll(s));
function safe(t){return String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function norm(t){return String(t??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
let storageOK=true;
function sanitizedMarks(src){const result=Object.create(null);if(!src||typeof src!=='object'||Array.isArray(src))return result;
 for(const [id,m] of Object.entries(src)){if(!ALL_IDS.has(id)||!m||typeof m!=='object'||Array.isArray(m))continue;
  const one={};if(m.status==='done'||m.status==='review')one.status=m.status;
  if(m.star===true)one.star=true;if(m.hidden===true)one.hidden=true;
  if(Object.keys(one).length)result[id]=one;}
 return result;}
function getSaved(){try{const raw=JSON.parse(localStorage.getItem(STORE_KEY)||'{}');return sanitizedMarks(raw?.cards);}catch{storageOK=false;return Object.create(null);}}
function storageNotice(){ $('storageAlert').hidden=storageOK; }

let marks=getSaved();
let ui={topic:'all',level:'all',type:'all',audit:'all',status:'all',search:'',mode:'list',focusSidebarCollapsed:true,limit:22,shuffle:false,focusId:null,showAll:false};

/* Navigation state belongs in the URL, not in the study progress backup. */
const NAV_MODES=new Set(['list','focus','fsrs']);
let restoringNavigation=false;
function readNavigationState(){
 const params=new URL(location.href).searchParams,topic=params.get('topic'),mode=params.get('mode');
 ui.topic=topic&&TOPICS.some(t=>String(t.id)===topic)?topic:'all';
 ui.mode=NAV_MODES.has(mode)?mode:'list';
 const status=params.get('status');ui.status=['all','done','review','todo','star','hidden'].includes(status)?status:'all';
 ui.limit=22;ui.focusId=null;ui.showAll=false;
}
function writeNavigationState(){
 if(pageKind!=='study')return;
 const target=new URL(location.href);
 const topic=target.searchParams.get('topic')||'all',mode=target.searchParams.get('mode')||'list';
 const status=target.searchParams.get('status')||'all';
 if(topic===ui.topic&&mode===ui.mode&&status===ui.status)return;
 target.searchParams.delete('topic');target.searchParams.delete('mode');target.searchParams.delete('status');
 if(ui.topic!=='all')target.searchParams.set('topic',ui.topic);
 if(ui.mode!=='list')target.searchParams.set('mode',ui.mode);
 if(ui.status!=='all')target.searchParams.set('status',ui.status);
 if(target.hash.startsWith('#answer-'))target.hash='';
 history.pushState({cm8Navigation:true},'',target.pathname+target.search+target.hash);
}
function updateTopicPicker(){
 const select=$('topicJump');
 if(select.options.length!==TOPICS.length+1){
  select.innerHTML='<option value="all">Todos os temas</option>'+TOPICS.map(t=>'<option value="'+t.id+'">'+safe(t.title)+'</option>').join('');
 }
 if(select.value!==ui.topic)select.value=ui.topic;
}
function renderTopicPager(){
 const index=TOPICS.findIndex(t=>String(t.id)===ui.topic),visible=index>=0;
 $('topicPager').hidden=!visible;
 if(!visible)return;
 $('topicPosition').textContent='Tema '+(index+1)+' de '+TOPICS.length;
 $('prevTopic').disabled=index===0;
 $('nextTopic').disabled=index===TOPICS.length-1;
}

let openAnswers=new Set();let shuffleOrder=new Map();let toastTimer;
const mark=id=>marks[id]||{};const status=id=>mark(id).status||'todo';
function save(){try{localStorage.setItem(STORE_KEY,JSON.stringify({version:1,exportedAt:new Date().toISOString(),cards:marks,cognitive:cognitiveSnapshot()}));storageOK=true;storageNotice();return true;}
 catch{storageOK=false;storageNotice();notify('Progresso não salvo. Use “Exportar progresso agora” para não perder suas marcações.',5500);return false;}}
function setMark(id,field,value){if(!ALL_IDS.has(id))return;const next={...mark(id),[field]:value};if(next.status==='todo')delete next.status;if(!next.star)delete next.star;if(!next.hidden)delete next.hidden;
 if(Object.keys(next).length)marks[id]=next;else delete marks[id];save();render();
 const action=field==='status'?(value==='review'?'review':'done'):field==='star'?'star':field==='hidden'?'hide':'';
 if(action){const btn=Array.from($('cardsContainer').querySelectorAll('[data-action]')).find(el=>el.dataset.action===action&&el.dataset.id===id);if(btn){btn.classList.add('action-ack');btn.addEventListener('animationend',()=>btn.classList.remove('action-ack'),{once:true});}}}
function notify(message,duration=3000){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),duration);}
function totals(){let done=0,review=0,hidden=0,stars=0;for(const c of CARDS){let m=mark(c.id);if(m.status==='done')done++;else if(m.status==='review')review++;if(m.hidden)hidden++;if(m.star)stars++;}return{done,review,hidden,stars,todo:TOTAL-done-review};}
function getFiltered(){let list=CARDS.filter(c=>{
 const m=mark(c.id),s=status(c.id);
 if(ui.topic!=='all'&&c.topic!==Number(ui.topic))return false;
 if(ui.level!=='all'&&c.level!==Number(ui.level))return false;
 if(ui.type==='new'&&!c.new)return false;if(ui.type==='original'&&c.new)return false;
 if(ui.audit!=='all'&&c.audit?.status!==ui.audit)return false;
 if(ui.status==='hidden'){if(!m.hidden)return false;}
 else{if(m.hidden)return false; if(ui.status==='todo'&&s!=='todo')return false;if(ui.status==='review'&&s!=='review')return false;if(ui.status==='done'&&s!=='done')return false;if(ui.status==='star'&&!m.star)return false;}
 if(ui.search&&liveHits()){if(!ui.searchHits.has(c.id))return false;}
 else if(ui.search){const shown=displayText(c);let h=norm([c.id,shown.scenario,shown.question,shown.answer,topicsById.get(c.topic)?.title,topicsById.get(c.topic)?.area].join(' '));if(!h.includes(ui.search))return false;}
 return true;});
 if(ui.shuffle){list=list.slice().sort((a,b)=>(shuffleOrder.get(a.id)||0)-(shuffleOrder.get(b.id)||0));}
 else if(ui.search&&liveHits()){const H=ui.searchHits;list=list.slice().sort((a,b)=>H.get(a.id).rank-H.get(b.id).rank);}
 return list;}
function renderStats(){let t=totals();$('studyStart').hidden=ui.mode!=='list';$('nTotal').textContent=TOTAL;$('nDone').textContent=t.done;$('nReview').textContent=t.review;$('nTodo').textContent=t.todo;$('nStar').textContent=t.stars;$('segDone').style.width=(t.done/TOTAL*100)+'%';$('segReview').style.width=(t.review/TOTAL*100)+'%';qsa('[data-jump]').forEach(b=>b.setAttribute('aria-pressed',String(ui.mode!=='fsrs'&&b.dataset.jump!=='all'&&ui.status===b.dataset.jump)));let pct=t.done/TOTAL*100,shown=(pct>0&&pct<1)?pct.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}):Math.round(pct).toLocaleString('pt-BR');$('heroPct').textContent=shown+'%';$('heroFill').style.width=pct+'%';$('heroProgressTrack').setAttribute('aria-valuenow',pct.toFixed(1));$('heroDetail').textContent=`${t.done} de ${TOTAL} marcados como estudados · ${t.hidden} ocultos`;}
const ICON_CHECK='<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
function topicStats(){const map=new Map(TOPICS.map(t=>[t.id,{total:0,done:0,review:0}]));for(const c of CARDS){const r=map.get(c.topic);if(!r)continue;r.total++;const s=status(c.id);if(s==='done')r.done++;else if(s==='review')r.review++;}return map;}
function renderTopics(){const stats=topicStats();let contents=`<button class="topic-btn topic-all ${ui.topic==='all'?'active':''}" data-topic="all" aria-current="${ui.topic==='all'?'page':'false'}"><span class="topic-num" aria-hidden="true"></span><span><span class="topic-name">Todos os temas</span><span class="topic-small">${TOTAL} flashcards disponíveis</span></span></button>`;
 let cells='';
 for(const t of TOPICS){const r=stats.get(t.id),pct=r.total?Math.round(r.done/r.total*100):0,dPct=r.total?r.done/r.total*100:0,rPct=r.total?r.review/r.total*100:0,active=ui.topic===String(t.id),state=r.total&&r.done===r.total?'done':r.done||r.review?'progress':'new';
  const stateHtml=state==='done'?`<span class="topic-state is-done">${ICON_CHECK}Concluído</span>`:`<span class="topic-state">${r.done}/${r.total} estudados · ${pct}%</span>`+(r.review?` · <span class="topic-state is-review">${r.review} a revisar</span>`:'');
  contents+=`<button class="topic-btn ${active?'active':''}" data-topic="${t.id}" data-state="${state}" data-name="${safe(norm(t.title+' '+t.area))}" aria-current="${active?'page':'false'}"><span class="topic-num">${String(t.id).padStart(2,'0')}</span><span><span class="topic-name">${safe(t.title)}</span><span class="topic-small">${stateHtml}</span><span class="mini-meter" aria-hidden="true"><i style="width:${dPct}%"></i><b style="width:${rPct}%"></b></span></span></button>`;
  cells+=`<button type="button" role="listitem" class="map-cell ${state==='done'?'is-complete':''}" data-topic="${t.id}" aria-current="${active?'true':'false'}" aria-label="${safe(t.title)}: ${r.done} de ${r.total} estudados${r.review?', '+r.review+' para revisar':''}"><span class="map-num"><span>${String(t.id).padStart(2,'0')}</span><span>${pct}%</span></span><span class="map-name">${safe(t.title)}</span><span class="map-bar" aria-hidden="true"><i style="width:${dPct}%"></i><b style="width:${rPct}%"></b></span></button>`;}
 const rail=$('topicList'),previousScroll=rail.scrollLeft;rail.innerHTML=contents;if(previousScroll)rail.scrollLeft=previousScroll;
 const grid=$('mapGrid');if(grid){const ps=grid.scrollLeft;grid.innerHTML=cells;if(ps)grid.scrollLeft=ps;}
 const complete=[...stats.values()].filter(r=>r.total&&r.done===r.total).length;$('mapHint').textContent=`${complete} de ${TOPICS.length} temas concluídos`;$('topicCount').textContent=`${TOPICS.length} temas`;
 applyTopicFilter();updateTopicPicker();}
function applyTopicFilter(){const q=norm($('topicFilter').value.trim());let shown=0;qsa('#topicList .topic-btn[data-name]').forEach(b=>{const ok=!q||b.dataset.name.includes(q)||b.dataset.topic===q.replace(/^0+/,'');b.hidden=!ok;if(ok)shown++;});$('topicFilterEmpty').hidden=shown>0;}
const structuredAnswerCache=new Map();
function answerLabelIndex(line){
 const raw=String(line).trim();let depth=0;
 for(let i=0;i<raw.length;i++){
  const ch=raw[i];
  if(ch==="("||ch==="["||ch==="{"){depth++;continue;}
  if(ch===")"||ch==="]"||ch==="}"){depth=Math.max(0,depth-1);continue;}
  if(ch!==":"||depth!==0)continue;
  if(i+1<raw.length&&!/\s/.test(raw[i+1]))return -1;
  const label=raw.slice(0,i).trim();
  if(label.length<2||label.length>72||label.split(/\s+/).length>11)return -1;
  if(!/^[A-ZÀ-Ý0-9]/.test(label)||/[!?]|\.(?:\s|$)/.test(label)||/^https?$/i.test(label))return -1;
  if(!/[a-zA-ZÀ-ÿ]/.test(label))return -1;
  return i;
 }
 return -1;
}

function answerFormulaHtml(text){
 const formulae={
  "$\\text{Na}^+/\\text{K}^+$":'<span class="answer-formula" role="math" aria-label="sódio positivo sobre potássio positivo">Na<sup>+</sup>/K<sup>+</sup></span>',
  "$\\text{O}_2$":'<span class="answer-formula" role="math" aria-label="oxigênio O dois">O<sub>2</sub></span>',
  "$\\alpha 4$":'<span class="answer-formula" role="math" aria-label="alfa quatro">α4</span>'
 };
 return String(text).split(/(\$[^$]+\$)/g).map(part=>formulae[part]||safe(part)).join("");
}

function answerReadUnits(line){
 const raw=String(line).trim();if(raw.length<340)return [raw];
 const pieces=[];let depth=0,start=0;
 for(let i=0;i<raw.length-2;i++){
  const ch=raw[i];
  if(ch==="("||ch==="["||ch==="{"){depth++;continue;}
  if(ch===")"||ch==="]"||ch==="}"){depth=Math.max(0,depth-1);continue;}
  if(depth||ch!=="."||raw[i+1]!==" "||i-start<145||raw.length-(i+2)<80)continue;
  if(!/[A-ZÀ-Ú]/.test(raw[i+2]))continue;
  if(/(?:\b(?:ex|p\.ex|dr|dra|prof|sr|sra|fig|vs|etc|aprox)\.)$/i.test(raw.slice(Math.max(start,i-14),i+1)))continue;
  pieces.push(raw.slice(start,i+1).trim());start=i+2;i=start-1;
 }
 if(start<raw.length)pieces.push(raw.slice(start).trim());
 return pieces.length?pieces:[raw];
}

function answerInline(line){
 const raw=String(line).trim(),idx=answerLabelIndex(raw);
 if(idx<0)return answerFormulaHtml(raw);
 const label=raw.slice(0,idx+1),rest=raw.slice(idx+1);
 return `<strong class="answer-lead">${answerFormulaHtml(label)}</strong>${rest?answerFormulaHtml(rest):""}`;
}

function answerTextMarkup(line){
 return answerReadUnits(line).map(text=>`<p class="answer-paragraph">${answerInline(text)}</p>`).join("");
}

function answerListMarkup(group){
 const ordered=group.type==="ordered",tag=ordered?"ol":"ul";
 const first=group.items[0]?.marker||"1",attr=ordered?` start="${Number(first)}"`:"";
 const elements=group.items.map(item=>{
  const val=ordered?` value="${Number(item.marker)}"`:"";
  const marker=item.marker+(ordered?")":"");
  return `<li class="answer-point"${val}><span class="answer-point-index" aria-hidden="true">${safe(marker)}</span><div class="answer-point-body">${item.lines.map(answerTextMarkup).join("")}</div></li>`;
 }).join("");
 return `<${tag} class="answer-points ${ordered?"answer-points-numbered":"answer-points-bulleted"}"${attr} aria-label="${ordered?"Itens numerados da resposta":"Pontos da resposta"}">${elements}</${tag}>`;
}

function answerBlocks(answer){
 const lines=String(answer??"").replace(/\r\n?/g,"\n").replace(/;\s+(?=\d{1,2}[.)]\s+)/g,";\n").split("\n");
 const blocks=[];let list=null,section=null;
 for(const entry of lines){
  const line=entry.trim();
  if(!line){list=null;section=null;continue;}
  const numbered=line.match(/^(\d{1,2})[.)]\s+(.+)$/),bulleted=line.match(/^([•▪-])\s+(.+)$/);
  if(numbered||bulleted){
   section=null;
   const type=numbered?"ordered":"bulleted";
   if(!list||list.type!==type){list={kind:"list",type,items:[]};blocks.push(list);}
   list.items.push({marker:numbered?numbered[1]:bulleted[1],lines:[numbered?numbered[2]:bulleted[2]]});
   continue;
  }
  const idx=answerLabelIndex(line);
  if(list&&list.items.length){
   const item=list.items[list.items.length-1],prev=item.lines[item.lines.length-1];
   if(idx<0||!/[.;]$/.test(prev)||/:$/.test(prev)){item.lines.push(line);continue;}
   list=null;
  }
  if(idx>=0){
   const rest=line.slice(idx+1).trimStart();
   section={kind:"section",label:line.slice(0,idx+1),lines:rest?[rest]:[]};
   blocks.push(section);continue;
  }
  if(section){section.lines.push(line);continue;}
  blocks.push({kind:"paragraph",text:line});
 }
 return blocks;
}

function answerRole(label){
 const s=String(label).replace(/:$/,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 if(/^(?:armadilha\b|alerta\b|atencao\b|cautela\b|contraindicac|farmacos a evitar\b|evitar\b|nao usar\b|precaucao\b)/.test(s))return 'caution';
 if(/^(?:tratamento\b|conduta\b|manejo\b|terapia\b|terapeutica\b|profilaxia\b|prevencao\b|intervencao\b|vacinacao\b|monitorizacao\b|acompanhamento\b|seguimento\b)/.test(s))return 'action';
 if(/^(?:diagnostico\b|investigacao\b|criterios?\b|avaliacao\b|exames?\b|sinais?\b|sintomas?\b|clinica\b|quadro\b|diferenciais?\b|classificacao\b|rastreio\b|rastreamento\b|confirmacao\b)/.test(s))return 'assessment';
 if(/^(?:fisiopatologia\b|causas?\b|etiologia\b|mecanismo\b|fatores de risco\b|definicao\b|conceito\b|principio\b)/.test(s))return 'mechanism';
 return 'neutral';
}
function answerHtml(answer,cardId){
 if(textEdits[cardId])return '<div class="answer-title">Resposta</div><div class="answer-copy rich-content">'+textEdits[cardId].answer+'</div>';
 const raw=String(answer??""),key=String(cardId)+"\u0000"+raw;
 if(structuredAnswerCache.has(key))return structuredAnswerCache.get(key);
 const blocks=answerBlocks(raw),sections=[];
 const stem=String(cardId).replace(/[^a-zA-Z0-9-]/g,"-");let chapter=0;
 const body=blocks.map(block=>{
  if(block.kind==="list")return answerListMarkup(block);
  if(block.kind==="paragraph")return answerTextMarkup(block.text);
  const id=`answer-${stem}-${++chapter}`,role=answerRole(block.label);
  sections.push({id,label:block.label.slice(0,-1).trim(),role});
  return `<section class="answer-section answer-section--${role}" data-role="${role}" id="${safe(id)}"><h4 class="answer-subheading"><span class="answer-section-number" aria-hidden="true">${String(chapter).padStart(2,'0')}</span><span class="answer-subheading-text">${answerFormulaHtml(block.label)}</span></h4>${block.lines.map(answerTextMarkup).join("")}</section>`;
 }).join("");
 const outline=sections.length>=2&&raw.length>=450?
  `<nav class="answer-outline" aria-label="Tópicos desta resposta"><span class="answer-outline-title">Mapa da resposta</span><ol class="answer-outline-links">${sections.map((item,i)=>`<li class="answer-outline-item answer-outline--${item.role}"><a href="#${safe(item.id)}"><span class="answer-outline-node" aria-hidden="true">${String(i+1).padStart(2,"0")}</span><span class="answer-outline-label">${answerFormulaHtml(item.label)}</span></a></li>`).join("")}</ol></nav>`:"";
 const markup=`<div class="answer-title">Resposta</div><div class="answer-copy">${outline}${body}</div>`;
 structuredAnswerCache.set(key,markup);
 return markup;
}

function questionHtml(c){
 const edit=textEdits[c.id];
 if(edit)return (c.scenario?'<div class="case-question"><span class="case-vignette-label">Caso clínico</span><div class="case-vignette rich-content">'+edit.scenario+'</div><span class="case-prompt-label">Pergunta</span>':'')+
 '<div tabindex="-1" class="question rich-content" role="group" aria-label="Pergunta">'+edit.question+'</div>'+(c.scenario?'</div>':'');
 if(c.kind!=="case")return `<h3 tabindex="-1" class="question">${safe(c.question)}</h3>`;
 return `<div class="case-question"><span class="case-vignette-label">Caso clínico</span><p class="case-vignette">${safe(c.scenario)}</p><span class="case-prompt-label">Pergunta</span><h3 tabindex="-1" class="question case-prompt">${safe(c.question)}</h3></div>`;
}
function auditState(c){
 if(textEdits[c.id])return '<span class="audit-status">Editado por você · revisão original</span>';
 const status=c.audit?.status||'triado';
 const labels={corrigido:'Revisão direcionada',revisar:'Conferir conteúdo',triado:'Triagem estrutural',novo:'Caso didático'};
 return '<span class="audit-status audit-'+safe(status)+'">'+safe(labels[status]||'Verificar revisão')+'</span>';
}
function auditInfoHtml(c){
 const a=c.audit||{},status=a.status||'triado';
 const notes={
  corrigido:'Revisão médica direcionada. Não representa certificação independente da resposta.',
  revisar:'Há pontos pendentes. Confira diretrizes e fontes primárias antes de memorizar ou utilizar clinicamente.',
  triado:'Triagem estrutural não equivale à validação clínica completa.',
  novo:'Vinheta didática sem validação clínica independente.'
 };
 const source=typeof a.fonte==='string'&&/^https:\/\/[^\s<>"']+$/.test(a.fonte)?a.fonte:null;
 const sourceLink=source?'<a target="_blank" rel="noopener noreferrer" href="'+safe(source)+'">Abrir fonte orientadora (externa)</a>':'Fonte primária não vinculada neste cartão.';
 return '<details class="audit-info"><summary>Sobre a revisão deste conteúdo</summary><div class="audit-body">'+
  (a.motivo?'<p>'+safe(a.motivo)+'</p>':'')+
  '<p>'+safe(notes[status]||'Consulte diretrizes clínicas atualizadas.')+'</p><p>'+sourceLink+'</p></div></details>';
}
function cardHtml(c){let m=mark(c.id),s=status(c.id),visible=ui.showAll||openAnswers.has(c.id),topic=topicsById.get(c.topic),ss=s==='done'?'Estudado':s==='review'?'Revisar':m.hidden?'Oculto':'';
 return `<article class="study-card ${s==='done'?'is-done':s==='review'?'is-review':''}" id="card-${safe(c.id.replaceAll('.','-'))}" aria-label="Cartão de estudo ${safe(c.id)}"><div class="study-card-head"><div class="meta-line"><div class="meta-chips"><span class="meta-id">${safe(c.id)}</span><span class="chip">${c.new?'Complemento':'Nível '+c.level}</span>${c.new?'<span class="chip chip-new">NOVO</span>':''}${c.page!=null?`<span class="chip">p. ${safe(c.page)}</span>`:''}${auditState(c)}</div>${ss?`<span class="status-chip ${s==='done'?'done':s==='review'?'review':'hidden'}">${ss}</span>`:''}</div>${questionHtml(c)}<div class="theme-hint">${String(c.topic).padStart(2,'0')} · ${safe(topic.title)}</div>${searchBadge(c)}</div>
 <div class="answer-region">${visible?`<div class="answer-box" tabindex="-1" role="region" aria-label="Resposta do flashcard ${safe(c.id)}">${answerHtml(c.answer,c.id)}</div>`:`<div class="answer-hidden"><span class="hidden-copy">Tente responder antes de revelar a resposta.</span><button type="button" class="action action-primary reveal-btn" data-action="reveal" data-id="${safe(c.id)}" aria-expanded="false">Revelar resposta</button></div>`}</div>
 ${auditInfoHtml(c)}
 <div class="action-row">${visible?`<button type="button" class="action" data-action="reveal" data-id="${safe(c.id)}" aria-expanded="true">Ocultar resposta</button>`:''}<button type="button" class="action primary-mark ${s==='done'?'done':''}" data-action="done" data-id="${safe(c.id)}" aria-label="${s==='done'?'Desmarcar como estudado':'Marcar como estudado'}" aria-pressed="${s==='done'}">Estudado</button><button type="button" class="action primary-mark ${s==='review'?'review':''}" data-action="review" data-id="${safe(c.id)}" aria-label="${s==='review'?'Retirar da revisão':'Marcar para revisar depois'}" aria-pressed="${s==='review'}">Revisar</button><details class="more-actions"><summary aria-label="Mais ações do cartão ${safe(c.id)}">Mais ações</summary><div class="more-actions-menu">${editButton(c)}<button type="button" class="action ${m.star?'starred':''}" data-action="star" data-id="${safe(c.id)}" aria-label="${m.star?'Remover dos favoritos':'Adicionar aos favoritos'}" aria-pressed="${!!m.star}">${m.star?'Remover dos favoritos':'Favoritar'}</button><button type="button" class="action secondary spacer-left" data-action="hide" data-id="${safe(c.id)}" aria-label="${m.hidden?'Reexibir cartão oculto':'Ocultar cartão da lista'}">${m.hidden?'Reexibir cartão':'Ocultar cartão'}</button><button type="button" class="action secondary" data-action="copy" data-id="${safe(c.id)}" title="Copiar pergunta e resposta">Copiar</button></div></details></div></article>`;}
function hasRefinements(){return ui.level!=='all'||ui.type!=='all'||ui.audit!=='all'||ui.status!=='all'||!!ui.search;}
function clearRefinements(){clearTimeout(searchTimer);ui.level=ui.type=ui.audit=ui.status='all';ui.search='';ui.limit=22;ui.focusId=null;
 $('searchBox').value='';$('levelSelect').value='all';$('typeSelect').value='all';$('auditSelect').value='all';render();}
function emptyHtml(){const onlyHidden=ui.status==='hidden',searching=Boolean(ui.search);
 const title=onlyHidden&&!searching?'Nenhum cartão oculto':searching?'Nenhum resultado para esta busca':'Nenhum cartão neste filtro';
 const detail=onlyHidden&&!searching?'Você ainda não ocultou nenhum cartão.':searching?'Confira a ortografia ou remova algum filtro para ampliar os resultados.':'Tente outro tema ou remova os filtros para encontrar cartões.';
 return `<div class="empty"><svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="m8 11 3 3 5-5"/></svg><h3>${title}</h3><p>${detail}</p>${hasRefinements()?`<button type="button" class="subtle-btn" data-action="clearRefinements">Limpar filtros${ui.topic==='all'?'':' deste tema'}</button>`:`<button type="button" class="subtle-btn" data-action="clearFilters">Ver todos os cartões</button>`}</div>`;}
function rememberFocus(){
 const el=document.activeElement;
 if(!el||!el.closest)return null;
 if(el.closest('#topicList')&&el.dataset.topic!==undefined)return{kind:'topic',topic:el.dataset.topic};
 if(el.closest('#cardsContainer')||el.closest('#focusNav')){
  if(el.dataset.action)return{kind:'action',action:el.dataset.action,id:el.dataset.id||null};
  const card=el.closest('.study-card');
  if(card&&(el.classList.contains('answer-box')||el.classList.contains('question')))
   return{kind:el.classList.contains('answer-box')?'answer':'question',id:card.id.slice(5).replaceAll('-','.')};
 }
 return null;
}
function restoreFocus(ref){
 if(!ref)return;
 let target=null;
 if(ref.kind==='topic')target=Array.from(document.querySelectorAll('#topicList [data-topic]')).find(el=>el.dataset.topic===ref.topic);
 if(ref.kind==='answer'||ref.kind==='question'){
  const sameCard=document.getElementById('card-'+ref.id.replaceAll('.','-'));
  const card=sameCard||$('cardsContainer').querySelector('.study-card');
  target=ref.kind==='answer'&&sameCard?(card?.querySelector('.answer-box')||card?.querySelector('.reveal-btn')||card?.querySelector('.question')):card?.querySelector('.question');
 }
 if(ref.kind==='action'){
  const all=Array.from(document.querySelectorAll('#cardsContainer [data-action],#focusNav [data-action]'));
  target=all.find(el=>el.dataset.action===ref.action&&(!ref.id||el.dataset.id===ref.id)&&!el.disabled);
  // After revealing, return the focus to the actual answer rather than a distant action button.
  if(ref.action==='reveal'&&ref.id&&(ui.showAll||openAnswers.has(ref.id))){
   const card=document.getElementById('card-'+ref.id.replaceAll('.','-'));
   target=card?.querySelector('.answer-box')||target;
  }
  if(!target&&ref.action==='clearFilters')target=$('searchBox');
  if(!target)target=all.find(el=>!el.disabled)||$('searchBox');
 }
 if(target){const menu=target.closest("details.more-actions");if(menu)menu.open=true;try{target.focus({preventScroll:true});}catch{target.focus();}}
}
function renderCards(list){renderCardsInner(list);if(ui.search&&ui.mode!=='fsrs')highlightTerms($('cardsContainer'));}
function renderCardsInner(list){let focusBefore=rememberFocus();let container=$('cardsContainer');if(ui.mode==='focus'){if(!list.length){container.innerHTML=emptyHtml();$('focusNav').hidden=true;$('moreWrap').hidden=true;restoreFocus(focusBefore);return;}
 let idx=list.findIndex(c=>c.id===ui.focusId);if(idx<0){idx=0;ui.focusId=list[0].id;}
 container.innerHTML=cardHtml(list[idx]);$('focusNav').hidden=false;$('focusNav').innerHTML=`<span class="focus-counter">Cartão ${idx+1} de ${list.length}</span><div class="focus-arrows"><button data-action="prev" ${idx===0?'disabled':''} aria-label="Cartão anterior">← Anterior</button><button data-action="next" ${idx===list.length-1?'disabled':''} aria-label="Próximo cartão">Próximo →</button></div>`;$('moreWrap').hidden=true;restoreFocus(focusBefore);return;}
 $('focusNav').hidden=true;
 let shown=list.slice(0,ui.limit);container.innerHTML=shown.length?shown.map(cardHtml).join(''):emptyHtml();let rest=list.length-shown.length;$('moreWrap').hidden=rest<=0;if(rest>0)$('moreBtn').textContent=`Mostrar mais ${Math.min(22,rest)} cartões · ${rest} restantes`;restoreFocus(focusBefore);}
function renderControls(){
 renderTopicPager();
 if(ui.mode!=='fsrs')clearTimeout(fsrsRefreshTimer);
 $('fsrsSettings').hidden=ui.mode!=='fsrs'||!!cognitiveSession;$('cognitivePools').hidden=ui.mode!=='fsrs'||!cognitiveState.enabled;
 $('statusFilters').querySelector('[data-filter="hidden"]').hidden=ui.mode==='fsrs';
 $('statusFilters').setAttribute('aria-label','Filtrar marcações manuais');
 $('shuffleBtn').hidden=ui.mode==='fsrs';
 $('revealAllBtn').hidden=ui.mode==='fsrs';
 const inSession=ui.mode==='focus'||ui.mode==='fsrs';
 const collapsed=inSession&&ui.focusSidebarCollapsed;
 document.querySelector('.main-shell').classList.toggle('focus-immersive',collapsed);
 $('focusSidebarToggle').hidden=!inSession;
 $('fsrsFeedback').hidden=ui.mode!=='fsrs'||!$('fsrsFeedbackText').textContent;
 const mobileTopicsVisible=window.matchMedia('(max-width:850px)').matches;
 const sidebarVisible=mobileTopicsVisible?$('sidebar').classList.contains('mobile-open'):!collapsed;
 $('focusSidebarToggle').textContent=sidebarVisible?'Ocultar temas':'Mostrar temas';
 $('focusSidebarToggle').setAttribute('aria-expanded',String(sidebarVisible));
 qsa('[data-filter]').forEach(b=>{b.classList.toggle('active',b.dataset.filter===ui.status);b.setAttribute('aria-pressed',b.dataset.filter===ui.status?'true':'false');});qsa('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===ui.mode);b.setAttribute('aria-pressed',b.dataset.mode===ui.mode?'true':'false');});$('shuffleBtn').classList.toggle('active',ui.shuffle);$('shuffleBtn').setAttribute('aria-pressed',String(ui.shuffle));$('revealAllBtn').textContent=ui.showAll?'Ocultar respostas':'Mostrar respostas';$('revealAllBtn').setAttribute('aria-pressed',String(ui.showAll));}
function render(){if(!restoringNavigation)writeNavigationState();renderCognitive();if(cognitiveSession){renderStats();renderTopics();renderControls();renderIntervention();return;}if(ui.mode==='fsrs'){renderStats();renderTopics();renderControls();renderFSRS();updateFilterCues();renderFilterState(getFiltered());return;}const focusBefore=rememberFocus();renderStats();renderTopics();let list=getFiltered(),head=ui.topic==='all'?'Todos os flashcards':topicsById.get(Number(ui.topic))?.title||'Flashcards';$('listTitle').textContent=head;$('listSub').textContent=`${list.length} ${list.length===1?'resultado':'resultados'}${ui.search?' para a busca':''}`;renderControls();renderCards(list);restoreFocus(focusBefore);updateFilterCues();renderFilterState(list);}
const prefersReduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
function jump(delta){const list=getFiltered();if(!list.length)return;const i=list.findIndex(c=>c.id===ui.focusId),j=Math.min(Math.max(i+delta,0),list.length-1);if(i===j)return;
 ui.focusId=list[j].id;ui.showAll=false;renderCards(list);
 const container=$('cardsContainer');if(!prefersReduced()){container.dataset.motion=delta>0?'next':'prev';
  const card=container.querySelector('.study-card');if(card){const finish=()=>{delete container.dataset.motion;};card.addEventListener('animationend',finish,{once:true});}}
 container.querySelector('.question')?.focus({preventScroll:true});container.scrollIntoView({behavior:prefersReduced()?'auto':'smooth',block:'nearest'});
}
const LEVEL_LABEL=v=>v==='0'?'Complementos':'Nível '+v;
function renderFilterState(list){
 const raw=$('searchBox').value.trim();$('searchClear').hidden=!raw;$('searchBox').closest('.search-wrap').classList.toggle('has-value',!!raw);
 $('searchStatus').textContent=ui.search?(list.length?`${list.length} ${list.length===1?'cartão encontrado':'cartões encontrados'} para “${raw}”${liveHits()&&!ui.shuffle&&list.length>1?' · por relevância':''}`:`Nenhum cartão para “${raw}”. Confira a grafia, use menos palavras ou limpe os filtros.`):'';
 const chips=[];const X='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
 const add=(k,label)=>chips.push(`<button type="button" class="filter-chip" data-clear="${k}" aria-label="Remover filtro: ${safe(label)}">${safe(label)}${X}</button>`);
 if(ui.topic!=='all')add('topic',topicsById.get(Number(ui.topic))?.title||'Tema');
 if(ui.status!=='all')add('status',$('statusFilters').querySelector(`[data-filter="${ui.status}"]`)?.dataset.label||ui.status);
 if(ui.level!=='all')add('level',LEVEL_LABEL(ui.level));
 if(ui.type!=='all')add('type',ui.type==='new'?'Complementos':'Originais');
 if(ui.audit!=='all')add('audit',$('auditSelect').selectedOptions[0]?.dataset.label||ui.audit);
 if(ui.search)add('search','Busca: '+raw);
 const box=$('activeFilters');box.hidden=chips.length===0;box.innerHTML=chips.join('')+(chips.length>1?'<button type="button" class="filter-reset" data-clear="all">Limpar tudo</button>':'');
 if(ui.search)highlightTerms($('cardsContainer'));
}
function highlightHits(root,q){if(!q||q.length<2)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement.closest('.question,.answer-box,.case-vignette,.meta-id')&&!n.parentElement.closest('mark,button,script')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT});const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 for(const n of nodes){const text=n.nodeValue;if(text.length<q.length)continue;
  // map normalized index -> original index (NFD may expand characters)
  let normed='',idx=[];for(let i=0;i<text.length;i++){const k=norm(text[i]);for(let j=0;j<k.length;j++){normed+=k[j];idx.push(i);}}
  let pos=normed.indexOf(q);if(pos<0)continue;const frag=document.createDocumentFragment();let last=0;
  while(pos>=0){const a=idx[pos],b=idx[pos+q.length-1]+1;if(a>=last){frag.append(text.slice(last,a));const m=document.createElement('mark');m.className='hit';m.textContent=text.slice(a,b);frag.append(m);last=b;}pos=normed.indexOf(q,pos+q.length);}
  frag.append(text.slice(last));n.replaceWith(frag);}}
function clearFilters(){clearTimeout(searchTimer);ui.topic='all';ui.level='all';ui.type='all';ui.audit='all';ui.status='all';ui.search='';ui.limit=22;ui.focusId=null;$('searchBox').value='';$('levelSelect').value='all';$('typeSelect').value='all';$('auditSelect').value='all';render();}
function fallbackCopy(text){return new Promise((resolve,reject)=>{const previous=document.activeElement,area=document.createElement('textarea');area.value=text;area.style.cssText='position:fixed;opacity:0;top:0;left:0;pointer-events:none;';document.body.appendChild(area);
 try{area.focus();area.select();if(document.execCommand?.('copy'))resolve();else reject(Error('Sem permissão para copiar'));}catch(err){reject(err);}finally{area.remove();if(previous?.isConnected)previous.focus({preventScroll:true});}});}
function copyText(text){if(navigator.clipboard?.writeText&&window.isSecureContext)return navigator.clipboard.writeText(text).catch(()=>fallbackCopy(text));return fallbackCopy(text);}
function actions(ev){let b=ev.target.closest('[data-action]');if(!b)return;let action=b.dataset.action,id=b.dataset.id,m=mark(id);
 switch(action){case'reveal':if(ui.showAll){ui.showAll=false;openAnswers=new Set([id]);}else if(openAnswers.has(id))openAnswers.delete(id);else openAnswers.add(id);if(ui.mode==='fsrs'){renderFSRS();$('cardsContainer').querySelector('.answer-box')?.focus();}else renderCards(getFiltered());if(openAnswers.has(id))document.getElementById('card-'+id.replaceAll('.','-'))?.querySelector('.answer-box')?.classList.add('is-revealing');break;
 case'done':setMark(id,'status',status(id)==='done'?'todo':'done');break;
 case'review':setMark(id,'status',status(id)==='review'?'todo':'review');break;
 case'star':setMark(id,'star',!m.star);break;
 case'hide':setMark(id,'hidden',!m.hidden);notify(m.hidden?'Cartão reexibido.':'Cartão ocultado. Use o filtro “Ocultos” para recuperá-lo.');break;
 case'edit':openTextEditor(id);break;
 case'copy':{let c=displayText(byId.get(id));copyText(`${c.id} — ${c.scenario?c.scenario+"\n\n":""}${c.question}\n\n${c.answer}`).then(()=>notify('Cartão copiado: pergunta e resposta.')).catch(()=>notify('Não foi possível copiar neste navegador.'));break;}
 case'grade':gradeFSRS(id,Number(b.dataset.grade));break;
 case'prev':jump(-1);break;case'next':jump(1);break;case'clearFilters':clearFilters();break;case'clearRefinements':clearRefinements();break;}
}
$('topicList').addEventListener('click',ev=>{const button=ev.target.closest('[data-topic]');if(button)selectTopic(button.dataset.topic);});
function selectTopic(id){if(pageKind!=='study'){location.href='./index.html?topic='+encodeURIComponent(id);return;}if(id!=='all'&&!TOPICS.some(t=>String(t.id)===String(id)))return;ui.topic=String(id);ui.limit=22;ui.focusId=null;ui.showAll=false;setMobileTopicsOpen(false);render();$('listTitle').focus({preventScroll:true});$('listTitle').scrollIntoView({behavior:prefersReduced()?'auto':'smooth',block:'start'});}
$('mapGrid').addEventListener('click',ev=>{const b=ev.target.closest('[data-topic]');if(b)selectTopic(b.dataset.topic);});
// Supporting details start closed; legacy expansion preferences remain untouched.
try{const v=localStorage.getItem('cm8.mapOpen');if(v==='1'){$('contentMap').open=true;}}catch(e){}
$('contentMap').addEventListener('toggle',()=>{try{localStorage.setItem('cm8.mapOpen',$('contentMap').open?'1':'0');}catch(e){}});
$('topicFilter').addEventListener('input',applyTopicFilter);
$('topicFilter').addEventListener('keydown',e=>{if(e.key==='Enter'){const first=qsa('#topicList .topic-btn[data-name]').find(b=>!b.hidden);if(first){e.preventDefault();first.click();}}});
qsa('[data-jump]').forEach(b=>b.addEventListener('click',()=>{if(pageKind!=='study'){location.href='./index.html?status='+encodeURIComponent(b.dataset.jump);return;}if(ui.mode==='fsrs')ui.mode='list';ui.status=b.dataset.jump;ui.limit=22;ui.focusId=null;render();$('listTitle').scrollIntoView({behavior:prefersReduced()?'auto':'smooth',block:'start'});}));
$('searchClear').addEventListener('click',()=>{clearTimeout(searchTimer);$('searchBox').value='';applySearch();$('searchBox').focus();});
$('searchBox').addEventListener('keydown',e=>{if(e.key==='Escape'&&$('searchBox').value){e.preventDefault();$('searchClear').click();}
 else if((e.key==='ArrowDown'||e.key==='Enter')&&!e.isComposing&&$('searchBox').value.trim()){const q=$('cardsContainer').querySelector('.study-card .question');if(q){e.preventDefault();clearTimeout(searchTimer);q.focus();q.closest('.study-card')?.scrollIntoView({block:'nearest',behavior:prefersReduced()?'auto':'smooth'});}}});
$('cardsContainer').addEventListener('keydown',e=>{if(!e.altKey||(e.key!=='ArrowDown'&&e.key!=='ArrowUp'))return;const card=e.target.closest?.('.study-card');if(!card)return;const cards=[...$('cardsContainer').querySelectorAll('.study-card')],i=cards.indexOf(card),next=cards[i+(e.key==='ArrowDown'?1:-1)];if(!next)return;e.preventDefault();const q=next.querySelector('.question');q?.focus({preventScroll:true});next.scrollIntoView({block:'nearest',behavior:prefersReduced()?'auto':'smooth'});});
document.addEventListener('keydown',e=>{if(pageKind!=='study'||e.key!=='/'||e.ctrlKey||e.metaKey||e.altKey)return;const t=e.target;if(t.closest?.('input,textarea,select,[contenteditable="true"],dialog[open]'))return;e.preventDefault();$('searchBox').focus();$('searchBox').select();});
$('activeFilters').addEventListener('click',ev=>{const b=ev.target.closest('[data-clear]');if(!b)return;const k=b.dataset.clear;
 if(k==='all'){clearFilters();$('searchBox').focus();return;}
 if(k==='topic')ui.topic='all';else if(k==='status')ui.status='all';else if(k==='level'){ui.level='all';$('levelSelect').value='all';}else if(k==='type'){ui.type='all';$('typeSelect').value='all';}else if(k==='audit'){ui.audit='all';$('auditSelect').value='all';}else if(k==='search'){clearTimeout(searchTimer);$('searchBox').value='';ui.search='';}
 ui.limit=22;ui.focusId=null;render();($('activeFilters').querySelector('.filter-chip')||$('searchBox')).focus();});
$('statusFilters').addEventListener('click',ev=>{
 const b=ev.target.closest('[data-filter]');if(!b)return;
 ui.status=b.dataset.filter;ui.limit=22;ui.focusId=null;render();
 const rail=$('statusFilters'),active=Array.from(rail.querySelectorAll('[data-filter]')).find(el=>el.dataset.filter===ui.status);
 if(!active)return;
 const x=active.offsetLeft-rail.offsetLeft;
 if(x<rail.scrollLeft+8)rail.scrollTo({left:Math.max(0,x-12),behavior:'auto'});
 else if(x+active.offsetWidth>rail.scrollLeft+rail.clientWidth-8)
  rail.scrollTo({left:x+active.offsetWidth-rail.clientWidth+12,behavior:'auto'});
 updateFilterCues();
});
qsa('[data-mode]').forEach(b=>b.addEventListener('click',()=>withViewTransition(()=>{cognitiveSession=null;ui.mode=b.dataset.mode;ui.status='all';ui.focusId=null;ui.showAll=false;
 if(ui.mode==='fsrs')openAnswers.clear();
 if(ui.mode==='fsrs'||ui.mode==='focus'){for(const id of ['contentMap','studyGuide','studyOverview'])$(id).open=false;}
 render();
 if(ui.mode==='fsrs'||ui.mode==='focus')focusFSRSQuestion();})));
$('startReviewBtn').addEventListener('click',()=>document.querySelector('[data-mode="fsrs"]').click());
$('startFocusBtn').addEventListener('click',()=>{for(const id of ['contentMap','studyGuide','studyOverview'])$(id).open=false;ui.mode='focus';ui.focusSidebarCollapsed=true;ui.focusId=null;openAnswers.clear();ui.showAll=false;render();focusFSRSQuestion();});
$('focusSidebarToggle').addEventListener('click',()=>{
 if(window.matchMedia('(max-width:850px)').matches){
  setMobileTopicsOpen(!$('sidebar').classList.contains('mobile-open'),$('focusSidebarToggle'));
  return;
 }
 ui.focusSidebarCollapsed=!ui.focusSidebarCollapsed;renderControls();
});
let searchTimer;function applySearch(){runSearch();}
$('searchBox').addEventListener('input',e=>{if(e.isComposing)return;clearTimeout(searchTimer);searchTimer=setTimeout(applySearch,40);});
$('searchBox').addEventListener('compositionstart',()=>clearTimeout(searchTimer));
$('searchBox').addEventListener('compositionend',()=>{clearTimeout(searchTimer);applySearch();});
$('levelSelect').addEventListener('change',e=>{ui.level=e.target.value;ui.limit=22;ui.focusId=null;render();});
$('typeSelect').addEventListener('change',e=>{ui.type=e.target.value;ui.limit=22;ui.focusId=null;render();});
$('auditSelect').addEventListener('change',e=>{ui.audit=e.target.value;ui.limit=22;ui.focusId=null;render();});
$('shuffleBtn').addEventListener('click',()=>{ui.shuffle=!ui.shuffle;if(ui.shuffle){shuffleOrder=new Map(CARDS.map(c=>[c.id,Math.random()]));}ui.focusId=null;render();});
$('revealAllBtn').addEventListener('click',()=>{ui.showAll=!ui.showAll;openAnswers.clear();renderCards(getFiltered());renderControls();});
$('cardsContainer').addEventListener('click',actions);$('focusNav').addEventListener('click',actions);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){for(const menu of qsa('details.more-actions[open]')){menu.open=false;menu.querySelector('summary')?.focus({preventScroll:true});}}});
document.addEventListener('click',e=>{if(e.target.closest?.('[data-action]'))return;for(const menu of qsa('details.more-actions[open]'))if(!menu.contains(e.target))menu.open=false;});
$('moreBtn').addEventListener('click',()=>{
 const next=getFiltered()[ui.limit];ui.limit+=22;renderCards(getFiltered());
 if(!next)return;
 const question=document.getElementById('card-'+next.id.replaceAll('.','-'))?.querySelector('.question');
 if(question){
  question.setAttribute('tabindex','-1');
  // After replacing 22 cards, wait for layout before moving the viewport.
  // Instant positioning avoids smooth-scroll cancellation by scroll anchoring.
  requestAnimationFrame(()=>{
   if(!question.isConnected)return;
   const root=document.documentElement,priorBehavior=root.style.scrollBehavior;
   root.style.scrollBehavior='auto';
   const offset=window.matchMedia('(max-width:850px)').matches?16:96;
   const top=question.getBoundingClientRect().top+window.scrollY-offset;
   window.scrollTo(0,Math.max(0,top));
   root.style.scrollBehavior=priorBehavior;
   question.focus({preventScroll:true});
  });
 }
});

function labelSelectCounts(){const nNew=CARDS.filter(c=>c.new).length,a={};for(const c of CARDS){const k=c.audit?.status;if(k)a[k]=(a[k]||0)+1;}
 qsa('#typeSelect option[data-label],#auditSelect option[data-label]').forEach(o=>{const n=o.value==='new'?nNew:o.value==='original'?TOTAL-nNew:(a[o.value]||0);o.textContent=`${o.dataset.label} (${n})`;});}
function renderPillCounts(){if(!labelSelectCounts.done){labelSelectCounts();labelSelectCounts.done=1;}const t=totals(),counts={todo:t.todo,review:t.review,done:t.done,star:t.stars,hidden:t.hidden};qsa('#statusFilters [data-filter]').forEach(b=>{if(!b.dataset.label)b.dataset.label=b.textContent.replace('★','').trim();const n=counts[b.dataset.filter];let el=b.querySelector('.pill-count');if(n==null){el?.remove();return;}if(!el){el=document.createElement('span');el.className='pill-count';b.append(el);}el.textContent=n;});}
function updateFilterCues(){renderPillCounts();
 const pill=$('statusFilters'),cue=$('filterScrollCue');
 const overflow=pill.scrollWidth>pill.clientWidth+2;
 $('filterScrollPrev').hidden=!overflow||pill.scrollLeft<=3;
 cue.hidden=!overflow||pill.scrollLeft+pill.clientWidth>=pill.scrollWidth-3;
 const selected=[ui.level,ui.type,ui.audit].filter(v=>v!=='all').length;
 $('mobileFilters').textContent=selected?`Mais filtros (${selected})`:'Mais filtros';
}
$('mobileFilters').addEventListener('click',()=>{
 const open=$('advancedFilters').classList.toggle('mobile-open');
 $('mobileFilters').setAttribute('aria-expanded',String(open));
 updateFilterCues();
});
function scrollStatusRail(direction){const rail=$('statusFilters');
 rail.scrollBy({left:direction*Math.min(rail.clientWidth*.75,240),behavior:prefersReduced()?'auto':'smooth'});
}
$('filterScrollPrev').addEventListener('click',()=>scrollStatusRail(-1));
$('filterScrollCue').addEventListener('click',()=>scrollStatusRail(1));
$('statusFilters').addEventListener('scroll',updateFilterCues,{passive:true});
window.addEventListener('resize',updateFilterCues);
if(typeof ResizeObserver==='function'){const ro=new ResizeObserver(()=>updateFilterCues());ro.observe($('statusFilters'));}
let lastMobileTopicsTrigger=$('mobileTopics');
function setMobileTopicsOpen(open,trigger){
 if(trigger)lastMobileTopicsTrigger=trigger;
 const sidebar=$('sidebar');
 sidebar.classList.toggle('mobile-open',open);
 $('mobileTopics').setAttribute('aria-expanded',String(open));
 if(!$('focusSidebarToggle').hidden&&window.matchMedia('(max-width:850px)').matches){
  $('focusSidebarToggle').textContent=open?'Ocultar temas':'Mostrar temas';
  $('focusSidebarToggle').setAttribute('aria-expanded',String(open));
 }
 if(!open)return;
 const rail=$('topicList'),selected=rail.querySelector('.topic-btn.active');
 if(selected){
  const left=selected.offsetLeft-rail.offsetLeft;
  rail.scrollLeft=Math.max(0,left-12);
 }
 sidebar.scrollIntoView({behavior:prefersReduced()?'auto':'smooth',block:'start'});
 if(trigger===$('mobileTopics')||trigger===$('focusSidebarToggle'))$('topicJump').focus({preventScroll:true});
}
$('mobileTopics').addEventListener('click',()=>setMobileTopicsOpen(!$('sidebar').classList.contains('mobile-open'),$('mobileTopics')));
const scrollTopics=direction=>{const rail=$('topicList');rail.scrollBy({left:direction*Math.min(rail.clientWidth*.8,260),behavior:prefersReduced()?'auto':'smooth'});};
$('topicsPrev').addEventListener('click',()=>scrollTopics(-1));
$('topicsNext').addEventListener('click',()=>scrollTopics(1));

$('topicJump').addEventListener('change',event=>selectTopic(event.target.value));
function moveTopic(delta){
 const index=TOPICS.findIndex(t=>String(t.id)===ui.topic);
 const target=TOPICS[index+delta];
 if(!target)return;
 selectTopic(String(target.id));
 // Retain the pager for repeated keyboard navigation; at the boundary move to the usable arrow.
 const current=$(delta>0?'nextTopic':'prevTopic');
 (current.disabled?$(delta>0?'prevTopic':'nextTopic'):current).focus({preventScroll:true});
}
$('prevTopic').addEventListener('click',()=>moveTopic(-1));
$('nextTopic').addEventListener('click',()=>moveTopic(1));
window.addEventListener('popstate',()=>{
 // Hash-only history steps must not discard focusId, revealed answers or the list limit.
 const params=new URL(location.href).searchParams;
 const requestedTopic=params.get('topic'),requestedMode=params.get('mode');
 const nextTopic=requestedTopic&&TOPICS.some(t=>String(t.id)===requestedTopic)?requestedTopic:'all';
 const nextMode=NAV_MODES.has(requestedMode)?requestedMode:'list';
 const requestedStatus=params.get('status');
 const nextStatus=['all','done','review','todo','star','hidden'].includes(requestedStatus)?requestedStatus:'all';
 if(nextTopic===ui.topic&&nextMode===ui.mode&&nextStatus===ui.status)return;
 restoringNavigation=true;
 try{
  readNavigationState();
  cognitiveSession=null;
  setMobileTopicsOpen(false);
  render();
  $('listTitle').focus({preventScroll:true});
  $('listTitle').scrollIntoView({behavior:prefersReduced()?'auto':'smooth',block:'start'});
 }finally{restoringNavigation=false;}
});
document.addEventListener('keydown',event=>{
 if(event.key!=='Escape'||document.querySelector('dialog[open]'))return;
 const topics=$('sidebar').classList.contains('mobile-open');
 const filters=$('advancedFilters').classList.contains('mobile-open');
 if(!topics&&!filters)return;
 event.preventDefault();
 if(topics)setMobileTopicsOpen(false);
 if(filters){$('advancedFilters').classList.remove('mobile-open');$('mobileFilters').setAttribute('aria-expanded','false');}
 (topics?lastMobileTopicsTrigger:$('mobileFilters')).focus({preventScroll:true});
});

async function exportProgress(){try{
 if(fsrsReady)replaceFSRSRecords(await readFSRSRecords());
 const xml=window.CMNProgressIO.encodeXML(marks,TOTAL,cognitiveSnapshot());
 const blob=new Blob([xml],{type:'application/xml;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='cmn_8periodo_progresso_'+new Date().toISOString().slice(0,10)+'.xml';
 document.body.appendChild(a);
 try{a.click();notify('Backup XML preparado. Salve-o para restaurar seu progresso em outro dispositivo.');}
 finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);}
 }catch{notify('Não foi possível exportar o XML. Confira as permissões do navegador.',5500);}
}
$('exportBtn').addEventListener('click',exportProgress);
$('storageExportBtn').addEventListener('click',exportProgress);
let pendingImport=null;
function fileAsText(file){return new Promise((resolve,reject)=>{
 const reader=new FileReader();
 reader.onload=()=>resolve(typeof reader.result==='string'?reader.result:'');
 reader.onerror=()=>reject(Error('Não foi possível ler o arquivo. Tente salvá-lo no aplicativo Arquivos.'));
 reader.onabort=()=>reject(Error('A leitura foi cancelada. Selecione novamente o arquivo.'));
 try{reader.readAsText(file,'UTF-8');}
 catch{reject(Error('O dispositivo não conseguiu abrir o arquivo. Tente selecioná-lo pelo aplicativo Arquivos.'));}
});}
function closeImportReview(){pendingImport=null;$('importReview').hidden=true;$('importReview').setAttribute('role','status');}
function showImportReview(title,description,error=false){
 const review=$('importReview');$('importReviewTitle').textContent=title;$('importReviewText').textContent=description;
 $('confirmImportBtn').hidden=error;review.setAttribute('role',error?'alert':'status');review.hidden=false;
 review.scrollIntoView({behavior:prefersReduced()?'auto':'smooth',block:'nearest'});
 $('importReviewTitle').focus({preventScroll:true});
}
$('cancelImportBtn').addEventListener('click',()=>{closeImportReview();$('importFile').focus({preventScroll:true});});
$('confirmImportBtn').addEventListener('click',()=>{
 if(!pendingImport)return;
 const latest=getSaved();if(JSON.stringify(latest)!==pendingImport.baseline){marks=latest;pendingImport.baseline=JSON.stringify(latest);render();showImportReview('Progresso alterado em outra aba','Agora existem '+Object.keys(latest).length+' marcações. Confirme novamente para substituí-las.');return;}
 const {cards,valid,ignored}=pendingImport;
 if(pendingImport.cognitive){cognitiveState=CMNCognitive.validate(pendingImport.cognitive,ALL_IDS);cognitiveSession=null;}
 marks=sanitizedMarks(cards);
 const saved=save();const readsSaved=!pendingImport.hasReadCounts||(saved&&window.CMNProgressIO.applyReadCounts(pendingImport.readCounts));render();closeImportReview();
 if(saved&&readsSaved)notify('Progresso importado: '+valid+' cartões.'+(ignored?' '+ignored+' IDs não pertencentes à biblioteca foram ignorados.':''),5200);
 else notify('A importação não foi salva completamente. Preserve o arquivo de backup e tente novamente.',6500);
});
$('importFile').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 closeImportReview();
 try{
  if(file.size>5*1024*1024)throw Error('O arquivo ultrapassa 5 MB. Selecione um backup XML ou JSON de progresso.');
  const raw=await fileAsText(file);
  const result=window.CMNProgressIO.parse(raw,ALL_IDS);
  pendingImport={...result,baseline:JSON.stringify(getSaved())};
  const preserved=Object.keys(marks).length;
  showImportReview('Confirmar importação',
   'Arquivo: '+file.name+' ('+result.format+'). '+result.valid+' marcações compatíveis'+
   (result.ignored?' e '+result.ignored+' de outro conjunto ignoradas':'')+
   (result.cognitive?'. Inclui metadados cognitivos e '+result.cognitive.events.length+' registros de prática':'')+'. Substituir progresso apagará as '+preserved+' marcações atuais deste dispositivo. Exporte um backup XML antes, se desejar preservá-las.');
 }catch(err){
  pendingImport=null;
  showImportReview('Não foi possível importar',err instanceof Error?err.message:'O arquivo não pôde ser lido. O progresso anterior permanece intacto.',true);
 }finally{e.target.value='';}
});
$('resetBtn').addEventListener('click',async()=>{const count=Object.keys(marks).length+fsrsRecords.size+cognitiveSnapshot().events.length;if(!count){notify('Não há marcações de progresso para apagar.');return;}
 if(!confirm(`Apagar as marcações e o histórico FSRS neste navegador? Exporte seus backups antes se quiser recuperá-los.`))return;
 if(fsrsBusy){notify('Aguarde a operação de revisão terminar.');return;}
 fsrsBusy=true;
 try{
  if(fsrsDB)await fsrsTransaction('readwrite',store=>store.clear());
  fsrsRecords.clear();signalFSRS();openAnswers.clear();cognitiveState={...cognitiveState,events:[],enabled:false};cognitiveSession=null;
  marks=Object.create(null);
  if(save())notify('Progresso apagado neste navegador.');
 }catch{notify('Não foi possível apagar o histórico. Tente novamente.',5500);}
 finally{fsrsBusy=false;render();}});
$('unhideBtn').addEventListener('click',()=>{let count=0;for(const id of Object.keys(marks))if(marks[id].hidden){delete marks[id].hidden;count++;if(!Object.keys(marks[id]).length)delete marks[id];}if(count){const saved=save();render();if(saved)notify(`${count} cartões reexibidos.`);}else notify('Não há cartões ocultos.');});
function renderThemeIcon(dark){
 const shape=dark?'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>':'<path d="M20.5 13a8.5 8.5 0 0 1-9.5-9.5A8.5 8.5 0 1 0 20.5 13Z"/>';
 $('themeBtn').innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+shape+'</svg>';
}
function setTheme(dark){document.documentElement.dataset.theme=dark?'dark':'light';renderThemeIcon(dark);$('themeBtn').setAttribute('aria-label',dark?'Usar tema claro':'Usar tema escuro');try{localStorage.setItem(THEME_KEY,dark?'dark':'light');}catch{}}
$('themeBtn').addEventListener('click',()=>setTheme(document.documentElement.dataset.theme!=='dark'));
window.addEventListener('storage',event=>{
 if(event.key===STORE_KEY){try{const changed=JSON.parse(event.newValue||'{}');marks=sanitizedMarks(changed?.cards);render();notify('Progresso atualizado de outra aba.');}catch{notify('Não foi possível ler o progresso atualizado em outra aba.',4800);}}
 if(event.key===THEME_KEY){const dark=event.newValue==='dark';document.documentElement.dataset.theme=dark?'dark':'light';renderThemeIcon(dark);$('themeBtn').setAttribute('aria-label',dark?'Usar tema claro':'Usar tema escuro');}
});
let theme;try{theme=localStorage.getItem(THEME_KEY)||'light';}catch{theme='light';}setTheme(theme==='dark');
document.addEventListener('keydown',e=>{const target=e.target instanceof Element?e.target:document.activeElement;const interactive=target?.closest('button,a,input,textarea,select,summary,[role=button],[role=link],[contenteditable=true]');if(cognitiveSession||ui.mode!=='focus'||e.altKey||e.ctrlKey||e.metaKey||interactive||target?.isContentEditable)return;let list=getFiltered();if(!list.length)return;let id=ui.focusId||list[0].id;
 if(e.key==='ArrowLeft'){e.preventDefault();jump(-1);}else if(e.key==='ArrowRight'){e.preventDefault();jump(1);}else if(e.code==='Space'){e.preventDefault();if(ui.showAll){ui.showAll=false;openAnswers.clear();}else if(openAnswers.has(id))openAnswers.delete(id);else openAnswers.add(id);renderCards(list);if(openAnswers.has(id))document.getElementById('card-'+id.replaceAll('.','-'))?.querySelector('.answer-box')?.classList.add('is-revealing');renderControls();}else if(e.key==='1'){setMark(id,'status',status(id)==='done'?'todo':'done');}else if(e.key==='2'){setMark(id,'status',status(id)==='review'?'todo':'review');}else if(e.key==='3'){setMark(id,'star',!mark(id).star);}});

function pwaStatus(){
 const el=$('offlineStatus');
 if(!navigator.onLine){el.textContent='Sem conexão · usando os arquivos disponíveis';return;}
 if(!('serviceWorker' in navigator)){el.textContent='Offline indisponível neste navegador';return;}
 el.textContent=navigator.serviceWorker.controller?'Material disponível offline':'Preparando acesso offline…';
}
window.addEventListener('online',pwaStatus);
window.addEventListener('offline',pwaStatus);
if('serviceWorker' in navigator){
 const registerOffline=()=>{
  navigator.serviceWorker.register('./sw.js',{scope:'./'})
   .then(()=>navigator.serviceWorker.ready)
   .then(()=>{pwaStatus();if(navigator.onLine)$('offlineStatus').textContent='Material disponível offline';})
   .catch(()=>{$('offlineStatus').textContent='Offline indisponível · use backup XML';});
 };
 if(document.readyState==='complete')registerOffline();
 else window.addEventListener('load',registerOffline,{once:true});
 navigator.serviceWorker.addEventListener('controllerchange',pwaStatus);
}
pwaStatus();
/* Revisão espaçada: estado independente das marcações anteriores. */
const fsrsRecords=new Map();
let fsrsDB=null,fsrsReady=false,fsrsUnavailable=false,fsrsBusy=false,fsrsScheduler=null;
let fsrsUndo=null;
let sessionStatsTimer,sessionStatsAnnouncementTimer,lastSessionStats=null,sessionStatsVisible=false,sessionFSRSSummary=null;
const sessionNumberFormat=new Intl.NumberFormat('pt-BR');
if(typeof IntersectionObserver==='function')new IntersectionObserver(entries=>{sessionStatsVisible=entries[0]?.isIntersecting===true;}).observe($('statsTitle').closest('section'));
function setSessionNumber(id,value){
 const el=$(id),text=value===null?'—':sessionNumberFormat.format(value),previous=el.textContent;
 if(previous===text)return;
 el.textContent=text;
 if(lastSessionStats&&sessionStatsVisible&&document.visibilityState==='visible'&&!prefersReduced()&&typeof el.animate==='function'){
  (el.getAnimations?.()||[]).forEach(animation=>animation.cancel());
  el.animate([{transform:'translateY(5px)'},{transform:'translateY(0)'}],{duration:240,easing:'cubic-bezier(.16,1,.3,1)'});
 }
}
function renderSessionStats({historyChanged=false}={}){
 const reads=window.CMNProgressIO?.getReadCounts()||{},today=fsrsDay(new Date());
 let readings=0;
 for(const [id,count] of Object.entries(reads))if(ALL_IDS.has(id))readings+=count;
 // Reading clicks reuse the FSRS summary; only history/date changes rescan review logs.
 if(historyChanged||!sessionFSRSSummary||sessionFSRSSummary.today!==today||sessionFSRSSummary.ready!==fsrsReady){
 let reviewedCards=0,reviews=0,reviewedToday=0;
 for(const row of fsrsRecords.values()){
  if(!ALL_IDS.has(row.id))continue;
  const logs=(row.logs||[]).filter(log=>[1,2,3,4].includes(log.rating)&&Number.isFinite(Date.parse(log.reviewTime)));
  if(logs.length)reviewedCards++;
  reviews+=logs.length;
  if(logs.some(log=>fsrsDay(log.reviewTime)===today))reviewedToday++;
 }
 sessionFSRSSummary={today,ready:fsrsReady,reviewedCards,reviews,reviewedToday};
 }
 const summary=sessionFSRSSummary;
 const current={readings,reviewedCards:fsrsReady?summary.reviewedCards:null,reviews:fsrsReady?summary.reviews:null,reviewedToday:fsrsReady?summary.reviewedToday:null};
 setSessionNumber('nReadTotal',current.readings);setSessionNumber('nFSRSCards',current.reviewedCards);
 setSessionNumber('nFSRSReviews',current.reviews);setSessionNumber('nFSRSToday',current.reviewedToday);
 $('sessionTodayLabel').textContent=current.reviewedToday===1?'cartão FSRS hoje':'cartões FSRS hoje';
 $('sessionReviewsLabel').textContent=current.reviews===1?'avaliação no total':'avaliações no total';
 $('fsrsActivityMetric').setAttribute('aria-busy',String(!fsrsReady&&!fsrsUnavailable));
 $('fsrsActivityDefinition').textContent=fsrsReady?'Cartões distintos já avaliados.':fsrsUnavailable?'Histórico indisponível. Recarregue para tentar novamente.':'Carregando histórico…';
 if(lastSessionStats&&JSON.stringify(current)!==JSON.stringify(lastSessionStats)){
  clearTimeout(sessionStatsAnnouncementTimer);
  sessionStatsAnnouncementTimer=setTimeout(()=>{$('sessionStatsStatus').textContent=sessionNumberFormat.format(current.readings)+' leituras registradas. '+(current.reviewedCards===null?'Histórico FSRS ainda não disponível.':sessionNumberFormat.format(current.reviewedCards)+' flashcards avaliados no FSRS; '+sessionNumberFormat.format(current.reviewedToday)+' hoje.');},180);
 }
 lastSessionStats=current;
 clearTimeout(sessionStatsTimer);
 const now=new Date(),midnight=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
 sessionStatsTimer=setTimeout(renderSessionStats,Math.max(1,+midnight-Date.now()+100));
}
window.addEventListener('cmn:read-counts-changed',renderSessionStats);
const FSRS_RETENTION=0.90;
const FSRS_DEFAULT_DAILY=20;
let fsrsRefreshTimer;
function fsrsDailyLimit(value){
 if(value==null||String(value).trim()===''||!Number.isFinite(Number(value)))return FSRS_DEFAULT_DAILY;
 return Math.min(100,Math.max(0,Math.trunc(Number(value))));
}
function focusFSRSQuestion(){
 const target=$('cardsContainer').querySelector('.question')||$('listTitle');
 target.focus({preventScroll:true});
 (target.closest('.case-question')||target).scrollIntoView({block:'start'});
}
function openFSRSDB(){return new Promise((resolve,reject)=>{
 const request=indexedDB.open('cm8-fsrs-v1',1);
 request.onupgradeneeded=()=>request.result.createObjectStore('cards',{keyPath:'id'});
 request.onsuccess=()=>resolve(request.result);
 request.onerror=()=>reject(request.error);
});}
function fsrsTransaction(mode,action){return new Promise((resolve,reject)=>{
 const tx=fsrsDB.transaction('cards',mode);
 action(tx.objectStore('cards'));
 tx.oncomplete=()=>resolve();
 tx.onerror=()=>reject(tx.error);
 tx.onabort=()=>reject(tx.error);
});}
function hydrateFSRS(card){return {...card,dueAt:new Date(card.dueAt),lastReviewAt:card.lastReviewAt?new Date(card.lastReviewAt):null};}
function fsrsCard(id){return fsrsRecords.has(id)?hydrateFSRS(fsrsRecords.get(id).card):fsrsScheduler.newCard({cardId:id,now:new Date()});}
function fsrsDay(date){const d=new Date(date);return [d.getFullYear(),d.getMonth(),d.getDate()].join('-');}
function fsrsNewToday(){const today=fsrsDay(new Date());return [...fsrsRecords.values()].filter(record=>record.logs?.some(log=>log.state===0&&fsrsDay(log.reviewTime)===today)).length;}
function fsrsQueue(){
 const now=new Date();
 const allowed=Math.max(0,fsrsDailyLimit($('fsrsDaily').value)-fsrsNewToday());
 const candidates=getFiltered().filter(c=>!mark(c.id).hidden&&(!cognitiveState.enabled||cognitivePool==='all'||(cognitiveState.metadata[c.id].traceType==='verbatim'?'A':'B')===cognitivePool));
 const due=candidates.filter(c=>fsrsRecords.has(c.id)&&new Date(fsrsRecords.get(c.id).card.dueAt).getTime()<=now);
 due.sort((a,b)=>{const x=fsrsRecords.get(a.id).card,y=fsrsRecords.get(b.id).card;
  return (x.state===1||x.state===3?0:1)-(y.state===1||y.state===3?0:1)||new Date(x.dueAt)-new Date(y.dueAt);});
 const nextMidnight=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
 let refreshAt=nextMidnight.getTime();
 for(const {id} of candidates){
  const dueAt=new Date(fsrsRecords.get(id)?.card.dueAt).getTime();
  if(dueAt>now&&dueAt<refreshAt)refreshAt=dueAt;
 }
 const unseen=candidates.filter(c=>!fsrsRecords.has(c.id));
 return {due,newCards:unseen.slice(0,allowed),refreshAt,candidates,unseen};
}
function fsrsInterval(due){const ms=new Date(due)-Date.now();if(ms<3600000)return Math.max(1,Math.round(ms/60000))+' min';if(ms<86400000)return Math.round(ms/3600000)+' h';return Math.round(ms/86400000)+' d';}
function renderFSRS({keepCard=false}={}){
 $('fsrsSettings').hidden=false;$('shuffleBtn').hidden=true;$('revealAllBtn').hidden=true;$('focusNav').hidden=true;$('moreWrap').hidden=true;
 $('listTitle').textContent='Revisão espaçada';const container=$('cardsContainer');
 if(!fsrsReady){
  $('listSub').textContent=fsrsUnavailable?'Histórico indisponível':'Carregando histórico';
  container.innerHTML=fsrsUnavailable
   ?'<div class="fsrs-empty" role="alert">O navegador não abriu o histórico FSRS. Recarregue para tentar novamente.</div>'
   :'<div class="fsrs-empty">Preparando revisões…</div>';
  return;
 }
 const {due,newCards,refreshAt,candidates,unseen}=fsrsQueue(),queue=[...due,...newCards];
 clearTimeout(fsrsRefreshTimer);
 fsrsRefreshTimer=setTimeout(refreshFSRS,Math.max(1,refreshAt-Date.now()));
 $('fsrsSummary').textContent=due.length+' vencidos · '+newCards.length+' novos disponíveis';
 $('listSub').textContent=(ui.topic==='all'?'':topicsById.get(Number(ui.topic))?.title+' · ')+queue.length+' cartões disponíveis agora';
 if(keepCard&&container.querySelector('.study-card'))return;
 if(!queue.length){
  let title='Revisões em dia',detail='Os cartões desta seleção estão agendados para depois.';
  if(!candidates.length){
   title='Nenhum cartão nesta seleção';
   detail='Altere os filtros ou reexiba os cartões ocultos na biblioteca.';
  }else if(unseen.length){
   title=fsrsDailyLimit($('fsrsDaily').value)===0?'Cartões novos pausados':'Limite diário de novos atingido';
   detail='As revisões vencidas continuam disponíveis. Ajuste “Novos por dia” para incluir mais cartões.';
  }
  const filtered=ui.topic!=='all'||ui.level!=='all'||ui.type!=='all'||ui.audit!=='all'||ui.status!=='all'||ui.search;
  container.innerHTML=`<div class="fsrs-empty"><h3>${title}</h3><p>${detail}</p>${filtered?'<button type="button" class="subtle-btn" data-action="clearFilters">Limpar filtros</button>':''}</div>`;
  return;
 }
 const original=queue.find(c=>c.id===ui.focusId)||queue[0],c=reviewPresentation(original);ui.focusId=c.id;
 const visible=openAnswers.has(c.id),topic=topicsById.get(c.topic);
 const grades=visible?schedulerFor(c.id).preview({card:fsrsCard(c.id),now:new Date()}).map(item=>item).filter(({grade})=>!cognitiveState.enabled||cognitiveState.metadata[c.id].traceType!=='gist'||grade!==4).map(({grade,card})=>
  `<button type="button" data-action="grade" data-id="${safe(c.id)}" data-grade="${grade}" ${fsrsBusy?'disabled':''}>${cognitiveState.enabled&&cognitiveState.metadata[c.id].traceType==='gist'?['','Não recuperei','Recuperei parcialmente','Recuperei o núcleo'][grade]:['','Errei','Difícil','Bom','Fácil'][grade]}<small>${fsrsInterval(card.dueAt)}</small></button>`).join(''):'';
 container.innerHTML=`<article class="study-card" id="card-${safe(c.id.replaceAll('.','-'))}"><div class="study-card-head"><div class="meta-line"><span class="meta-id">${safe(c.id)}</span><span class="chip">${fsrsRecords.has(c.id)?'Revisão':'Novo'}</span>${auditState(c)}${traceBadge(c.id)}${c.cognitiveVariant?'<span class="chip">Variação didática</span>':editButton(c)}</div>${c.cognitiveVariant?'<h3 class="question" tabindex="-1">'+safe(c.question)+'</h3>':questionHtml(c)}<div class="theme-hint">${safe(topic.title)}</div></div><div class="answer-region">${visible?`<div class="answer-box" tabindex="-1" role="region" aria-label="Resposta do flashcard">${answerHtml(c.answer,c.cognitiveVariant?c.id+'-variant':c.id)}</div>`:`<div class="answer-hidden"><span class="hidden-copy">Responda antes de revelar.</span><button type="button" class="action action-primary reveal-btn" data-action="reveal" data-id="${safe(c.id)}">Revelar resposta</button></div>`}</div>${visible?auditInfoHtml(c):''}${visible?`<div class="fsrs-grading"><p id="fsrsGradeGuide">${cognitiveState.enabled&&cognitiveState.metadata[c.id].traceType==='gist'?'Avalie o núcleo: não recuperado, parcial ou essencial completo. Parcial usa Hard; núcleo completo usa Good.':'Errei se errou ou omitiu o essencial. Difícil se acertou o essencial com hesitação. Bom se conseguiu justificar. Fácil se lembrou de imediato e explicou com segurança.'}</p><div class="fsrs-grade-row" role="group" aria-label="Avalie sua lembrança" aria-describedby="fsrsGradeGuide">${grades}</div></div>`:''}</article>`;
}
async function readFSRSRecords(){return new Promise((resolve,reject)=>{const req=fsrsDB.transaction('cards').objectStore('cards').getAll();req.onsuccess=()=>resolve(req.result.filter(row=>ALL_IDS.has(row.id)));req.onerror=()=>reject(req.error);});}
function replaceFSRSRecords(rows){fsrsRecords.clear();for(const row of rows)fsrsRecords.set(row.id,row);}
let fsrsRefreshPending=false;
async function refreshFSRS(){
 if(!fsrsReady||fsrsBusy||fsrsRefreshPending)return;fsrsRefreshPending=true;
 try{const before=JSON.stringify(fsrsRecords.get(ui.focusId)||null);replaceFSRSRecords(await readFSRSRecords());const same=before===JSON.stringify(fsrsRecords.get(ui.focusId)||null);if(!same){openAnswers.delete(ui.focusId);ui.focusId=null;}renderCognitive();if(ui.mode==='fsrs'&&!cognitiveSession)renderFSRS({keepCard:same});}
 catch{notify('Não foi possível atualizar o histórico. Recarregue para tentar novamente.');}finally{fsrsRefreshPending=false;}
}
const fsrsChannel=typeof BroadcastChannel==='function'?new BroadcastChannel('cm8-fsrs-sync'):null;
fsrsChannel?.addEventListener('message',refreshFSRS);
function signalFSRS(){fsrsChannel?.postMessage('changed');try{localStorage.setItem('cm8-fsrs-update',String(Date.now())+Math.random());}catch{}}
window.addEventListener('storage',event=>{if(event.key==='cm8-fsrs-daily'){$('fsrsDaily').value=String(fsrsDailyLimit(event.newValue));refreshFSRS();}if(event.key==='cm8-fsrs-update')refreshFSRS();});
window.addEventListener('focus',refreshFSRS);
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='visible')refreshFSRS();
});
async function gradeFSRS(id,grade){
 if(fsrsBusy||ui.mode!=='fsrs'||id!==ui.focusId||!openAnswers.has(id)||![1,2,3,4].includes(grade)||!fsrsReady)return;
 fsrsBusy=true;$('fsrsUndoBtn').disabled=true;
 const grading=$('cardsContainer').querySelector('.fsrs-grade-row');
 grading?.setAttribute('aria-busy','true');
 grading?.querySelectorAll('button').forEach(button=>{button.disabled=true;});
 try{
  const now=new Date(),previous=fsrsRecords.get(id);let record,conflict=false,transactionError,undoEntries;
  const gradeLabel=grading.querySelector('[data-grade="'+grade+'"]').firstChild.textContent.trim();
  const selection={topic:ui.topic,level:ui.level,type:ui.type,audit:ui.audit,status:ui.status,search:ui.search,mode:'fsrs'};
  const searchText=$('searchBox').value,pool=cognitivePool;
  await fsrsTransaction('readwrite',store=>{
   const request=store.getAll();request.onsuccess=()=>{
    try{
     const rows=request.result,latest=rows.find(row=>row.id===id);
     conflict=JSON.stringify(latest||null)!==JSON.stringify(previous||null);
     let daily=fsrsDailyLimit($('fsrsDaily').value);try{daily=fsrsDailyLimit(localStorage.getItem('cm8-fsrs-daily'));}catch{}
     const used=rows.filter(row=>row.logs?.some(log=>log.state===0&&fsrsDay(log.reviewTime)===fsrsDay(now))).length;
     if(!latest&&used>=daily)conflict=true;
     replaceFSRSRecords(rows);if(conflict)return;
     const graph=CMNCognitive.graph(CARDS,cognitiveState);
     const updates=CMNCognitive.propagateStability(id,grade,fsrsRecords,graph,cognitiveState,(target,card)=>schedulerFor(target).nextInterval({stability:card.stability,stabilityFast:card.stabilityFast,difficulty:card.difficulty},retentionFor(target),{card:hydrateFSRS(card),grade:3,elapsedDays:0}));
     const result=schedulerFor(id).review({card:fsrsCard(id),grade,now});
     const event=cognitiveRatingEvent(id,grade,now,result.card.reps);
     record={id,card:result.card,logs:[...(latest?.logs||[]),result.revlog],cognitiveEvents:CMNCognitive.mergeEvents(latest?.cognitiveEvents||[],event?[event]:[])};
     const changed=[...updates,record],before=new Map(rows.map(row=>[row.id,row]));
     undoEntries=changed.map(row=>({id:row.id,before:before.has(row.id)?structuredClone(before.get(row.id)):null,after:structuredClone(row)}));
     for(const row of changed)store.put(row);
    }catch(error){transactionError=error;request.transaction?.abort();store.transaction.abort();}
   };
  }).catch(error=>{throw transactionError||error;});
  if(conflict){
   openAnswers.delete(id);ui.focusId=null;fsrsBusy=false;render();
   notify('O histórico ou a cota mudou em outra aba. A fila foi atualizada.');
   if(ui.mode==='fsrs')focusFSRSQuestion();
   return;
  }
  fsrsUndo={id,entries:undoEntries,selection,searchText,pool};
  $('fsrsFeedbackText').textContent='Avaliado como '+gradeLabel+' · próxima revisão em '+fsrsIntervalWords(record.card.dueAt)+'.';
  $('fsrsUndoBtn').hidden=false;
  replaceFSRSRecords(await readFSRSRecords());signalFSRS();openAnswers.delete(id);ui.focusId=null;fsrsBusy=false;render();
  if(ui.mode==='fsrs')focusFSRSQuestion();
 }catch{notify('Não foi possível salvar a revisão. Tente novamente.',5500);}
 finally{
  fsrsBusy=false;$('fsrsUndoBtn').disabled=false;
  if(grading?.isConnected){
   grading.removeAttribute('aria-busy');
   grading.querySelectorAll('button').forEach(button=>{button.disabled=false;});
  }
 }
}
function fsrsIntervalWords(due){
 const [number,unit]=fsrsInterval(due).split(' '),singular=number==='1';
 return number+' '+(unit==='d'?(singular?'dia':'dias'):unit==='h'?(singular?'hora':'horas'):(singular?'minuto':'minutos'));
}
async function undoFSRS(){
 if(!fsrsUndo||fsrsBusy||!fsrsReady)return;
 const undo=fsrsUndo;fsrsBusy=true;$('fsrsUndoBtn').disabled=true;
 try{
  let conflict=false,transactionError;
  await fsrsTransaction('readwrite',store=>{
   const request=store.getAll();request.onsuccess=()=>{
    try{
     const latest=new Map(request.result.map(row=>[row.id,row]));
     // Compare every affected card before writing any: other tabs may have reviewed dependents.
     conflict=undo.entries.some(entry=>JSON.stringify(latest.get(entry.id)||null)!==JSON.stringify(entry.after));
     if(conflict)return;
     for(const entry of undo.entries){if(entry.before)store.put(entry.before);else store.delete(entry.id);}
    }catch(error){transactionError=error;store.transaction.abort();}
   };
  }).catch(error=>{throw transactionError||error;});
  replaceFSRSRecords(await readFSRSRecords());
  fsrsUndo=null;$('fsrsUndoBtn').hidden=true;
  if(conflict){
   $('fsrsFeedbackText').textContent='Não foi possível desfazer: o histórico de um cartão afetado mudou em outra aba ou operação. A fila foi atualizada.';
  }else{
   Object.assign(ui,undo.selection);cognitivePool=undo.pool;cognitiveSession=null;ui.focusId=undo.id;ui.showAll=false;
   $('searchBox').value=undo.searchText;$('levelSelect').value=ui.level;$('typeSelect').value=ui.type;$('auditSelect').value=ui.audit;
   openAnswers.add(undo.id);signalFSRS();
   $('fsrsFeedbackText').textContent='Avaliação desfeita. O histórico e os intervalos anteriores foram restaurados.';
  }
  fsrsBusy=false;render();
  if(!conflict){const answer=$('cardsContainer').querySelector('.answer-box');answer?.focus({preventScroll:true});}
 }catch{
  $('fsrsFeedbackText').textContent='Não foi possível desfazer a avaliação. Seu histórico foi mantido; tente novamente.';
 }finally{fsrsBusy=false;$('fsrsUndoBtn').disabled=false;}
}
$('fsrsUndoBtn').addEventListener('click',undoFSRS);
async function exportFSRS(){
 if(!fsrsReady||fsrsBusy)return;
 try{replaceFSRSRecords(await readFSRSRecords());
 const payload={format:'cm8-fsrs',version:1,model:'FSRS-7',desiredRetention:FSRS_RETENTION,exportedAt:new Date().toISOString(),records:[...fsrsRecords.values()]};
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='cm8_fsrs_'+new Date().toISOString().slice(0,10)+'.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),5000);
 }catch{notify('Não foi possível exportar o histórico. Tente novamente.');}
}
$('fsrsExport').addEventListener('click',exportFSRS);
$('fsrsImportButton').addEventListener('click',()=>$('fsrsImport').click());
$('fsrsDaily').addEventListener('change',()=>{
 const value=fsrsDailyLimit($('fsrsDaily').value);
 $('fsrsDaily').value=value;try{localStorage.setItem('cm8-fsrs-daily',String(value));}catch{}
 if(ui.mode==='fsrs')renderFSRS({keepCard:true});
});
try{$('fsrsDaily').value=String(fsrsDailyLimit(localStorage.getItem('cm8-fsrs-daily')));}catch{}
$('fsrsImport').addEventListener('change',async event=>{
 const file=event.target.files?.[0];event.target.value='';if(!file)return;
 if(!fsrsReady||fsrsBusy){notify('Aguarde o histórico ficar disponível para importar.');return;}
 fsrsBusy=true;
 try{
  if(file.size>15*1024*1024)throw Error('Arquivo acima de 15 MB.');
  const data=JSON.parse(await fileAsText(file));
  if(data.format!=='cm8-fsrs'||data.version!==1||data.model!=='FSRS-7'||!Array.isArray(data.records))throw Error('Backup FSRS incompatível.');
  const records=new Map();
  for(const entry of data.records){
   if(!entry||!ALL_IDS.has(entry.id)||records.has(entry.id)||entry.card?.cardId!==entry.id||!Array.isArray(entry.logs)||
      !Number.isFinite(Date.parse(entry.card.dueAt))||
      (entry.card.lastReviewAt!==null&&!Number.isFinite(Date.parse(entry.card.lastReviewAt)))||
      ![0,1,2,3].includes(entry.card.state)||!Number.isFinite(entry.card.stability)||
      !Number.isFinite(entry.card.stabilityFast)||!Number.isFinite(entry.card.difficulty)||
      !Number.isInteger(entry.card.reps)||entry.card.reps<0||
      entry.logs.some(log=>!log||log.cardId!==entry.id||![1,2,3,4].includes(log.rating)||!Number.isFinite(Date.parse(log.reviewTime))))
    throw Error('Histórico FSRS inválido.');
   fsrsScheduler.preview({card:hydrateFSRS(entry.card),now:new Date()}).map(item=>item);
   if(entry.cognitiveEvents)CMNCognitive.validate({...cognitiveState,events:entry.cognitiveEvents},ALL_IDS);
   if(entry.graphBaseStability!==undefined&&(!Number.isFinite(entry.graphBaseStability)||entry.graphBaseStability<=0))throw Error('Bônus de grafo inválido.');
   records.set(entry.id,entry);
  }
  replaceFSRSRecords(await readFSRSRecords());
  if(!confirm(`Substituir o histórico FSRS de ${fsrsRecords.size} cartões pelo histórico de ${records.size} cartões deste arquivo?`))return;
  await fsrsTransaction('readwrite',store=>{store.clear();for(const record of records.values())store.put(record);});
  fsrsRecords.clear();for(const [id,record] of records)fsrsRecords.set(id,record);
  fsrsUndo=null;$('fsrsFeedbackText').textContent='';signalFSRS();openAnswers.clear();ui.focusId=null;fsrsBusy=false;render();notify('Histórico FSRS importado.');
 }catch(error){notify(error.message||'Não foi possível importar o histórico FSRS.',5500);}
 finally{fsrsBusy=false;if(ui.mode==='fsrs')refreshFSRS();}
});
async function initFSRS(){
 try{
  fsrsScheduler=await CM8FSRS.DefaultScheduler({version:'FSRS-7',desiredRetention:FSRS_RETENTION,enableShortTerm:true,learningSteps:['1m','10m'],relearningSteps:['10m'],enableFuzz:false});
  for(const type of ['gist','transfer'])cognitiveSchedulers[type]=await CM8FSRS.DefaultScheduler({version:'FSRS-7',desiredRetention:CMNCognitive.RETENTION[type],enableShortTerm:true,learningSteps:['1m','10m'],relearningSteps:['10m'],enableFuzz:false});
  fsrsDB=await openFSRSDB();
  await new Promise((resolve,reject)=>{const request=fsrsDB.transaction('cards').objectStore('cards').getAll();request.onsuccess=()=>{for(const record of request.result)if(ALL_IDS.has(record.id))fsrsRecords.set(record.id,record);resolve();};request.onerror=()=>reject(request.error);});
  fsrsReady=true;renderCognitive();if(ui.mode==='fsrs'){render();if(document.activeElement===$('listTitle'))focusFSRSQuestion();}
 }catch{
  fsrsUnavailable=true;renderCognitive();
  $('fsrsSummary').textContent='Armazenamento indisponível';
  $('fsrsExport').disabled=true;
  $('fsrsImportButton').disabled=true;
  if(ui.mode==='fsrs')render();
 }
}
const EDIT_KEY='cm8-text-edits-v1';
let textEdits=Object.create(null),editingId=null,editorBaseline='',editorSnapshot='',editorField=null,editorRange=null;
const richTags=new Set(['P','BR','STRONG','B','EM','I','U','S','STRIKE','UL','OL','LI','H4','BLOCKQUOTE','SUB','SUP']);
function cleanRich(html){
 const template=document.createElement('template');template.innerHTML=String(html);
 function clean(node){
  if(node.nodeType===Node.TEXT_NODE)return safe(node.textContent);
  if(node.nodeType!==Node.ELEMENT_NODE)return '';
  if(['SCRIPT','STYLE','IFRAME','OBJECT','SVG','MATH','FORM','INPUT','BUTTON'].includes(node.tagName))return '';
  const content=Array.from(node.childNodes,clean).join('');
  if(node.tagName==='BR')return '<br>';
  const tag=node.tagName==='DIV'?'p':richTags.has(node.tagName)?node.tagName.toLowerCase():null;
  return tag?'<'+tag+'>'+content+'</'+tag+'>':content;
 }
 return Array.from(template.content.childNodes,clean).join('');
}
function richText(html){
 const box=document.createElement('div');box.innerHTML=html;
 box.querySelectorAll('p,li,h4,blockquote,br').forEach(node=>node.append('\n'));
 return box.textContent.trim();
}
function validateEdits(data){
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Backup de edições inválido.');
 const result=Object.create(null);
 for(const [id,entry] of Object.entries(data)){
  if(!ALL_IDS.has(id)||!entry||typeof entry!=='object')throw Error('Cartão inválido no backup.');
  const fields={};
  for(const field of ['question','scenario','answer']){
   if(typeof entry[field]!=='string'||entry[field].length>100000)throw Error('Texto de edição inválido.');
   fields[field]=cleanRich(entry[field]);
  }
  if(!richText(fields.question)||!richText(fields.answer)||(byId.get(id).scenario&&!richText(fields.scenario)))throw Error('Preencha a pergunta, a resposta e o cenário quando houver.');
  result[id]=fields;
 }
 return result;
}
function readEdits(){return validateEdits(JSON.parse(localStorage.getItem(EDIT_KEY)||'{}'));}
try{textEdits=readEdits();}catch{notify('Não foi possível carregar as edições de texto. O material original está disponível.',6000);}
function displayText(c){
 const edit=textEdits[c.id];
 return edit?{...c,question:richText(edit.question),scenario:richText(edit.scenario),answer:richText(edit.answer)}:c;
}
function editButton(c){return '<button type="button" class="action" data-action="edit" data-id="'+safe(c.id)+'">Editar texto</button>';}
function editorValues(){return Object.fromEntries(['question','scenario','answer'].map(field=>[field,cleanRich($('edit-'+field).innerHTML)]));}
function editorChanged(){return JSON.stringify(editorValues())!==editorSnapshot;}
function restoreEditorFocus(id){
 const button=Array.from($('cardsContainer').querySelectorAll('[data-action="edit"]')).find(el=>el.dataset.id===id);
 button?.closest('details')?.setAttribute('open','');
 (button||$('listTitle')).focus({preventScroll:true});
}
function closeTextEditor(){
 if(editorChanged()&&!confirm('Descartar as alterações de texto que ainda não foram salvas?'))return;
 $('textEditor').close();restoreEditorFocus(editingId);editingId=null;
}
function openTextEditor(id){
 if(!byId.has(id))return;
 editingId=id;
 const c=byId.get(id),edit=textEdits[id];
 editorBaseline=JSON.stringify(edit||null);
 $('editorTitle').textContent='Editar cartão '+id;
 $('editorError').textContent='';
 $('editorScenario').hidden=!c.scenario;
 for(const field of ['question','scenario','answer']){
  $('edit-'+field).removeAttribute('aria-invalid');$('edit-'+field).removeAttribute('aria-describedby');
  $('edit-'+field).innerHTML=edit?.[field]??('<p>'+safe(c[field]||'').replaceAll('\n','<br>')+'</p>');
 }
 editorSnapshot=JSON.stringify(editorValues());$('restoreText').disabled=!edit;
 editorRange=null;editorField=$('edit-question');$('textEditor').showModal();editorField.focus();
 const range=document.createRange();range.selectNodeContents(editorField);range.collapse(false);
 const selection=getSelection();selection.removeAllRanges();selection.addRange(range);editorRange=range.cloneRange();updateEditorState();
}
function updateEditorState(){
 if(!$('textEditor').open)return;
 const dirty=editorChanged();
 $('editorSaveState').textContent=dirty?'Alterações não salvas':'Sem alterações';
 $('saveText').disabled=!dirty;
 const toggles=['bold','italic','underline','strikeThrough','insertUnorderedList','insertOrderedList'];
 for(const button of $('editorToolbar').querySelectorAll('[data-command]')){
  if(toggles.includes(button.dataset.command))button.setAttribute('aria-pressed',String(document.queryCommandState(button.dataset.command)));
 }
}
async function saveTextEdit(restore=false){
 if($('textEditor').getAttribute('aria-busy')==='true')return;
 $('textEditor').setAttribute('aria-busy','true');$('saveText').disabled=true;
 try{
  const id=editingId,values=editorValues();
  if(!restore)validateEdits({[id]:values});
  const commit=()=>{
   const latest=readEdits();
   if(JSON.stringify(latest[id]||null)!==editorBaseline)throw Error('Este cartão foi editado em outra aba. Feche e reabra o editor para carregar a versão atual.');
   if(restore)delete latest[id];else latest[id]=values;
   localStorage.setItem(EDIT_KEY,JSON.stringify(latest));textEdits=latest;
  };
  if(navigator.locks)await navigator.locks.request(EDIT_KEY,commit);else commit();
  $('textEditor').close();editingId=null;render();restoreEditorFocus(id);
  notify(restore?'Texto original restaurado.':'Edição salva neste navegador.');
 }catch(error){
 $('editorError').textContent=error.message||'Não foi possível salvar a edição.';
 const empty=['question','answer',...(byId.get(editingId)?.scenario?['scenario']:[])].map(f=>$('edit-'+f)).find(el=>!richText(cleanRich(el.innerHTML)));
 if(empty){empty.setAttribute('aria-invalid','true');empty.setAttribute('aria-describedby','editorError');empty.focus();}
 }finally{$('textEditor').removeAttribute('aria-busy');updateEditorState();}
}
$('closeEditor').addEventListener('click',closeTextEditor);
$('cancelEditor').addEventListener('click',closeTextEditor);
$('textEditor').addEventListener('cancel',event=>{event.preventDefault();closeTextEditor();});
$('saveText').addEventListener('click',()=>saveTextEdit());
$('restoreText').addEventListener('click',()=>{if(confirm('Restaurar o texto original deste cartão?'))saveTextEdit(true);});
document.addEventListener('selectionchange',()=>{
 if(!$('textEditor').open)return;
 const selection=getSelection();if(!selection.rangeCount)return;
 const range=selection.getRangeAt(0);
 const ancestor=range.commonAncestorContainer;
 const field=(ancestor.nodeType===Node.ELEMENT_NODE?ancestor:ancestor.parentElement)?.closest('[data-edit-field]');
 if(field&&field.contains(range.startContainer)&&field.contains(range.endContainer)){
  editorField=field;editorRange=range.cloneRange();updateEditorState();
 }
});
$('editorToolbar').addEventListener('pointerdown',event=>{if(event.target.closest('button'))event.preventDefault();});
$('editorToolbar').addEventListener('click',event=>{
 const button=event.target.closest('[data-command]');if(!button)return;
 editorField?.focus();
 if(editorRange&&editorField?.contains(editorRange.commonAncestorContainer)){
  const selection=getSelection();selection.removeAllRanges();selection.addRange(editorRange);
 }
 document.execCommand(button.dataset.command,false,button.dataset.value||null);updateEditorState();
});
for(const field of $('textEditor').querySelectorAll('[data-edit-field]')){
 field.addEventListener('focus',()=>{editorField=field;});
 field.addEventListener('input',()=>{field.removeAttribute('aria-invalid');field.removeAttribute('aria-describedby');$('editorError').textContent='';updateEditorState();});
 field.addEventListener('paste',event=>{
  event.preventDefault();const html=event.clipboardData.getData('text/html');
  document.execCommand('insertHTML',false,html?cleanRich(html):safe(event.clipboardData.getData('text/plain')).replaceAll('\n','<br>'));
 });
 field.addEventListener('drop',event=>event.preventDefault());
 field.addEventListener('keydown',event=>{
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();saveTextEdit();}
 });
}
window.addEventListener('beforeunload',event=>{
 if($('textEditor').open&&editorChanged()){event.preventDefault();event.returnValue='';}
});
window.addEventListener('storage',event=>{
 if(event.key!==EDIT_KEY)return;
 try{textEdits=readEdits();if(!$('textEditor').open)render();}catch{notify('Não foi possível atualizar as edições de outra aba.');}
});
$('exportEdits').addEventListener('click',()=>{
 const data={format:'cm8-text-edits',version:1,cards:textEdits};
 const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='cm8-edicoes-texto.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
});
$('importEditsButton').addEventListener('click',()=>$('importEditsFile').click());
$('importEditsFile').addEventListener('change',async event=>{
 const file=event.target.files?.[0];event.target.value='';if(!file)return;
 try{
  if(file.size>5*1024*1024)throw Error('O arquivo deve ter até 5 MB.');
  const data=JSON.parse(await fileAsText(file));
  if(data.format!=='cm8-text-edits'||data.version!==1)throw Error('Backup de edições incompatível.');
  const entries=validateEdits(data.cards);
  if(!confirm('Importar edições de '+Object.keys(entries).length+' cartões? As edições desses cartões serão substituídas.'))return;
  const commit=()=>{const merged=Object.assign(readEdits(),entries);localStorage.setItem(EDIT_KEY,JSON.stringify(merged));textEdits=merged;};
  if(navigator.locks)await navigator.locks.request(EDIT_KEY,commit);else commit();
  render();notify('Edições de texto importadas.');
 }catch(error){notify(error.message||'Não foi possível importar.',6000);}
});

const cognitiveSchedulers=Object.create(null);
let cognitiveState=CMNCognitive.migrate(CARDS),cognitivePool='all',cognitiveSession=null;
try{const saved=JSON.parse(localStorage.getItem(STORE_KEY)||'{}').cognitive;if(saved)cognitiveState=CMNCognitive.validate(saved,ALL_IDS);}catch{notify('Configuração cognitiva não carregada. O FSRS padrão permanece disponível.',6000);}
const cognitionLabels={verbatim:'Literal',gist:'Essência',transfer:'Transferência'};
const cognitionHelp={verbatim:'Recordar os fatos e detalhes do cartão.',gist:'Recuperar a ideia central e justificá-la.',transfer:'Aplicar o conhecimento a uma situação diferente.'};
function cognitiveSnapshot(){return {...cognitiveState,events:CMNCognitive.mergeEvents(cognitiveState.events,...[...fsrsRecords.values()].map(row=>row.cognitiveEvents||[]))};}
function retentionFor(id){return cognitiveState.enabled?CMNCognitive.RETENTION[cognitiveState.metadata[id]?.traceType||'verbatim']:.9;}
function schedulerFor(id){const type=cognitiveState.metadata[id]?.traceType;return cognitiveState.enabled&&cognitiveSchedulers[type]?cognitiveSchedulers[type]:fsrsScheduler;}
function variantIndex(id){const m=cognitiveState.metadata[id];return (fsrsRecords.get(id)?.card.reps||0)%Math.max(1,m.transferVariants.length);}
function reviewPresentation(c){const m=cognitiveState.metadata[c.id];if(!cognitiveState.enabled||m.traceType!=='transfer'||!m.transferVariants.length)return c;const v=m.transferVariants[variantIndex(c.id)];return {...c,question:v.prompt,answer:v.answer,scenario:'',kind:'question',cognitiveVariant:true};}
function traceBadge(id){const m=cognitiveState.metadata[id];if(!cognitiveState.enabled)return '';return '<span class="chip" title="'+cognitionHelp[m.traceType]+'">'+cognitionLabels[m.traceType]+(cognitiveState.enabled?' · '+Math.round(retentionFor(id)*100)+'%':'')+'</span>'+(m.anchor?'<span class="chip" title="Âncora: pode propagar estabilidade quando a camada experimental está ativa">Âncora</span>':'');}
function cognitiveRatingEvent(id,grade,now,reps){const m=cognitiveState.metadata[id];if(!cognitiveState.enabled||!['gist','transfer'].includes(m.traceType))return null;return {id:'rating:'+id+':'+now.toISOString()+':'+reps,kind:m.traceType,cardId:id,topic:byId.get(id).topic,time:now.toISOString(),success:grade>=3?1:0,total:1,cycle:0,variant:m.traceType==='transfer'?variantIndex(id):0};}
function renderCognitive(){
 renderSessionStats({historyChanged:true});
 $('cognitiveEnabled').checked=cognitiveState.enabled;
 const snapshot=cognitiveSnapshot(),metrics=CMNCognitive.metrics(snapshot.events),labels={contrast:'Discriminação',transfer:'Transferência',gist:'Recuperação da essência'};
 const definitions={contrast:'Acertos ao distinguir conceitos em uma prática de contraste.',transfer:'Avaliações bem-sucedidas ao aplicar o conteúdo a outro cenário, com a camada experimental ativa.',gist:'Avaliações bem-sucedidas da ideia central, com a camada experimental ativa.'};
 const actions={contrast:'Fazer contraste',transfer:'Praticar transferência',gist:'Revisar essência'};
 $('cognitiveStateHint').textContent=cognitiveState.enabled?'Práticas experimentais ativas. Escolha o tema em Práticas cognitivas.':'A camada experimental está desativada. O FSRS padrão continua disponível; ative as práticas para registrar essência e transferência.';
 $('cognitiveMetrics').innerHTML=Object.entries(metrics).map(([kind,m])=>'<div><dt>'+labels[kind]+'</dt><dd>'+(m.total?Math.round(m.rate*100)+'% <small>('+m.success+'/'+m.total+')</small>':'Sem práticas')+'</dd><p class="metric-help">'+definitions[kind]+'</p><button type="button" class="subtle-btn" data-metric-practice="'+kind+'">'+actions[kind]+'</button></div>').join('');
 const today=fsrsDay(new Date()),reviewed=[...fsrsRecords.values()].filter(row=>row.logs?.some(log=>fsrsDay(log.reviewTime)===today)).length;
 const interventions=snapshot.events.filter(e=>['contrast','context'].includes(e.kind)&&fsrsDay(e.time)===today).length;
 $('cognitiveToday').textContent=reviewed+' '+(reviewed===1?'cartão revisado':'cartões revisados')+' hoje no FSRS · '+interventions+' '+(interventions===1?'intervenção':'intervenções')+' hoje';
 $('startReviewBtn').disabled=!fsrsReady;
 if(fsrsReady){const queue=fsrsQueue();$('reviewStartSummary').textContent='Nesta seleção: '+queue.due.length+' vencidos e '+queue.newCards.length+' novos para revisar.';setTodayQueue(queue.due.length,queue.newCards.length);}
 else{setTodayQueue(null,null);$('reviewStartSummary').textContent=fsrsUnavailable?'Histórico indisponível. Você pode estudar em Foco.':'Carregando a fila de revisão…';}
 const eligible=getFiltered().filter(c=>!mark(c.id).hidden),due=eligible.filter(c=>fsrsRecords.has(c.id)&&new Date(fsrsRecords.get(c.id).card.dueAt)<=new Date()),pools=CMNCognitive.pools(due,fsrsRecords,cognitiveState),sessions=CMNCognitive.sessions(eligible,fsrsRecords,snapshot);
 $('cognitivePools').querySelector('[data-pool="A"]').textContent='A · Literal ('+pools.A.length+' vencidos)';
 $('cognitivePools').querySelector('[data-pool="B"]').textContent='B · Essência / transferência ('+pools.B.length+' vencidos)';
 $('cognitivePools').querySelector('[data-pool="C"]').textContent='C · Intervenções ('+sessions.length+')';
 for(const b of $('cognitivePools').querySelectorAll('[data-pool]'))b.setAttribute('aria-pressed',String(b.dataset.pool===cognitivePool));
 renderCognitiveLinks();
}
function renderCognitiveLinks(){
 const graph=CMNCognitive.graph(CARDS,cognitiveState),topic=Number($('cognitiveTopic').value),linked=CARDS.filter(c=>c.topic===topic&&(cognitiveState.metadata[c.id]?.anchor||graph[c.id].dependents.length));
 const icon='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m10 13 4-4m-6 6-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 2 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/></svg>';
 $('cognitiveLinks').innerHTML=linked.length?'<p>Conexões declaradas neste tema:</p>'+linked.map(c=>'<button type="button" class="subtle-btn" data-linked-card="'+safe(c.id)+'">'+icon+' '+safe(c.id)+(cognitiveState.metadata[c.id].anchor?' · Âncora':' · '+graph[c.id].dependents.length+' dependentes')+'</button>').join(''):'<p>Sem âncoras ou dependências declaradas. O hub agrupa os cartões do tema.</p>';
}
$('cognitiveTopic').innerHTML=TOPICS.map(t=>'<option value="'+t.id+'">'+safe(t.title)+'</option>').join('');
$('cognitiveTopic').addEventListener('change',renderCognitiveLinks);
$('cognitiveEnabled').addEventListener('change',()=>{cognitiveState.enabled=$('cognitiveEnabled').checked;cognitivePool='all';cognitiveSession=null;save();openAnswers.clear();ui.focusId=null;render();});
$('cognitiveLinks').addEventListener('click',event=>{const button=event.target.closest('[data-linked-card]');if(!button)return;cognitiveSession=null;clearFilters();$('searchBox').value=button.dataset.linkedCard;applySearch();$('listTitle').focus({preventScroll:true});$('listTitle').scrollIntoView({block:'start'});});
$('cognitiveMetrics').addEventListener('click',event=>{
 const button=event.target.closest('[data-metric-practice]');if(!button)return;
 const kind=button.dataset.metricPractice;
 if(pageKind!=='study'){location.href='./index.html?practice='+encodeURIComponent(kind);return;}
 if(kind!=='contrast'&&!cognitiveState.enabled){$('studyOverview').open=true;$('cognitiveTools').open=true;$('cognitiveEnabled').focus();$('cognitiveTools').scrollIntoView({block:'start'});notify('Ative as práticas experimentais e escolha um tema para registrar esta métrica.');return;}
 startPractice(kind);
});
function startPractice(kind,scheduled){
 if(!fsrsReady){notify('Aguarde o carregamento do histórico.');return;}
 const topic=scheduled?.topic||Number($('cognitiveTopic').value),cards=CARDS.filter(c=>c.topic===topic&&!mark(c.id).hidden),snapshot=cognitiveSnapshot();
 if(kind==='transfer'||kind==='gist'){
  const card=cards.find(c=>cognitiveState.metadata[c.id].traceType===kind&&(kind==='gist'||cognitiveState.metadata[c.id].transferVariants.length));
  if(!card){notify(kind==='gist'?'Este tema ainda não tem cartões de essência.':'Este tema ainda não tem variações de transferência cadastradas.');return;}
  if(!cognitiveState.enabled){notify('Ative a arquitetura cognitiva no mapa para usar variações na revisão FSRS.');return;}
  // Scheduled practice only: never force an early FSRS review.
  cognitiveSession=null;ui.topic=String(topic);ui.mode='fsrs';ui.level=ui.type=ui.audit=ui.status='all';ui.search=norm(card.id);$('searchBox').value=card.id;for(const id of ['levelSelect','typeSelect','auditSelect'])$(id).value='all';cognitivePool='B';ui.focusId=null;render();focusFSRSQuestion();return;
 }
 if(!cards.length){notify('Não há cartões visíveis neste tema.');return;}
 let session;
 if(kind==='contrast'){
  const first=scheduled?byId.get(scheduled.cardId):cards.find(c=>cognitiveState.metadata[c.id].traceType==='verbatim'&&cognitiveState.metadata[c.id].confusableWith.some(id=>!mark(id).hidden));
  if(!first){notify('Este tema ainda não tem pares confundíveis declarados.');return;}
  const pair=[first,...cognitiveState.metadata[first.id].confusableWith.filter(id=>!mark(id).hidden).slice(0,2).map(id=>byId.get(id))];if(pair.length<2){notify('Reexiba um dos pares ocultos para praticar contraste.');return;}
  const options=pair.map((c,i)=>({id:c.id,answer:displayText(c).answer}));for(let i=options.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[options[i],options[j]]=[options[j],options[i]];}
  session={kind,topic,cardId:first.id,cards:pair,options,cycle:scheduled?.cycle||Math.floor((fsrsRecords.get(first.id)?.card.reps||0)/4)};
 }else{
  const count=snapshot.events.filter(e=>e.kind==='context'&&e.topic===topic).length,hidden=cards[count%cards.length];session={kind:'context',topic,cardId:hidden.id,cards,cycle:scheduled?.cycle||Math.floor(Date.now()/(7*86400000)),revealed:false};
 }
 cognitiveSession=session;ui.mode='fsrs';render();$('listTitle').focus();$('listTitle').scrollIntoView({block:'start'});
}
qsa('[data-practice]').forEach(button=>button.addEventListener('click',()=>startPractice(button.dataset.practice)));
$('cognitivePools').addEventListener('click',event=>{
 const b=event.target.closest('[data-pool]');if(!b)return;cognitivePool=b.dataset.pool;cognitiveSession=null;ui.focusId=null;openAnswers.clear();
 if(cognitivePool==='C'){cognitiveSession={kind:'pool'};render();}else render();
});
function renderIntervention(){
 $('fsrsSettings').hidden=true;$('focusNav').hidden=true;$('moreWrap').hidden=true;$('shuffleBtn').hidden=true;$('revealAllBtn').hidden=true;
 const session=cognitiveSession,container=$('cardsContainer');$('listSub').textContent='Prática independente · sem alterar notas, estabilidade ou dificuldade do FSRS';
 const back='<button type="button" class="subtle-btn" data-cognitive-action="back">Voltar às revisões</button>';
 if(session.kind==='pool'){
  $('listTitle').textContent='Intervenções agendadas';const pending=CMNCognitive.sessions(getFiltered().filter(c=>!mark(c.id).hidden),fsrsRecords,cognitiveSnapshot());
  container.innerHTML='<div class="intervention">'+back+(pending.length?pending.map((p,i)=>'<button type="button" class="subtle-btn" data-session-index="'+i+'">'+(p.kind==='contrast'?'Contraste':'Contexto')+' · '+safe(topicsById.get(p.topic).title)+'</button>').join(''):'<p>Práticas em dia nesta seleção.</p>')+'</div>';session.pending=pending;return;
 }
 $('listTitle').textContent=session.kind==='contrast'?'Contraste deliberado':'Estudo contextual · '+topicsById.get(session.topic).title;
 if(session.result){container.innerHTML='<div class="intervention" role="status"><h3>Prática registrada</h3><p>'+session.result+'</p>'+back+'</div>';return;}
 if(session.kind==='contrast'){
  container.innerHTML='<div class="intervention">'+back+'<p>Compare as perguntas. Quando tiver uma hipótese, abra o banco de respostas e associe cada uma à pergunta correta.</p><form id="contrastForm">'+session.cards.map((c,i)=>'<section><h3>'+safe(displayText(c).question)+'</h3><label for="contrast-'+i+'">Resposta correspondente</label><select id="contrast-'+i+'" required><option value="">Escolha uma resposta</option>'+session.options.map((v,j)=>'<option value="'+safe(v.id)+'">Resposta '+String.fromCharCode(65+j)+'</option>').join('')+'</select></section>').join('')+'<details><summary>Abrir banco de respostas</summary>'+session.options.map((v,i)=>'<p><strong>'+String.fromCharCode(65+i)+'.</strong> '+safe(v.answer)+'</p>').join('')+'</details><p id="practiceError" role="alert"></p><button type="submit" class="subtle-btn">Conferir associações</button></form></div>';
  $('contrastForm').addEventListener('submit',event=>{event.preventDefault();const selected=session.cards.map((c,i)=>$('contrast-'+i).value);if(new Set(selected).size!==selected.length){$('practiceError').textContent='Use cada resposta uma única vez.';return;}finishIntervention(selected.filter((id,i)=>id===session.cards[i].id).length,session.cards.length);});
 }else{
  const g=CMNCognitive.graph(CARDS,cognitiveState);
  container.innerHTML='<div class="intervention">'+back+'<p>Hub: '+safe(topicsById.get(session.topic).title)+'. Use os cartões e as conexões como pistas para recuperar a resposta oculta.</p>'+session.cards.map(c=>'<section class="context-card"><h3>'+safe(displayText(c).question)+'</h3><p class="theme-hint">'+safe(c.id)+(g[c.id].prerequisites.length?' · Pré-requisitos: '+g[c.id].prerequisites.map(safe).join(', '):' · Ligação: hub do tema')+'</p>'+(c.id===session.cardId&&!session.revealed?'<button type="button" class="subtle-btn" data-cognitive-action="reveal">Recuperar e revelar resposta oculta</button>':'<p>'+safe(displayText(c).answer)+'</p>')+'</section>').join('')+(session.revealed?'<div><p>Você recuperou o essencial antes de revelar?</p><button type="button" class="subtle-btn" data-cognitive-action="success">Sim</button><button type="button" class="subtle-btn" data-cognitive-action="failure">Ainda não</button></div>':'')+'</div>';
 }
}
async function finishIntervention(success,total){
 const session=cognitiveSession;if(!session||session.busy||session.result)return;session.busy=true;
 const e={id:'practice:'+crypto.randomUUID(),kind:session.kind,cardId:session.cardId,topic:session.topic,time:new Date().toISOString(),success,total,cycle:session.cycle,variant:0};
 try{
  const commit=()=>{let latest;try{latest=JSON.parse(localStorage.getItem(STORE_KEY)||'{}');}catch{throw Error('Não foi possível ler o progresso.');}const previous=cognitiveState,previousMarks=marks;const saved=latest.cognitive?CMNCognitive.validate(latest.cognitive,ALL_IDS):cognitiveState;
   cognitiveState={...saved,events:CMNCognitive.mergeEvents(saved.events,cognitiveSnapshot().events,[e])};marks=sanitizedMarks(latest.cards||marks);if(!save()){cognitiveState=previous;marks=previousMarks;throw Error('Não foi possível salvar a prática. Exporte o backup antes de sair.');}};
  if(navigator.locks)await navigator.locks.request(STORE_KEY,commit);else commit();
  session.result=session.kind==='contrast'?success+' de '+total+' associações corretas. '+session.cards.map(c=>c.id+': '+displayText(c).answer).join(' | '):success?'Essencial recuperado com pistas.':'Prática registrada para acompanhamento.';
  render();$('listTitle').focus();
 }catch(error){notify(error.message,6000);}finally{session.busy=false;}
}
$('cardsContainer').addEventListener('click',event=>{
 const pending=event.target.closest('[data-session-index]');if(pending&&cognitiveSession?.pending){const item=cognitiveSession.pending[Number(pending.dataset.sessionIndex)];if(item)startPractice(item.kind,item);return;}
 const button=event.target.closest('[data-cognitive-action]');if(!button)return;
 switch(button.dataset.cognitiveAction){case 'back':cognitiveSession=null;cognitivePool='all';render();focusFSRSQuestion();break;case 'reveal':cognitiveSession.revealed=true;renderIntervention();$('cardsContainer').querySelector('[data-cognitive-action="success"]')?.focus();break;case 'success':finishIntervention(1,1);break;case 'failure':finishIntervention(0,1);break;}
});
window.addEventListener('storage',event=>{if(event.key!==STORE_KEY)return;try{const saved=JSON.parse(event.newValue||'{}').cognitive;if(saved){cognitiveState=CMNCognitive.validate(saved,ALL_IDS);cognitivePool='all';if(!cognitiveSession){openAnswers.clear();render();}else renderCognitive();}}catch{notify('Não foi possível atualizar as práticas de outra aba.');}});

/* Busca instantânea: índice em Web Worker, ranking por relevância, reserva no thread principal. */
function liveHits(){return ui.searchHits&&ui.searchHitsFor===ui.search?ui.searchHits:null;}
function searchBadge(c){const SEARCH_FIELD_LABEL={question:'pergunta',scenario:'caso clínico',answer:'resposta',topic:'tema'};if(!ui.search||!liveHits())return '';const h=ui.searchHits.get(c.id);if(!h)return '';const where=h.fields.map(f=>SEARCH_FIELD_LABEL[f]).filter(Boolean);return `<p class="search-where">Encontrado em: ${where.length?safe(where.join(' · ')):'ID do cartão'}</p>`;}
function searchEngine(){if(searchEngine.state)return searchEngine.state;const st={worker:null,version:0,sig:null,seq:0,index:null,docs:null};searchEngine.state=st;
 try{if(typeof Worker==='function'&&typeof window.CMNSearch==='object'){st.worker=new Worker('./assets/search-worker.js');st.worker.onmessage=e=>onSearchMessage(e.data);st.worker.onerror=ev=>{ev?.preventDefault?.();dropSearchWorker();};}}catch(err){st.worker=null;}
 return st;}
function dropSearchWorker(){const st=searchEngine();try{st.worker?.terminate();}catch(err){}st.worker=null;st.sig=null;runSearch();}
function searchDocs(){return CARDS.map(c=>{const d=displayText(c),t=topicsById.get(c.topic);return {id:c.id,question:d.question,scenario:d.scenario||'',answer:d.answer,topic:(t?.title||'')+' '+(t?.area||'')};});}
function ensureSearchIndex(st){const sig=JSON.stringify(textEdits);if(sig===st.sig)return;st.sig=sig;st.version++;st.docs=searchDocs();st.index=null;if(st.worker)st.worker.postMessage({type:'build',docs:st.docs,version:st.version});}
function runSearch(){const raw=$('searchBox').value.trim();
 if(!raw||typeof window.CMNSearch!=='object'){ui.search=raw?norm(raw):'';ui.searchHits=null;ui.searchTerms=raw?[norm(raw)]:[];ui.limit=22;ui.focusId=null;render();return;}
 const st=searchEngine(),seq=++st.seq;ensureSearchIndex(st);
 if(st.worker){st.worker.postMessage({type:'query',q:raw,seq,version:st.version});return;}
 if(!st.index)st.index=CMNSearch.build(st.docs);applySearchHits(seq,raw,CMNSearch.query(st.index,raw));}
function onSearchMessage(m){const st=searchEngine();if(!m)return;if(m.type==='error'){dropSearchWorker();return;}if(m.type==='hits'&&m.version===st.version)applySearchHits(m.seq,$('searchBox').value.trim(),m.hits);}
function applySearchHits(seq,raw,hits){const st=searchEngine();if(seq!==st.seq||raw!==$('searchBox').value.trim())return;
 ui.search=norm(raw);ui.searchHitsFor=ui.search;ui.searchTerms=CMNSearch.terms(raw);ui.searchHits=new Map(hits.map((h,i)=>[h.id,{fields:h.fields,score:h.score,rank:i}]));ui.limit=22;ui.focusId=null;render();
 document.dispatchEvent(new CustomEvent('cm8:search',{detail:{query:raw,count:hits.length}}));}
function highlightTerms(root){const ts=(liveHits()&&ui.searchTerms&&ui.searchTerms.length?ui.searchTerms:[ui.search]).filter(t=>t&&t.length>=2).sort((a,b)=>b.length-a.length);for(const t of ts)highlightHits(root,t);}

restoringNavigation=true;readNavigationState();render();restoringNavigation=false;if($('searchBox')?.value.trim())runSearch();storageNotice();
initFSRS().then(()=>{const kind=new URL(location.href).searchParams.get('practice');if(pageKind==='study'&&['contrast','gist','transfer','context'].includes(kind)){if(kind!=='contrast'&&!cognitiveState.enabled){$('studyOverview').open=true;$('cognitiveTools').open=true;$('cognitiveEnabled').focus();}else startPractice(kind);}});
}

// Static JSON is the sole source of medical content. No build or backend is required.
async function loadStudyLibrary(){
 const status=document.getElementById('libraryLoadStatus');
 const retry=document.getElementById('retryLibrary');
 retry.hidden=true;
 status.textContent='Carregando os flashcards…';
 let source;
 try{
  const response=await fetch(new URL('../data/flashcards.json',document.querySelector('script[data-study-app]').src));
  if(!response.ok)throw new Error('HTTP '+response.status);
  source=await response.json();
  if(!Array.isArray(source.cards)||!source.cards.length||!Array.isArray(source.themes))throw new Error('Biblioteca inválida');
 }catch(error){
  status.textContent='Não foi possível carregar os flashcards. Verifique sua conexão e tente novamente. Seu progresso salvo foi preservado.';
  retry.hidden=false;
  return;
 }
 window.CM8Source=source;
 startStudy(source);
 document.getElementById('libraryLoad').hidden=true;
 document.getElementById('workspace').removeAttribute('inert');
 document.getElementById('workspace').setAttribute('aria-busy','false');
}
document.getElementById('retryLibrary').addEventListener('click',loadStudyLibrary);
loadStudyLibrary();

/* Mesa de estudo: fila de hoje, transições e robustez. */
function setTodayQueue(due,fresh){const el=id=>document.getElementById(id);if(!el('todayTotal'))return;const fmt=n=>n==null?'—':Number(n).toLocaleString('pt-BR');
 el('todayDue').textContent=fmt(due);el('todayNew').textContent=fmt(fresh);el('todayTotal').textContent=due==null?'—':fmt(due+fresh);
 const q=el('todayTotal').closest('.today-queue');if(q){q.dataset.state=due==null?'loading':due>0?'due':due+fresh>0?'fresh':'clear';}}
function withViewTransition(update){const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 if(reduce||typeof document.startViewTransition!=='function'||document.hidden){update();return;}
 try{document.startViewTransition(update);}catch(err){update();}}
(function netStatus(){const el=document.getElementById('netStatus');if(!el)return;const sync=()=>{el.hidden=navigator.onLine!==false;};window.addEventListener('online',sync);window.addEventListener('offline',sync);sync();})();

