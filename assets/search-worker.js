/* Worker da busca: mantém o índice fora do thread principal. */
importScripts('./search.js');
let index=[];
self.onmessage=e=>{const m=e.data||{};
 try{
  if(m.type==='build'){index=self.CMNSearch.build(m.docs);self.postMessage({type:'built',version:m.version});}
  else if(m.type==='query'){const t=performance.now();const hits=self.CMNSearch.query(index,m.q);self.postMessage({type:'hits',seq:m.seq,version:m.version,hits,ms:performance.now()-t});}
 }catch(err){self.postMessage({type:'error',seq:m.seq,message:String(err&&err.message||err)});}
};
