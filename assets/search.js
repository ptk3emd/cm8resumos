/* CM8 Resumos — núcleo de busca (sem dependências). Usado no worker e, como reserva, no próprio thread. */
(function(root){
 'use strict';
 const norm=t=>String(t??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
 const strip=t=>String(t??'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
 const FIELDS=[['question',3],['topic',2],['scenario',1],['answer',1]];
 function build(docs){return (docs||[]).map(d=>({id:String(d.id),idn:norm(d.id),question:' '+norm(strip(d.question))+' ',topic:' '+norm(strip(d.topic))+' ',scenario:' '+norm(strip(d.scenario))+' ',answer:' '+norm(strip(d.answer))+' '}));}
 function terms(q){return norm(q).split(/[\s,;]+/).map(t=>t.trim()).filter(Boolean).slice(0,12);}
 const isWordStart=(text,pos)=>pos<=0||!/[a-z0-9]/.test(text[pos-1]);
 function scoreField(text,term){let pos=text.indexOf(term);if(pos<0)return 0;let s=1;if(isWordStart(text,pos))s+=1;else{let p=text.indexOf(' '+term);if(p>=0)s+=1;}return s;}
 function query(index,q){
  const ts=terms(q);if(!ts.length)return [];
  const phrase=norm(q).trim(),hits=[];
  for(const d of index){
   let total=0,fields=new Set(),ok=true;
   if(d.idn===phrase)total+=1000;else if(phrase.length>=2&&d.idn.startsWith(phrase))total+=400;
   for(const t of ts){
    let best=0;
    if(d.idn===t)best+=60;else if(d.idn.startsWith(t))best+=20;
    for(const [f,w] of FIELDS){const s=scoreField(d[f],t);if(s){best+=s*w;fields.add(f);}}
    if(!best&&!d.idn.includes(t)){ok=false;break;}
    total+=best||1;
   }
   if(!ok)continue;
   if(ts.length>1)for(const [f,w] of FIELDS)if(d[f].includes(phrase)){total+=4*w;fields.add(f);}
   hits.push({id:d.id,score:total,fields:[...fields]});
  }
  hits.sort((a,b)=>b.score-a.score);
  return hits;
 }
 root.CMNSearch={build,query,terms,norm};
})(typeof self!=='undefined'?self:this);
