import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS'
};
const BASE='https://services.swpc.noaa.gov';
const USER_AGENT='RadyoGunlugum/3.8.5 (space-weather-reference)';
const CACHE_MS=5*60*1000;
let cached:{savedAt:number,payload:any}|null=null;

type Obj=Record<string,any>;

function response(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...CORS,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}})}
function finite(value:unknown,min=-Infinity,max=Infinity){const n=Number(value);return Number.isFinite(n)&&n>=min&&n<=max?n:null}
function int(value:unknown,min=0,max=1_000_000){const n=Number(value);return Number.isInteger(n)&&n>=min&&n<=max?n:null}
function utcIso(value:unknown){const raw=String(value??'').trim();if(!raw)return null;const withZone=/[zZ]|[+-]\d\d:?\d\d$/.test(raw)?raw:`${raw}Z`;const t=Date.parse(withZone);return Number.isFinite(t)?new Date(t).toISOString():null}
function scale(value:unknown,prefix:string){const n=finite(value,0,5);return n==null?null:{level:n,label:`${prefix}${n}`}}
async function json(path:string){const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),6000);try{const r=await fetch(`${BASE}${path}`,{signal:ctl.signal,headers:{Accept:'application/json','User-Agent':USER_AGENT}});if(!r.ok)throw new Error(`${path}: HTTP ${r.status}`);return await r.json()}finally{clearTimeout(timer)}}
function ageMinutes(iso:string|null,now=Date.now()){if(!iso)return null;const t=Date.parse(iso);return Number.isFinite(t)?Math.max(0,Math.round((now-t)/60000)):null}
function cleanForecast(rows:any[],now:number){const out=[];for(const row of rows||[]){const time=utcIso(row?.time_tag);const kp=finite(row?.kp??row?.Kp,0,9);if(!time||kp==null)continue;const t=Date.parse(time);if(t<now-6*3600000||t>now+96*3600000)continue;const kind=['observed','estimated','predicted'].includes(String(row?.observed))?String(row.observed):t<=now?'observed':'predicted';out.push({time,kp,kind,noaaScale:String(row?.noaa_scale||'').match(/^G[1-5]$/)?.[0]||null})}out.sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));return out}
function latestAtOrBefore(rows:any[],now:number){let best=null;for(const row of rows){const t=Date.parse(row.time);if(t<=now&&(!best||t>Date.parse(best.time)))best=row}return best}
function normalizeScales(raw:Obj,now:number){const current=raw?.['0']||{};const stamp=current.DateStamp&&current.TimeStamp?utcIso(`${current.DateStamp}T${current.TimeStamp}`):null;return{time:stamp,r:scale(current?.R?.Scale,'R'),s:scale(current?.S?.Scale,'S'),g:scale(current?.G?.Scale,'G'),text:{r:String(current?.R?.Text||''),s:String(current?.S?.Text||''),g:String(current?.G?.Text||'')},ageMinutes:ageMinutes(stamp,now)}}
function normalizeFlux(raw:any,now:number){const rows=Array.isArray(raw)?raw:[];let best=null;for(const row of rows){const time=utcIso(row?.time_tag),flux=finite(row?.flux,40,500);if(!time||flux==null)continue;if(!best||Date.parse(time)>Date.parse(best.time))best={time,flux}}return best?{...best,ageMinutes:ageMinutes(best.time,now)}:{time:null,flux:null,ageMinutes:null}}
async function build(){const now=Date.now();const[kpRaw,forecastRaw,scalesRaw,fluxRaw]=await Promise.all([
  json('/products/noaa-planetary-k-index.json'),
  json('/products/noaa-planetary-k-index-forecast.json'),
  json('/products/noaa-scales.json'),
  json('/products/summary/10cm-flux.json')
]);
const history=cleanForecast(Array.isArray(kpRaw)?kpRaw:[],now);const forecast=cleanForecast(Array.isArray(forecastRaw)?forecastRaw:[],now);const currentKp=latestAtOrBefore(forecast.length?forecast:history,now)||latestAtOrBefore(history,now);const scales=normalizeScales(scalesRaw||{},now);const flux=normalizeFlux(fluxRaw,now);const current={kp:currentKp?.kp??null,kpTime:currentKp?.time??null,kpKind:currentKp?.kind??null,kpAgeMinutes:currentKp?ageMinutes(currentKp.time,now):null,r:scales.r?.level??null,s:scales.s?.level??null,g:scales.g?.level??null,scalesTime:scales.time,scalesAgeMinutes:scales.ageMinutes,flux:flux.flux,fluxTime:flux.time,fluxAgeMinutes:flux.ageMinutes};const quality={kpFresh:current.kpAgeMinutes!=null&&current.kpAgeMinutes<=360,scalesFresh:current.scalesAgeMinutes!=null&&current.scalesAgeMinutes<=120,fluxFresh:current.fluxAgeMinutes!=null&&current.fluxAgeMinutes<=2160};quality['status']=quality.kpFresh&&quality.scalesFresh?'live':quality.kpFresh||quality.scalesFresh?'degraded':'stale';return{provider:'NOAA SWPC',generatedAt:new Date(now).toISOString(),current,quality,forecast:forecast.filter(x=>Date.parse(x.time)>now-30*60000).slice(0,32),history:history.slice(-16),sourceUrls:['/products/noaa-planetary-k-index.json','/products/noaa-planetary-k-index-forecast.json','/products/noaa-scales.json','/products/summary/10cm-flux.json']}}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:CORS});
  if(req.method!=='POST')return response({error:'Yalnızca POST desteklenir.'},405);
  try{const body=await req.json().catch(()=>({}));const force=body?.force===true;if(!force&&cached&&Date.now()-cached.savedAt<CACHE_MS)return response({...cached.payload,cache:'edge'});const payload=await build();cached={savedAt:Date.now(),payload};return response({...payload,cache:'fresh'})}catch(error){console.error('[space-weather]',error);if(cached)return response({...cached.payload,cache:'stale-edge',warning:error instanceof Error?error.message:'NOAA verisi yenilenemedi.'});return response({error:error instanceof Error?error.message:'NOAA uzay havası verisi alınamadı.'},502)}
});
