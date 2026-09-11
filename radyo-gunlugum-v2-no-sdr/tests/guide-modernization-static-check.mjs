import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8'),exists=f=>fs.existsSync(path.join(root,f));
const checks=[];function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}
const index=read('index.html'),boot=read('app-bootstrap.js'),sw=read('sw.js'),service=read('app-guide-service.js'),ui=read('app-guide-ui.js'),current=read('app-current-programs.js'),listening=read('app-listening-service.js');
for(const f of ['app-guide-service.js','app-guide-ui.js']){let ok=true;try{new vm.Script(read(f),{filename:f})}catch{ok=false}check(`syntax ${f}`,ok)}
check('V21 direct loader removed',!index.includes('v21-guide.js'));
check('V21 cache removed',!sw.includes('v21-guide.js'));
check('V21 file removed',!exists('v21-guide.js'));
check('guide service booted',boot.includes("'app-guide-service.js'"));check('guide UI booted',boot.includes("'app-guide-ui.js'"));
check('guide service cached',sw.includes("'./app-guide-service.js'"));check('guide UI cached',sw.includes("'./app-guide-ui.js'")&&sw.includes("'./app-guide.css'"));
check('current programs still owns guide table loading',current.includes('guide_entries')&&current.includes('guide_time_rules')&&current.includes('guide_band_profiles'));
check('guide service UI-free',service.includes("provider:'app-guide-service'")&&service.includes('function scoreEntry')&&service.includes('function identify')&&service.includes('function entries')&&!service.includes('document.querySelector')&&!service.includes('innerHTML')&&!service.includes('R.switch=')&&!service.includes('R.load='));
check('guide UI owns prefill and rendering',ui.includes('R.prefillGuide=prefill')&&ui.includes('R.renderGuide=render')&&ui.includes("R.router?.register?.('guide'")&&ui.includes("provider:'app-guide-ui'"));
check('guide UI has identification flow',ui.includes('Bu yayın ne olabilir?')&&ui.includes('R.guideService?.identify?.')&&ui.includes('data-guide-prefill'));
check('guide UI no core wrappers',!ui.includes('R.switch=')&&!ui.includes('R.load=')&&!ui.includes('R.show=')&&!ui.includes('R.renderAll=')&&!ui.includes('MutationObserver'));
check('listening mystery can use guide score',listening.includes('R.scoreEntry?.(e)?.score'));
check('guide service defines compatibility score API',service.includes('R.scoreEntry=e=>scoreEntry(e)'));
check('service loads before listening',boot.indexOf("'app-guide-service.js'")<boot.indexOf("'app-listening-service.js'"));

check('station guide main filters are wired',ui.includes("['guideBand','guideFreq','guideSearch']")&&ui.includes("el.addEventListener('change'")&&ui.includes("el.addEventListener('input'"));
check('station identification honors live-only and source filters',ui.includes('activeOnly,source,date:')&&service.includes('activeOnly=false,source=')&&service.includes('sourceMatches(e,source)'));
check('station source selector is data-driven',ui.includes('function sourceOptions()')&&ui.includes('new Set(rows.map(x=>String(x.season')&&ui.includes('new Set(rows.map(x=>String(x.source_doc'));
check('station guide source matching supports any season',service.includes("String(e?.season||'')===s")&&!service.includes("source==='A26'"));
check('station identification collapses repeated candidate identities',service.includes('function uniqueStations(rows)')&&service.includes('return uniqueStations(rows).slice'));
check('station guide exposes progressive results instead of silent 150-row truncation',ui.includes('visibleLimit=150')&&ui.includes('data-guide-more')&&ui.includes('limit:visibleLimit+1'));
check('station guide cleans source labels for human display',ui.includes("TECSUN A26 kısa dalga rehberi")&&ui.includes("replaceAll('_',' ')"));

// Functional service checks for source/live filtering and candidate deduplication.
{
  const R={
    norm:v=>String(v??'').toLocaleLowerCase('tr-TR'),
    events:{emit(){}},features:{register(){}},logs:[],bandProfiles:[],
    clock:{today:()=> '2026-09-11',time:()=> '12:00',parts:()=>({date:'2026-09-11',hour:12,minute:0})},
    guideEntries:[
      {id:'a1',entry_type:'station_target',mode:'SW',band:'SW3',frequency:6000,station:'Test Radio',language_content:'English',source_doc:'EiBi A26',season:'A26',time_ranges:[[600,800]],probability_score:70},
      {id:'a2',entry_type:'station_target',mode:'SW',band:'SW3',frequency:6000,station:'Test Radio',language_content:'English',source_doc:'HFCC A26',season:'A26',time_ranges:[[600,800]],probability_score:65},
      {id:'b1',entry_type:'station_target',mode:'SW',band:'SW3',frequency:6010,station:'Night Radio',language_content:'English',source_doc:'HFCC A26',season:'A26',time_ranges:[[0,120]],probability_score:60},
      {id:'c1',entry_type:'station_target',mode:'SW',band:'SW3',frequency:6020,station:'Future Radio',language_content:'English',source_doc:'EiBi A27',season:'A27',time_ranges:[[600,800]],probability_score:55}
    ]
  };
  const sandbox={window:{R},globalThis:null,RADIO_APP_CONFIG:{timezone:'Europe/Istanbul',receiver:{bands:{SW3:{min:5950,max:6200}}}},Intl,Date,Math,Number,String,Array,Object,Map,Set,Promise,console};sandbox.globalThis=sandbox;
  vm.createContext(sandbox);vm.runInContext(service,sandbox,{filename:'app-guide-service.js'});
  check('functional source filter accepts season values',R.guideService.entries({source:'A27'}).length===1&&R.guideService.entries({source:'A27'})[0].id==='c1');
  check('functional source filter accepts exact source documents',R.guideService.identify({mode:'SW',band:'SW3',frequency:6000,source:'EiBi A26'}).length===1&&R.guideService.identify({mode:'SW',band:'SW3',frequency:6000,source:'EiBi A26'})[0].id==='a1');
  const deduped=R.guideService.identify({mode:'SW',band:'SW3',frequency:6000,source:'A26',limit:10});
  check('functional identify removes duplicate station/frequency/language candidates',deduped.filter(x=>x.station==='Test Radio').length===1);
  check('functional live-only filter excludes inactive nearby station',!R.guideService.identify({mode:'SW',band:'SW3',frequency:6010,source:'A26',activeOnly:true,limit:10}).some(x=>x.id==='b1'));
}

for(const [n,ok] of checks)console.log(`${ok?'✓':'✗'} ${n}`);const failed=checks.filter(x=>!x[1]);console.log(`\n${checks.length-failed.length}/${checks.length} guide-modernization checks passed.`);if(failed.length)console.error('Failed:',failed.map(x=>x[0]).join(', '));