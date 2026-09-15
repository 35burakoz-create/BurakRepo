import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL=Deno.env.get('SUPABASE_URL')||'';
const SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const USER_AGENT='RadyoGunlugum/3.8.5 (transmitter-site-reference)';
const SOURCE_URL='https://www.eibispace.de/dx/README.TXT';
const FALLBACK_URL='http://www.eibispace.de/dx/README.TXT';
const NORMAL_TTL_MS=24*60*60*1000;
const FORCE_FLOOR_MS=15*60*1000;
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};

type Json=Record<string,unknown>;
type SiteRow={provider:string,source_key:string,season:string|null,country_code:string,site_code:string|null,site_name:string,latitude:number,longitude:number,confidence:number,source_url:string,active:boolean,metadata:Record<string,unknown>,updated_at:string};
class HttpError extends Error{status:number;constructor(message:string,status=400){super(message);this.status=status}}

function reply(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...CORS,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}})}
function clean(v:unknown){return String(v??'').replace(/[\r\n\t]+/g,' ').replace(/\s+/g,' ').trim()}
function finite(v:unknown,min=-Infinity,max=Infinity){const n=Number(v);return Number.isFinite(n)&&n>=min&&n<=max?n:null}
function iso(v:unknown){const t=Date.parse(String(v??''));return Number.isFinite(t)?new Date(t).toISOString():null}
function uuidLike(v:unknown){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean(v))}
function jwtPayload(req:Request){try{const auth=req.headers.get('authorization')||'',token=auth.match(/^Bearer\s+(.+)$/i)?.[1]||'',part=token.split('.')[1];if(!part)return null;let b64=part.replace(/-/g,'+').replace(/_/g,'/');while(b64.length%4)b64+='=';return JSON.parse(atob(b64)) as Json}catch{return null}}
function requireAuthenticated(req:Request){const payload=jwtPayload(req);if(payload?.role!=='authenticated'||!uuidLike(payload?.sub))throw new HttpError('Bu işlem için oturum açmalısın.',401);return String(payload.sub)}

