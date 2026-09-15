import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const client=read('app-transmitter-intelligence.js');
const css=read('app-transmitter-intelligence.css');
const boot=read('app-bootstrap.js');
const sw=read('sw.js');
const config=read('app-config.js');
const migration=read('sql/20260915_transmitter_site_intelligence.sql');
const edge=read('supabase/functions/transmitter-sites/index.ts');
const checks=[];
function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}

let syntax=true;try{new vm.Script(client,{filename:'app-transmitter-intelligence.js'})}catch{syntax=false}
check('transmitter intelligence client syntax',syntax);
check('transmitter intelligence loads before current-program consumers',boot.indexOf("'app-transmitter-intelligence.js'")>0&&boot.indexOf("'app-transmitter-intelligence.js'")<boot.indexOf("'app-current-programs.js'"));
check('PWA caches transmitter client and stylesheet',sw.includes("'./app-transmitter-intelligence.js'")&&sw.includes("'./app-transmitter-intelligence.css'"));
check('transmitter release has fresh PWA generation',config.includes("cacheVersion:'v385-core-boundary-radio-intelligence-20260915-52'"));

check('migration creates provider-keyed transmitter catalog',migration.includes('create table if not exists public.transmitter_sites')&&migration.includes('unique (provider, source_key)'));
check('transmitter catalog validates coordinate ranges',migration.includes('latitude between -90 and 90')&&migration.includes('longitude between -180 and 180'));
check('transmitter catalog is authenticated read-only in browser',migration.includes('revoke all on public.transmitter_sites from anon, authenticated')&&migration.includes('grant select on public.transmitter_sites to authenticated')&&migration.includes('enable row level security'));
check('only active transmitter rows are browser-readable',migration.includes('using (active = true)'));
check('station schedules have transmitter foreign key and index',migration.includes('station_schedules_transmitter_site_fkey')&&migration.includes('station_schedules_transmitter_site_idx'));
check('EiBi site key respects country-scoped and relay conventions',migration.includes("left(btrim(p_site_code), 1) = '/'")&&migration.includes("btrim(p_country) || '-' || btrim(p_site_code)"));
check('linker handles HFCC and EiBi separately',migration.includes("t.provider = 'HFCC'")&&migration.includes("t.provider = 'EiBi'")&&migration.includes('radio_eibi_transmitter_key(s.country, s.tx_site_code)'));
check('linker is service-role only',migration.includes('revoke all on function public.radio_link_transmitter_sites() from public, anon, authenticated')&&migration.includes('grant execute on function public.radio_link_transmitter_sites() to service_role'));
check('future schedule writes receive transmitter identity',migration.includes('radio_assign_schedule_transmitter_site')&&migration.includes('station_schedules_assign_transmitter_site'));
check('HFCC seed only accepts valid unique site coordinates',migration.includes("s.source = 'HFCC A26'")&&migration.includes('having count(distinct (round(s.latitude::numeric,5), round(s.longitude::numeric,5))) = 1'));
check('HFCC source provenance is retained',migration.includes('https://new.hfcc.org/data/a26/a26allx2.zip')&&migration.includes('frequency coordination transmitter site'));
check('database functions pin empty search path',migration.match(/set search_path = ''/g)?.length>=3);

check('edge function fetches official EiBi README',edge.includes("https://www.eibispace.de/dx/README.TXT")&&edge.includes("http://www.eibispace.de/dx/README.TXT"));
check('edge function identifies the official transmitter-site section',edge.includes("IV) Transmitter site codes."));
check('edge function decodes published legacy README charset',edge.includes("TextDecoder('windows-1252')"));
check('edge parser validates DMS coordinate ranges',edge.includes('parseDms')&&edge.includes('lat<-90||lat>90||lon<-180||lon>180'));
check('edge rejects suspiciously thin EiBi catalogs',edge.includes('rows.length<500'));
check('edge upserts sites in bounded batches',edge.includes('i+=200')&&edge.includes('rows.slice(i,i+200)'));
check('edge deactivates stale EiBi sites only after current upsert',edge.indexOf('await upsertRows(parsed.rows)')<edge.indexOf("provider=eq.EiBi&updated_at=lt."));
check('edge relinks schedules after successful EiBi refresh',edge.includes("rest('rpc/radio_link_transmitter_sites'"));
check('edge rate-limits normal and forced refreshes',edge.includes('NORMAL_TTL_MS=24*60*60*1000')&&edge.includes('FORCE_FLOOR_MS=15*60*1000'));
check('edge requires authenticated user in addition to verify_jwt deployment',edge.includes("payload?.role!=='authenticated'")&&edge.includes("HttpError('Bu işlem için oturum açmalısın.',401)"));
check('service role remains server-side only',edge.includes('SUPABASE_SERVICE_ROLE_KEY')&&!client.includes('SERVICE_ROLE'));

