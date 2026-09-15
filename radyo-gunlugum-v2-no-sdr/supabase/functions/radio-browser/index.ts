import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL=Deno.env.get('SUPABASE_URL')||'';
const SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const USER_AGENT='RadyoGunlugum/3.8.5 (station-reference)';
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const FALLBACK_HOSTS=['de1.api.radio-browser.info','nl1.api.radio-browser.info','at1.api.radio-browser.info'];
let mirrorCache:{until:number,hosts:string[]}={until:0,hosts:[]};

type Json=Record<string,unknown>;

function reply(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...CORS,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}})}
function clean(value:unknown){return String(value??'').replace(/[\r\n\t]+/g,' ').replace(/\s+/g,' ').trim()}
function key(value:unknown){const v=clean(value).toLowerCase();try{return v.replace(/[^\p{L}\p{N}]+/gu,'')}catch{return v.replace(/[^a-z0-9]+/g,'')}}
function safeUrl(value:unknown){try{const u=new URL(clean(value));return u.protocol==='http:'||u.protocol==='https:'?u.toString():''}catch{return''}}
function intOrNull(value:unknown,min=0,max=1_000_000){const n=Number(value);return Number.isInteger(n)&&n>=min&&n<=max?n:null}
function boolOrNull(value:unknown){if(value===true||value===1||value==='1'||value==='true')return true;if(value===false||value===0||value==='0'||value==='false')return false;return null}
function isoOrNull(value:unknown){const s=clean(value);if(!s)return null;const n=Date.parse(s);return Number.isFinite(n)?new Date(n).toISOString():null}
function uuidLike(value:unknown){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean(value))}

async function rest(path:string,init:RequestInit={}){
  if(!SUPABASE_URL||!SERVICE_KEY)throw new Error('Supabase hizmet anahtarı kullanılamıyor.');
  const response=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...init,headers:{apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`,'Content-Type':'application/json',...(init.headers||{})}});
  const text=await response.text();
  if(!response.ok)throw new Error(`Veritabanı isteği başarısız: ${response.status} ${text.slice(0,240)}`);
  return text?JSON.parse(text):null;
}

async function mirrors(){
  if(mirrorCache.until>Date.now()&&mirrorCache.hosts.length)return mirrorCache.hosts;
  let hosts:string[]=[];
  try{
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),3500);
    const response=await fetch('https://all.api.radio-browser.info/json/servers',{signal:controller.signal,headers:{'User-Agent':USER_AGENT,Accept:'application/json'}});clearTimeout(timer);
    if(response.ok){const rows=await response.json();hosts=[...new Set((Array.isArray(rows)?rows:[]).map((x:any)=>clean(x?.name)).filter((x:string)=>/^[a-z0-9.-]+\.api\.radio-browser\.info$/i.test(x)))]}
  }catch{/* fall through */}
  hosts=[...new Set([...hosts,...FALLBACK_HOSTS])].slice(0,8);
  mirrorCache={hosts,until:Date.now()+10*60*1000};return hosts;
}

async function rb(path:string){
  let lastError:unknown=null;
  for(const host of await mirrors()){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),5500);
    try{
      const response=await fetch(`https://${host}${path}`,{signal:controller.signal,headers:{'User-Agent':USER_AGENT,Accept:'application/json','Content-Type':'application/json; charset=utf-8'}});
      if(!response.ok){lastError=new Error(`${host}: HTTP ${response.status}`);continue}
      return await response.json();
    }catch(error){lastError=error}finally{clearTimeout(timer)}
  }
  throw lastError instanceof Error?lastError:new Error('Radio Browser sunucularına ulaşılamadı.');
}

async function stationContext(canonicalStationId:string){
  const stationRows=await rest(`canonical_stations?id=eq.${encodeURIComponent(canonicalStationId)}&status=eq.active&select=id,canonical_name,normalized_name,metadata&limit=1`);
  const station=stationRows?.[0];if(!station)throw new Error('Kanonik istasyon bulunamadı.');
  const [aliasRows,sourceRows]=await Promise.all([
    rest(`station_aliases?canonical_station_id=eq.${encodeURIComponent(canonicalStationId)}&select=alias,normalized_alias,confidence&order=confidence.desc&limit=8`),
    rest(`station_source_links?canonical_station_id=eq.${encodeURIComponent(canonicalStationId)}&select=source_country&limit=40`)
  ]);
  const names=[{name:clean(station.canonical_name),method:'canonical_exact',base:80},...(aliasRows||[]).map((x:any)=>({name:clean(x.alias),method:'alias_exact',base:76}))].filter(x=>x.name);
  const seen=new Set<string>();const uniqueNames=names.filter(x=>{const k=key(x.name);if(!k||seen.has(k))return false;seen.add(k);return true}).slice(0,7);
  const countryHints=[...new Set((sourceRows||[]).map((x:any)=>clean(x.source_country)).filter(Boolean))];
  return{station,names:uniqueNames,countryHints};
}

