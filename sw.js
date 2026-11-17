/* CM8: app shell offline. This path is scoped to /cm8resumos/ on GitHub Pages. */
const CACHE_NAME='cm8resumos-shell-2026-11-17-study-guide-v4';
const PREFIX='cm8resumos-shell-';
const SHELL=['./','./index.html','./manifest.webmanifest','./assets/progress-io.js','./assets/cognitive.js','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE_NAME);
  await cache.addAll(SHELL);
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const names=await caches.keys();
  await Promise.all(names.filter(name=>name.startsWith(PREFIX)&&name!==CACHE_NAME).map(name=>caches.delete(name)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 if(request.mode==='navigate'){
  event.respondWith((async()=>{
   try{
    const response=await fetch(request);
    if(response.ok){
     const cache=await caches.open(CACHE_NAME);
     await cache.put(request,response.clone());
     await cache.put('./index.html',response.clone());
    }
    if(response.status>=500){const cached=await (await caches.open(CACHE_NAME)).match('./index.html');if(cached)return cached;}
    return response;
   }catch{
    const cache=await caches.open(CACHE_NAME);
    return (await cache.match(request,{ignoreSearch:true}))||(await cache.match('./index.html'))||Response.error();
   }
  })());
  return;
 }
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE_NAME);
  const cached=await cache.match(request,{ignoreSearch:true});
  if(cached)return cached;
  return fetch(request);
 })());
});