check('client loads site catalog in bounded pages with overflow probe',client.includes('PAGE_SIZE=1000,MAX_ROWS=5000')&&client.includes('.range(MAX_ROWS,MAX_ROWS)'));
check('client pins site loading and refresh to active account',client.includes('R.me?.id!==userId')&&client.includes("reason:'account-changed'"));
check('client refreshes official EiBi catalog through Supabase function',client.includes("FUNCTION_NAME='transmitter-sites'")&&client.includes('R.S.functions.invoke(FUNCTION_NAME'));
check('client resolves EiBi source-country site keys without mutating guide data',client.includes('function eibiKey(country,siteCode)')&&client.includes("siteCode.startsWith('/')")&&!client.includes('entry.raw.schedule.tx_site_name='));
check('client accepts inline HFCC coordinates before catalog lookup',client.includes('if(validCoords(lat,lon))return{id:null,provider:'));
check('client computes great-circle distance and initial bearing',client.includes('6371*2*Math.atan2')&&client.includes('Math.atan2(y,x)'));
check('client keeps separate origin-to-site and site-to-origin bearings',client.includes('bearingFromOrigin')&&client.includes('bearingToOrigin'));
check('HFCC zero azimuth is not treated as a hard north beam',client.includes("kind:'omni'")&&client.includes('çok yönlü / 0° kaydı'));
check('client labels aligned near side and away beam states',client.includes("difference<=30?'aligned':difference<=60?'near':difference>=120?'away':'side'"));
check('guide geography is decorated without rewriting guide renderer',client.includes("[data-guide-prefill]")&&client.includes('MutationObserver'));
check('logout clears account-scoped site catalog',client.includes("if(!x?.authenticated){clear();return}"));
check('visual layer covers night mode and beam meaning',css.includes('html.night .app-tx-geo')&&css.includes('.app-tx-beam.aligned')&&css.includes('.app-tx-beam.away'));
check('visual layer is mobile aware',css.includes('@media(max-width:560px)'));

class MutationObserverStub{constructor(fn){this.fn=fn}observe(){}disconnect(){}}
const document={querySelector(){return null},querySelectorAll(){return[]},createElement(){return{dataset:{},rel:'',href:'',className:'',innerHTML:'',appendChild(){},setAttribute(){}}},head:{appendChild(){} }};
const R={me:{id:'u1'},events:{on(){},emit(){}},features:{register(){}},reportError(){},listeningOrigin:()=>({name:'Test',lat:0,lon:0}),esc:v=>String(v??''),norm:v=>String(v??'').toLowerCase(),S:{from(){throw new Error('not expected in functional helpers')},functions:{async invoke(){return{data:{refreshed:false,count:0},error:null}}}}};
const context={window:{R},document,MutationObserver:MutationObserverStub,RADIO_APP_CONFIG:{origin:{name:'Test',lat:0,lon:0}},console,Intl,Number,String,Array,Object,Map,Set,Math,Date,Promise,setTimeout:()=>0,clearTimeout(){}};
vm.runInNewContext(client,context,{filename:'app-transmitter-intelligence.js'});
const api=R.transmitterIntelligence;
check('functional transmitter API is exposed',!!api&&typeof api.geometry==='function'&&typeof api.eibiKey==='function');
check('functional EiBi local site key includes source country',api.eibiKey('CHN','a')==='CHN-a');
check('functional EiBi relay key strips slash and keeps host country',api.eibiKey('G','/OMA-a')==='OMA-a');
check('functional invalid coordinate input is rejected',api.pathBetween({lat:100,lon:0},{lat:0,lon:0})===null);
const east=api.pathBetween({lat:0,lon:0},{lat:0,lon:1});
check('functional one-degree equatorial distance is approximately 111 km',east&&east.km>110&&east.km<112);
check('functional eastward initial bearing and Turkish cardinal are correct',east&&east.bearing>89&&east.bearing<91&&api.cardinal(east.bearing)==='D');
const same=api.pathBetween({lat:1,lon:1},{lat:1,lon:1});
check('functional same-point distance is zero',same&&same.km<0.001);
const entry={source_doc:'HFCC A26',country:'Test',raw:{schedule:{tx_site_code:'TST',tx_site_name:'Test Site',latitude:0,longitude:1,azimuth_deg:270}}};
const site=api.siteForEntry(entry),geo=api.geometry(entry,{name:'Origin',lat:0,lon:0});
check('functional inline HFCC site resolves without catalog row',site?.provider==='HFCC'&&site?.siteName==='Test Site');
check('functional geometry returns distance bearing and beam context',geo&&geo.distanceKm>110&&geo.distanceKm<112&&geo.direction==='D'&&geo.beam?.kind==='aligned');

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} transmitter-site intelligence checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
