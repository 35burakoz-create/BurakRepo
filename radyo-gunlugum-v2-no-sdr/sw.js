const CACHE='radyo-v322-20260904-1';
const LOCAL=['./','./index.html','./styles.css','./core.js','./audio-smart.js','./insights.js','./v21-guide.js','./v22-mobile.js','./v23-dashboard.js','./v24-achievements.js','./v25-smart-listening.js','./v26-radio-atlas.js','./v30-ai-radio-assistant.js','./v30-mobile-ai-hook.js','./v30-guide-accuracy-fix.js','./v31-simple-ui.js','./v32-modern-focus.js','./v33-stability-hotfix.js','./v34-current-programs.js','./manifest.webmanifest','./icon.svg'];
const EXTERNAL=['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2','https://unpkg.com/leaflet@1.9.4/dist/leaflet.js','https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'];
function injectModules(html){
 let out=html;
 if(!out.includes('data-v321-boot-guard')){
  const guard=`<script data-v321-boot-guard>(()=>{const original=document.head.appendChild.bind(document.head);document.head.appendChild=function(n){try{if(n&&n.tagName==='SCRIPT'&&String(n.src||'').includes('v21-guide.js')&&document.querySelector('script[src="v21-guide.js"],script[src="./v21-guide.js"]')){const fire=()=>{try{n.onload&&n.onload()}catch(e){console.error(e)}};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fire,{once:true});else setTimeout(fire,0);return n}}catch(e){}return original(n)}})();</script>`;
  out=out.replace('<script src="insights.js"></script>',guard+'<script src="insights.js"></script>');
 }
 if(!out.includes('v24-achievements.js'))out=out.replace('</body>','<script src="./v24-achievements.js"></script></body>');
 if(!out.includes('v25-smart-listening.js'))out=out.replace('</body>','<script src="./v25-smart-listening.js"></script></body>');
 if(!out.includes('v26-radio-atlas.js'))out=out.replace('</body>','<script src="./v26-radio-atlas.js"></script></body>');
 if(!out.includes('v30-ai-radio-assistant.js'))out=out.replace('</body>','<script src="./v30-ai-radio-assistant.js"></script></body>');
 if(!out.includes('v30-mobile-ai-hook.js'))out=out.replace('</body>','<script src="./v30-mobile-ai-hook.js"></script></body>');
 if(!out.includes('v30-guide-accuracy-fix.js'))out=out.replace('</body>','<script src="./v30-guide-accuracy-fix.js"></script></body>');
 if(!out.includes('v31-simple-ui.js'))out=out.replace('</body>','<script src="./v31-simple-ui.js"></script></body>');
 if(!out.includes('v32-modern-focus.js'))out=out.replace('</body>','<script src="./v32-modern-focus.js"></script></body>');
 if(!out.includes('v33-stability-hotfix.js'))out=out.replace('</body>','<script src="./v33-stability-hotfix.js"></script></body>');
 if(!out.includes('v34-current-programs.js'))out=out.replace('</body>','<script src="./v34-current-programs.js"></script></body>');
 return out
}
async function htmlResponse(r){const text=injectModules(await r.text()),headers=new Headers(r.headers);headers.delete('content-length');return new Response(text,{status:r.status,statusText:r.statusText,headers})}
self.addEventListener('install',event=>{event.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(LOCAL);await Promise.allSettled(EXTERNAL.map(u=>c.add(u)));self.skipWaiting()})())});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim();const clients=await self.clients.matchAll({type:'window'});for(const client of clients){try{await client.navigate(client.url)}catch{}}})())});
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.hostname.endsWith('supabase.co'))return;if(url.hostname.endsWith('huggingface.co')||url.hostname.endsWith('hf.co')||url.hostname.includes('xethub')||url.hostname.includes('hf-mirror'))return;if(req.mode==='navigate'){event.respondWith((async()=>{try{const r=await fetch(req,{cache:'no-store'});if(!r.ok)return r;const out=await htmlResponse(r);const c=await caches.open(CACHE);c.put('./index.html',out.clone());return out}catch{const cached=await caches.match('./index.html');return cached?htmlResponse(cached):Response.error()}})());return}event.respondWith((async()=>{const cached=await caches.match(req);const net=fetch(req).then(async r=>{if(r&&r.ok){const c=await caches.open(CACHE);c.put(req,r.clone())}return r}).catch(()=>null);return cached||await net||Response.error()})())});