function countryBonus(row:any,hints:string[]){
  if(!hints.length)return 0;const code=clean(row?.countrycode).toUpperCase(),countryKey=key(row?.country);
  for(const hint of hints){const h=clean(hint);if(h.length===2&&code&&h.toUpperCase()===code)return 6;if(countryKey&&key(h)===countryKey)return 6}
  return 0;
}

function publicCandidate(row:any){return{
  provider:'radio-browser',providerStationId:clean(row.stationuuid),name:clean(row.name),url:safeUrl(row.url),resolvedUrl:safeUrl(row.url_resolved),homepage:safeUrl(row.homepage),favicon:safeUrl(row.favicon),countryCode:clean(row.countrycode).toUpperCase().slice(0,2),country:clean(row.country),language:clean(row.language),tags:clean(row.tags),codec:clean(row.codec),bitrate:intOrNull(row.bitrate,0,10000),hls:boolOrNull(row.hls),lastCheckOk:boolOrNull(row.lastcheckok),votes:intOrNull(row.votes),clickCount:intOrNull(row.clickcount),lastCheckedAt:isoOrNull(row.lastchecktime_iso8601||row.lastchecktime),matchConfidence:Number(row._score)||0,matchMethod:clean(row._method),matchQuery:clean(row._query)
}}

async function searchCandidates(canonicalStationId:string){
  const ctx=await stationContext(canonicalStationId);const byUuid=new Map<string,any>();
  for(const q of ctx.names){
    const rows=await rb(`/json/stations/bynameexact/${encodeURIComponent(q.name)}?hidebroken=true&order=votes&reverse=true&limit=20`);
    const list=(Array.isArray(rows)?rows:[]).filter((x:any)=>uuidLike(x?.stationuuid)&&safeUrl(x?.url_resolved||x?.url));
    const unique=list.length===1;
    for(const row of list){
      const exact=key(row.name)===key(q.name);let score=q.base+(exact?8:0)+(unique?8:0)+(boolOrNull(row.lastcheckok)===true?2:0)+countryBonus(row,ctx.countryHints)+(Number(row.votes)>50?1:0);
      score=Math.max(0,Math.min(99,score));const candidate={...row,_score:score,_method:q.method,_query:q.name};const id=clean(row.stationuuid),prior=byUuid.get(id);if(!prior||Number(candidate._score)>Number(prior._score))byUuid.set(id,candidate);
    }
  }
  if(!byUuid.size){
    const name=clean(ctx.station.canonical_name);const rows=await rb(`/json/stations/search?name=${encodeURIComponent(name)}&hidebroken=true&order=votes&reverse=true&limit=20`);
    for(const row of (Array.isArray(rows)?rows:[])){
      if(!uuidLike(row?.stationuuid)||!safeUrl(row?.url_resolved||row?.url))continue;const rk=key(row.name),nk=key(name);const contains=!!rk&&!!nk&&(rk.includes(nk)||nk.includes(rk));let score=contains?72:55;score+=boolOrNull(row.lastcheckok)===true?2:0;score+=countryBonus(row,ctx.countryHints);const candidate={...row,_score:Math.min(89,score),_method:'name_search',_query:name};const id=clean(row.stationuuid),prior=byUuid.get(id);if(!prior||Number(candidate._score)>Number(prior._score))byUuid.set(id,candidate)
    }
  }
  const ranked=[...byUuid.values()].sort((a,b)=>Number(b._score)-Number(a._score)||Number(b.votes||0)-Number(a.votes||0)).slice(0,8);
  const best=ranked[0]||null,second=ranked[1]||null;const unambiguous=!!best&&Number(best._score)>=94&&(!second||Number(best._score)-Number(second._score)>=5);
  return{ctx,ranked,best,unambiguous};
}

async function cached(canonicalStationId:string){
  const rows=await rest(`station_streams?canonical_station_id=eq.${encodeURIComponent(canonicalStationId)}&provider=eq.radio-browser&status=eq.active&select=id,canonical_station_id,provider,provider_station_id,stream_name,stream_url,resolved_url,homepage,favicon,country_code,country_name,language,tags,codec,bitrate,is_hls,last_check_ok,provider_votes,provider_click_count,local_play_count,match_confidence,match_method,last_checked_at,last_verified_at,last_played_at,updated_at&order=match_confidence.desc,updated_at.desc&limit=6`);
  return rows||[];
}