async function rest(path:string,init:RequestInit={}){
  if(!SUPABASE_URL||!SERVICE_KEY)throw new Error('Supabase hizmet anahtarı kullanılamıyor.');
  const r=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...init,headers:{apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`,'Content-Type':'application/json',...(init.headers||{})}});
  const text=await r.text();if(!r.ok)throw new Error(`Veritabanı isteği başarısız: ${r.status} ${text.slice(0,260)}`);return text?JSON.parse(text):null;
}

function parseDms(value:string){const m=value.match(/^(\d+)([NSEW])(\d+)(?:'(\d+)")?$/);if(!m)return null;let n=Number(m[1])+Number(m[3])/60+(m[4]?Number(m[4])/3600:0);if(m[2]==='S'||m[2]==='W')n=-n;return finite(n,-180,180)}
function seasonFromReadme(text:string){const m=text.match(/\b([AB]\d{2})\b/);return m?.[1]||null}
function stripSiteName(value:string){return value.replace(/\(.*?\)/g,' ').replace(/\b\d+\s*x?\s*\d*\s*kW\b/gi,' ').replace(/\s*"\d+"\s*$/,'').replace(/\s+/g,' ').replace(/^[,\s-]+|[,\s-]+$/g,'').trim()}
function parseSites(text:string){
  const marker='IV) Transmitter site codes.';const start=text.lastIndexOf(marker);if(start<0)throw new Error('EiBi README içinde verici sahası bölümü bulunamadı.');
  const season=seasonFromReadme(text),lines=text.slice(start+marker.length).split(/\r?\n/),sites:SiteRow[]=[];let country='';const importedAt=new Date().toISOString();
  for(const line of lines){
    let rest='';const head=line.match(/^\s{3}([A-Z]{1,3}):\s*(.*)$/);
    if(head){country=head[1];rest=head[2]}else if(/^\s{6,}\S/.test(line)&&country){rest=line.trim()}else continue;
    const coord=rest.match(/(\d+[NS]\d+(?:'\d+")?)\s*-\s*(\d+[EW]\d+(?:'\d+")?)/);if(!coord)continue;
    const lat=parseDms(coord[1]),lon=parseDms(coord[2]);if(lat==null||lon==null||lat<-90||lat>90||lon<-180||lon>180)continue;
    const prefix=rest.slice(0,coord.index).trim().replace(/,+$/,'').trim(),coded=prefix.match(/^([A-Za-z0-9]{1,2})-(.*)$/),suffix=coded?.[1]||'',name=stripSiteName(coded?.[2]||prefix);if(!name)continue;
    const sourceKey=suffix?`${country}-${suffix}`:country;if(!sourceKey)continue;
    sites.push({provider:'EiBi',source_key:sourceKey,season,country_code:country,site_code:suffix||null,site_name:name,latitude:Number(lat.toFixed(6)),longitude:Number(lon.toFixed(6)),confidence:99,source_url:SOURCE_URL,active:true,metadata:{source_label:'EiBi README transmitter site codes',coordinate_role:'published transmitter site',imported_at:importedAt},updated_at:importedAt});
  }
  const unique=new Map<string,SiteRow>();for(const row of sites)unique.set(row.source_key,row);const rows=[...unique.values()];if(rows.length<500)throw new Error(`EiBi verici sahası listesi beklenenden kısa (${rows.length}); veri uygulanmadı.`);return{rows,season,importedAt};
}

async function fetchReadme(){let last:unknown=null;for(const url of [SOURCE_URL,FALLBACK_URL]){const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),10000);try{const r=await fetch(url,{signal:ctl.signal,redirect:'follow',headers:{Accept:'text/plain,*/*;q=0.8','User-Agent':USER_AGENT}});if(!r.ok){last=new Error(`${url}: HTTP ${r.status}`);continue}const buf=await r.arrayBuffer();if(buf.byteLength<20_000)throw new Error('EiBi README yanıtı beklenenden kısa.');const text=new TextDecoder('windows-1252').decode(buf);return{text,url}}catch(error){last=error}finally{clearTimeout(timer)}}throw last instanceof Error?last:new Error('EiBi README indirilemedi.')}
async function lastRefresh(){const rows=await rest('transmitter_sites?provider=eq.EiBi&active=eq.true&select=updated_at&order=updated_at.desc&limit=1');return iso(rows?.[0]?.updated_at)}
async function counts(){const rows=await rest('transmitter_sites?provider=eq.EiBi&active=eq.true&select=id&limit=2000');return Array.isArray(rows)?rows.length:0}
async function upsertRows(rows:SiteRow[]){for(let i=0;i<rows.length;i+=200){await rest('transmitter_sites?on_conflict=provider,source_key',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rows.slice(i,i+200))})}}
async function refresh(force=false){
  const last=await lastRefresh(),age=last?Date.now()-Date.parse(last):Infinity,minAge=force?FORCE_FLOOR_MS:NORMAL_TTL_MS;if(age<minAge)return{refreshed:false,provider:'EiBi',count:await counts(),lastUpdatedAt:last,reason:'fresh'};
  const downloaded=await fetchReadme(),parsed=parseSites(downloaded.text);await upsertRows(parsed.rows);
  await rest(`transmitter_sites?provider=eq.EiBi&updated_at=lt.${encodeURIComponent(parsed.importedAt)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({active:false})});
  const linked=await rest('rpc/radio_link_transmitter_sites',{method:'POST',headers:{Prefer:'return=representation'},body:'{}'});
  return{refreshed:true,provider:'EiBi',season:parsed.season,count:parsed.rows.length,lastUpdatedAt:parsed.importedAt,source:downloaded.url,linked};
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:CORS});
  if(req.method!=='POST')return reply({error:'Yalnızca POST desteklenir.'},405);
  try{requireAuthenticated(req);const body=await req.json().catch(()=>({})) as Json;const action=clean(body.action)||'refresh';if(action==='status')return reply({provider:'EiBi',count:await counts(),lastUpdatedAt:await lastRefresh()});if(action==='refresh')return reply(await refresh(body.force===true));return reply({error:'Desteklenmeyen verici sahası işlemi.'},400)}catch(error){console.error('[transmitter-sites]',error);const status=error instanceof HttpError?error.status:502;return reply({error:error instanceof Error?error.message:'Verici sahası verisi yenilenemedi.'},status)}
});
