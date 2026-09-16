import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const BASE='https://services.swpc.noaa.gov';
const USER_AGENT='RadyoGunlugum/3.8.6 (space-weather-reference)';
const CACHE_MS=5*60*1000;
const MAX_SNAPSHOT_AGE_MS=6*60*60*1000;
const MAX_FUTURE_SKEW_MS=5*60*1000;
const SUPABASE_URL=Deno.env.get('SUPABASE_URL')||'';
const SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
let cached:{savedAt:number,payload:any}|null=null;

type Obj=Record<string,any>;
type ForecastRow={time:string,kp:number,kind:'observed'|'estimated'|'predicted',noaaScale:string|null};
class HttpError extends Error{status:number;constructor(message:string,status=400){super(message);this.status=status}}

function response(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...CORS,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}})}
function finite(value:unknown,min=-Infinity,max=Infinity){const n=Number(value);return Number.isFinite(n)&&n>=min&&n<=max?n:null}
function utcIso(value:unknown){const raw=String(value??'').trim();if(!raw)return null;const withZone=/[zZ]|[+-]\d\d:?\d\d$/.test(raw)?raw:`${raw}Z`;const t=Date.parse(withZone);return Number.isFinite(t)?new Date(t).toISOString():null}
function scale(value:unknown,prefix:string){const n=finite(value,0,5);return n==null?null:{level:n,label:`${prefix}${n}`}}
function uuidLike(value:unknown){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value??'').trim())}
async function json(path:string){const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),6000);try{const r=await fetch(`${BASE}${path}`,{signal:ctl.signal,headers:{Accept:'application/json','User-Agent':USER_AGENT}});if(!r.ok)throw new Error(`${path}: HTTP ${r.status}`);return await r.json()}finally{clearTimeout(timer)}}
function ageMinutes(iso:string|null,now=Date.now()){if(!iso)return null;const t=Date.parse(iso);return Number.isFinite(t)?Math.max(0,Math.round((now-t)/60000)):null}
function cleanForecast(rows:any[],now:number):ForecastRow[]{const out:ForecastRow[]=[];for(const row of rows||[]){const time=utcIso(row?.time_tag);const kp=finite(row?.kp??row?.Kp,0,9);if(!time||kp==null)continue;const t=Date.parse(time);if(t<now-6*3600000||t>now+96*3600000)continue;const rawKind=String(row?.observed);const kind:ForecastRow['kind']=rawKind==='observed'||rawKind==='estimated'||rawKind==='predicted'?rawKind:t<=now?'observed':'predicted';out.push({time,kp,kind,noaaScale:String(row?.noaa_scale||'').match(/^G[1-5]$/)?.[0]||null})}out.sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));return out}
function latestAtOrBefore(rows:ForecastRow[],now:number){let best:ForecastRow|null=null;for(const row of rows){const t=Date.parse(row.time);if(t<=now&&(!best||t>Date.parse(best.time)))best=row}return best}
function normalizeScales(raw:Obj,now:number){const current=raw?.['0']||{};const stamp=current.DateStamp&&current.TimeStamp?utcIso(`${current.DateStamp}T${current.TimeStamp}`):null;return{time:stamp,r:scale(current?.R?.Scale,'R'),s:scale(current?.S?.Scale,'S'),g:scale(current?.G?.Scale,'G'),ageMinutes:ageMinutes(stamp,now)}}
function normalizeFlux(raw:any,now:number){const rows=Array.isArray(raw)?raw:[];let best:{time:string,flux:number}|null=null;for(const row of rows){const time=utcIso(row?.time_tag),flux=finite(row?.flux,40,500);if(!time||flux==null)continue;if(!best||Date.parse(time)>Date.parse(best.time))best={time,flux}}return best?{...best,ageMinutes:ageMinutes(best.time,now)}:{time:null,flux:null,ageMinutes:null}}
async function build(){const now=Date.now();const[kpRaw,forecastRaw,scalesRaw,fluxRaw]=await Promise.all([json('/products/noaa-planetary-k-index.json'),json('/products/noaa-planetary-k-index-forecast.json'),json('/products/noaa-scales.json'),json('/products/summary/10cm-flux.json')]);const history=cleanForecast(Array.isArray(kpRaw)?kpRaw:[],now);const forecast=cleanForecast(Array.isArray(forecastRaw)?forecastRaw:[],now);const currentKp=latestAtOrBefore(forecast.length?forecast:history,now)||latestAtOrBefore(history,now);const scales=normalizeScales(scalesRaw||{},now);const flux=normalizeFlux(fluxRaw,now);const current={kp:currentKp?.kp??null,kpTime:currentKp?.time??null,kpKind:currentKp?.kind??null,kpAgeMinutes:currentKp?ageMinutes(currentKp.time,now):null,r:scales.r?.level??null,s:scales.s?.level??null,g:scales.g?.level??null,scalesTime:scales.time,scalesAgeMinutes:scales.ageMinutes,flux:flux.flux,fluxTime:flux.time,fluxAgeMinutes:flux.ageMinutes};const kpFresh=current.kpAgeMinutes!=null&&current.kpAgeMinutes<=360,scalesFresh=current.scalesAgeMinutes!=null&&current.scalesAgeMinutes<=120,fluxFresh=current.fluxAgeMinutes!=null&&current.fluxAgeMinutes<=2160;const quality={kpFresh,scalesFresh,fluxFresh,status:kpFresh&&scalesFresh?'live':kpFresh||scalesFresh?'degraded':'stale'};return{provider:'NOAA SWPC',generatedAt:new Date(now).toISOString(),current,quality,forecast:forecast.filter(x=>Date.parse(x.time)>now-30*60000).slice(0,32),history:history.slice(-16),sourceUrls:['/products/noaa-planetary-k-index.json','/products/noaa-planetary-k-index-forecast.json','/products/noaa-scales.json','/products/summary/10cm-flux.json']}}
async function payload(force=false){if(!force&&cached&&Date.now()-cached.savedAt<CACHE_MS)return{...cached.payload,cache:'edge'};const p=await build();cached={savedAt:Date.now(),payload:p};return{...p,cache:'fresh'}}
async function requireUser(req:Request){if(!SUPABASE_URL||!SERVICE_KEY)throw new HttpError('Supabase auth configuration unavailable',500);const auth=req.headers.get('authorization')||'';if(!/^Bearer\s+\S+/i.test(auth))throw new HttpError('Authentication required',401);const r=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{apikey:SERVICE_KEY,Authorization:auth}});if(!r.ok)throw new HttpError('Authentication required',401);const u=await r.json();if(!uuidLike(u?.id))throw new HttpError('Authentication required',401);return String(u.id)}
async function ownedRow(table:string,id:string,userId:string,select:string){if(!uuidLike(id))throw new HttpError('Invalid record id',400);const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}&select=${encodeURIComponent(select)}&limit=1`,{headers:{apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`}});const text=await r.text();if(!r.ok)throw new HttpError(`Snapshot lookup failed: ${r.status}`,502);const rows=text?JSON.parse(text):[];if(!Array.isArray(rows)||rows.length!==1)throw new HttpError('Owned record not found',404);return rows[0]}
async function patchOwned(table:string,id:string,userId:string,body:Record<string,unknown>){const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}`,{method:'PATCH',headers:{apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(body)});const text=await r.text();if(!r.ok)throw new HttpError(`Snapshot write failed: ${r.status}`,502);const rows=text?JSON.parse(text):[];if(!Array.isArray(rows)||rows.length!==1)throw new HttpError('Owned record not found',404)}
function observedAtMs(value:unknown){const t=Date.parse(String(value??''));return Number.isFinite(t)?t:null}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:CORS});
  if(req.method!=='POST')return response({error:'Yalnızca POST desteklenir.'},405);
  try{
    const userId=await requireUser(req);
    const body=await req.json().catch(()=>({}));
    const force=body?.force===true;
    const action=String(body?.action||'current');

    if(action==='snapshot'){
      let table='',id='',row:any=null,observedMs:number|null=null;
      if(body?.logId){
        table='radio_logs';id=String(body.logId);
        row=await ownedRow(table,id,userId,'id,observed_at_utc,space_weather_observed_at,space_weather_kp,solar_flux_f107');
        observedMs=observedAtMs(row?.observed_at_utc);
      }else if(body?.attemptId){
        table='radio_session_attempts';id=String(body.attemptId);
        row=await ownedRow(table,id,userId,'id,attempted_at,space_weather_observed_at,space_weather_kp,solar_flux_f107');
        observedMs=observedAtMs(row?.attempted_at);
      }else throw new HttpError('snapshot requires logId or attemptId',400);

      if(row?.space_weather_observed_at){
        return response({provider:'NOAA SWPC',snapshot:{written:0,reason:'already_snapshotted',kp:row?.space_weather_kp??null,f107:row?.solar_flux_f107??null,observedAt:row.space_weather_observed_at}});
      }
      if(observedMs==null)throw new HttpError('Observation time is unavailable',409);
      const now=Date.now();
      if(observedMs>now+MAX_FUTURE_SKEW_MS)throw new HttpError('Future observation: current space-weather snapshot was not written.',409);
      const ageMs=now-observedMs;
      if(ageMs>MAX_SNAPSHOT_AGE_MS)throw new HttpError('Historical observation: current space-weather snapshot was not written.',409);

      const p=await payload(force);
      const kp=p?.quality?.kpFresh===true?finite(p?.current?.kp,0,9):null;
      const f107=p?.quality?.fluxFresh===true?finite(p?.current?.flux,40,500):null;
      if(kp==null&&f107==null)throw new HttpError('Fresh NOAA Kp/F10.7 data is unavailable; snapshot was not written.',503);
      const observedAt=utcIso(p?.generatedAt)||new Date().toISOString();
      await patchOwned(table,id,userId,{space_weather_kp:kp,solar_flux_f107:f107,space_weather_observed_at:observedAt});
      return response({...p,snapshot:{written:1,kp,f107,observedAt,observationAgeMinutes:Math.round(ageMs/60000)}});
    }

    if(action!=='current')return response({error:'Desteklenmeyen uzay havası işlemi.'},400);
    return response(await payload(force));
  }catch(error){
    console.error('[space-weather]',error);
    if(cached&&!(error instanceof HttpError))return response({...cached.payload,cache:'stale-edge',warning:error instanceof Error?error.message:'NOAA verisi yenilenemedi.'});
    const status=error instanceof HttpError?error.status:502;
    return response({error:error instanceof Error?error.message:'NOAA uzay havası verisi alınamadı.'},status);
  }
});