async function cacheBest(canonicalStationId:string,row:any){
  const providerId=clean(row.stationuuid);if(!uuidLike(providerId))return{cached:false,conflict:false};
  const existing=await rest(`station_streams?provider=eq.radio-browser&provider_station_id=eq.${encodeURIComponent(providerId)}&select=id,canonical_station_id&limit=1`);
  if(existing?.[0]&&String(existing[0].canonical_station_id)!==canonicalStationId)return{cached:false,conflict:true};
  const body={canonical_station_id:canonicalStationId,provider:'radio-browser',provider_station_id:providerId,stream_name:clean(row.name).slice(0,240),stream_url:safeUrl(row.url)||null,resolved_url:safeUrl(row.url_resolved)||null,homepage:safeUrl(row.homepage)||null,favicon:safeUrl(row.favicon)||null,country_code:/^[A-Z]{2}$/.test(clean(row.countrycode).toUpperCase())?clean(row.countrycode).toUpperCase():null,country_name:clean(row.country).slice(0,160)||null,language:clean(row.language).slice(0,240)||null,tags:clean(row.tags).slice(0,1200)||null,codec:clean(row.codec).slice(0,80)||null,bitrate:intOrNull(row.bitrate,0,10000),is_hls:boolOrNull(row.hls),last_check_ok:boolOrNull(row.lastcheckok),provider_votes:intOrNull(row.votes),provider_click_count:intOrNull(row.clickcount),match_confidence:Math.max(0,Math.min(100,Number(row._score)||0)),match_method:clean(row._method)||'name_search',status:'active',provider_payload:{changeuuid:clean(row.changeuuid),serveruuid:clean(row.serveruuid),iso_3166_2:clean(row.iso_3166_2),state:clean(row.state),languagecodes:clean(row.languagecodes)},last_checked_at:isoOrNull(row.lastchecktime_iso8601||row.lastchecktime),last_verified_at:new Date().toISOString()};
  const saved=await rest('station_streams?on_conflict=provider,provider_station_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(body)});
  return{cached:true,conflict:false,row:saved?.[0]||null};
}

async function resolveStream(canonicalStationId:string,force=false){
  if(!uuidLike(canonicalStationId))throw new Error('Geçersiz kanonik istasyon kimliği.');
  if(!force){const rows=await cached(canonicalStationId);if(rows.length)return{stream:rows[0],candidates:[],source:'cache',ambiguous:false}}
  const found=await searchCandidates(canonicalStationId);let saved:any=null,conflict=false;
  if(found.unambiguous&&found.best){const result=await cacheBest(canonicalStationId,found.best);saved=result.row||null;conflict=result.conflict}
  if(saved)return{stream:saved,candidates:found.ranked.map(publicCandidate),source:'radio-browser',ambiguous:false};
  return{stream:null,candidates:found.ranked.map(publicCandidate),source:'radio-browser',ambiguous:found.ranked.length>0,conflict};
}

async function clickStream(streamId:string){
  if(!uuidLike(streamId))throw new Error('Geçersiz yayın kimliği.');
  const rows=await rest(`station_streams?id=eq.${encodeURIComponent(streamId)}&provider=eq.radio-browser&status=eq.active&select=id,provider_station_id,resolved_url,stream_url,local_play_count&limit=1`);const stream=rows?.[0];if(!stream)throw new Error('İnternet yayını bulunamadı.');
  const result=await rb(`/json/url/${encodeURIComponent(stream.provider_station_id)}`);const url=safeUrl(result?.url)||safeUrl(stream.resolved_url)||safeUrl(stream.stream_url);if(!url)throw new Error('Radio Browser geçerli bir yayın adresi döndürmedi.');
  const count=Math.min(2_147_483_647,Math.max(0,Number(stream.local_play_count)||0)+1);
  await rest(`station_streams?id=eq.${encodeURIComponent(streamId)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({local_play_count:count,last_played_at:new Date().toISOString()})});
  return{url,providerStationId:stream.provider_station_id};
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:CORS});
  if(req.method!=='POST')return reply({error:'Yalnızca POST desteklenir.'},405);
  try{
    const body=await req.json().catch(()=>({})) as Json;const action=clean(body.action)||'resolve';
    if(action==='resolve'||action==='refresh')return reply(await resolveStream(clean(body.canonicalStationId),action==='refresh'||body.force===true));
    if(action==='click')return reply(await clickStream(clean(body.streamId)));
    return reply({error:'Desteklenmeyen Radio Browser işlemi.'},400);
  }catch(error){console.error('[radio-browser]',error);return reply({error:error instanceof Error?error.message:'Radio Browser işlemi başarısız.'},502)}
});
