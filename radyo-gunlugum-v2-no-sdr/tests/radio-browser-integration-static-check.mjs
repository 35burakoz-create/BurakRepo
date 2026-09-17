import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const client=read('app-station-streams.js');
const guide=read('app-guide-ui.js');
const css=read('app-guide.css');
const boot=read('app-bootstrap.js');
const sw=read('sw.js');
const config=read('app-config.js');
const migration=read('sql/20260915_radio_browser_streams.sql');
const edge=read('supabase/functions/radio-browser/index.ts');
const checks=[];
function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}

let syntax=true;try{new vm.Script(client,{filename:'app-station-streams.js'})}catch{syntax=false}
check('station stream client syntax',syntax);
check('stream client loads after canonical station identity',boot.indexOf("'app-station-intelligence.js'")<boot.indexOf("'app-station-streams.js'"));
check('stream client loads before guide data and UI consumers',boot.indexOf("'app-station-streams.js'")<boot.indexOf("'app-current-programs.js'")&&boot.indexOf("'app-station-streams.js'")<boot.indexOf("'app-guide-ui.js'"));
check('PWA caches station stream client',sw.includes("'./app-station-streams.js'"));
check('Radio Browser integration has a fresh PWA generation',config.includes("cacheVersion:'v385-core-boundary-radio-intelligence-20260915-52'"));
check('stream cache schema is canonical-station keyed',migration.includes('create table if not exists public.station_streams')&&migration.includes('canonical_station_id uuid not null references public.canonical_stations'));
check('stream cache keeps provider station UUID identity unique',migration.includes('unique (provider, provider_station_id)'));
check('stream cache is authenticated read-only from browser',migration.includes('revoke all on public.station_streams from anon, authenticated')&&migration.includes('grant select on public.station_streams to authenticated')&&migration.includes('enable row level security'));
check('stream cache stores match confidence and provider health',migration.includes('match_confidence')&&migration.includes('last_check_ok')&&migration.includes('last_verified_at'));
check('edge function uses descriptive Radio Browser user agent',edge.includes("RadyoGunlugum/3.8.5 (station-reference)"));
check('edge function discovers mirrors with fallbacks',edge.includes('all.api.radio-browser.info/json/servers')&&edge.includes('FALLBACK_HOSTS'));
check('edge function searches exact names before broad fallback',edge.includes('/json/stations/bynameexact/')&&edge.includes('/json/stations/search?name='));
check('edge function excludes broken Radio Browser rows',edge.includes('hidebroken=true'));
check('edge function treats stationuuid as provider identity',edge.includes('stationuuid')&&edge.includes('provider_station_id'));
check('edge function requires high confidence and score margin before auto-cache',edge.includes('Number(best._score)>=94')&&edge.includes('Number(best._score)-Number(second._score)>=5'));
check('edge function refuses cross-canonical provider UUID reassignment',edge.includes("String(existing[0].canonical_station_id)!==canonicalStationId"));
check('edge function calls Radio Browser click counter before playback',edge.includes('/json/url/${encodeURIComponent(stream.provider_station_id)}'));
check('edge function never exposes service key to the client module',edge.includes('SUPABASE_SERVICE_ROLE_KEY')&&!client.includes('SERVICE_ROLE'));
check('client uses authenticated Supabase function invocation',client.includes("R.S.functions.invoke(FUNCTION_NAME")&&client.includes("FUNCTION_NAME='radio-browser'"));
check('client pins resolve and play to the initiating account',client.includes("R.me?.id!==userId")&&client.includes('Hesap değiştiği için internet yayını işlemi durduruldu.'));
check('client refuses unsafe playback URL protocols',client.includes("u.protocol==='http:'||u.protocol==='https:'"));
check('client requires a non-empty absolute stream URL',client.includes("const raw=clean(value);if(!raw)return''")&&client.includes('new URL(raw)')&&!client.includes("new URL(clean(value),window.location?.href)"));
check('client caches positive and negative resolution separately',client.includes('POSITIVE_TTL')&&client.includes('NEGATIVE_TTL'));
check('guide only exposes internet action for canonical station identity',guide.includes('R.stationStreams?.canonicalId?.(x)')&&guide.includes('data-stream-open'));
check('guide labels online action distinctly from RF listening',guide.includes('İnternetten dinle')&&guide.includes('Radio Browser internet referansını aç'));
check('guide opens a synchronous blank tab before async lookup',guide.includes("window.open?.('about:blank','_blank')"));
check('guide reports stream lookup failures without pretending RF reception',guide.includes("guide-internet-stream")&&guide.includes('İnternet yayını açılamadı.'));
check('guide stream action has touch and mobile layout treatment',css.includes('.app-guide-stream-btn{min-height:44px}')&&css.includes('flex:1 1 100%'));

