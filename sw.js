/* Offline support: caches the app files so it opens without internet. Bump VERSION when you change any file. */
const VERSION='succulents-v3';
const SHELL=['./','index.html','styles.css','app.js','config.js','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','icon-maskable-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',e=>{
 const req=e.request;
 if(req.method!=='GET')return;
 const url=new URL(req.url);
 if(url.origin===location.origin){
  e.respondWith(caches.match(req,{ignoreSearch:true}).then(hit=>hit||fetch(req).then(res=>{const copy=res.clone();caches.open(VERSION).then(c=>c.put(req,copy));return res;}).catch(()=>req.mode==='navigate'?caches.match('index.html'):Response.error())));
 }else if(/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){
  e.respondWith(caches.open(VERSION).then(c=>c.match(req).then(hit=>hit||fetch(req).then(res=>{c.put(req,res.clone());return res;}).catch(()=>Response.error()))));
 }
});