const stationId='11111111-1111-4111-8111-111111111111';
const streamId='22222222-2222-4222-8222-222222222222';
const providerId='33333333-3333-4333-8333-333333333333';
let invokeCalls=[];let opened=[];
const R={
  me:{id:'u1'},
  stationIntelligence:{canonicalId:v=>v?.canonical_station_id||null},
  S:{functions:{async invoke(name,{body}){invokeCalls.push({name,body});if(body.action==='click')return{data:{url:'https://stream.example/radio.mp3'},error:null};return{data:{stream:{id:streamId,canonical_station_id:stationId,provider_station_id:providerId,stream_name:'Test Radio',resolved_url:'https://stream.example/live',match_confidence:97,codec:'MP3',bitrate:128,last_check_ok:true},candidates:[],ambiguous:false,source:'radio-browser'},error:null}}}},
  events:{on(){},emit(){}},features:{register(){}},reportError(){}
};
const context={window:{R,location:{href:'https://app.example/'},open(url){const p={closed:false,opener:{},location:{href:url},close(){this.closed=true}};opened.push(p);return p}},URL,console,Map,Set,Promise,String,Array,Object,Number,Math,Date,setTimeout,clearTimeout};
vm.runInNewContext(client,context,{filename:'app-station-streams.js'});
const api=R.stationStreams;
check('functional stream API is exposed',!!api&&typeof api.resolve==='function'&&typeof api.play==='function');
check('functional canonical id accepts valid direct UUID',api.canonicalId({canonical_station_id:stationId})===stationId);
check('functional safe URL rejects empty value',api.safeUrl('')==='');
check('functional safe URL rejects whitespace-only value',api.safeUrl('   ')==='');
check('functional safe URL rejects relative root path',api.safeUrl('/stream/live')==='');
check('functional safe URL rejects relative path',api.safeUrl('stream/live')==='');
check('functional safe URL rejects javascript scheme',api.safeUrl('javascript:alert(1)')==='');
check('functional safe URL accepts HTTP stream compatibility',api.safeUrl('http://stream.example/live')==='http://stream.example/live');
check('functional safe URL accepts HTTPS stream',api.safeUrl('https://stream.example/live')==='https://stream.example/live');
check('functional stream normalization rejects missing URL',api.normalizeStream({id:streamId,canonical_station_id:stationId,provider_station_id:providerId,stream_name:'Eksik yayın'})===null);
check('functional stream normalization rejects relative URL',api.normalizeStream({id:streamId,canonical_station_id:stationId,provider_station_id:providerId,resolved_url:'/relative/live'})===null);
const first=await api.resolve({canonical_station_id:stationId});
const second=await api.resolve({canonical_station_id:stationId});
check('functional resolution normalizes verified stream',first.stream?.id===streamId&&first.stream?.providerStationId===providerId&&first.stream?.matchConfidence===97);
check('functional positive resolution is memoized',invokeCalls.filter(x=>x.body.action==='resolve').length===1&&second.stream?.id===streamId);
await api.play({canonical_station_id:stationId});
check('functional playback calls provider click action',invokeCalls.some(x=>x.body.action==='click'&&x.body.streamId===streamId));
check('functional playback opens returned HTTPS URL',opened.some(x=>x.location.href==='https://stream.example/radio.mp3'));
const before=invokeCalls.length;
const missing=await api.resolve({station:'Unknown'});
check('functional unresolved non-canonical station does not query edge function',missing.reason==='no-canonical-id'&&invokeCalls.length===before);

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} Radio Browser integration checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
