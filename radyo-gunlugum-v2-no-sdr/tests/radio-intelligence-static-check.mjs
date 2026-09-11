import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),checks=[];function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}
const js=read('app-radio-intelligence.js'),ui=read('app-radio-intelligence-ui.js'),css=read('app-radio-intelligence.css'),boot=read('app-bootstrap.js'),sw=read('sw.js');
for(const[file,src]of[['app-radio-intelligence.js',js],['app-radio-intelligence-ui.js',ui]]){let ok=true;try{new vm.Script(src,{filename:file})}catch{ok=false}check(`syntax ${file}`,ok)}
check('intelligence service loads after atlas and guide services',boot.indexOf("'app-radio-intelligence.js'")>boot.indexOf("'app-atlas-service.js'")&&boot.indexOf("'app-radio-intelligence.js'")>boot.indexOf("'app-guide-service.js'"));
check('intelligence UI loads after home now guide and atlas UI',boot.indexOf("'app-radio-intelligence-ui.js'")>boot.indexOf("'app-home-ui.js'")&&boot.indexOf("'app-radio-intelligence-ui.js'")>boot.indexOf("'app-atlas-ui.js'"));
check('intelligence assets are cached',sw.includes("'./app-radio-intelligence.js'")&&sw.includes("'./app-radio-intelligence-ui.js'")&&sw.includes("'./app-radio-intelligence.css'"));
check('recommendation explains instead of presenting score as probability',js.includes('Bu skor bir duyulma olasılığı yüzdesi değildir')&&ui.includes('Neden bunu öneriyorum?'));
check('recommendation uses personal reception history',js.includes('kişisel kaydın var')&&js.includes('sc.history?.count'));
check('recommendation includes transmitter power path and target when known',js.includes("kind:'power'")&&js.includes("kind:'path'")&&js.includes("kind:'target'"));
check('season manager supports generic A and B seasons',js.includes("/^([AB])(\\d{2})$/")&&js.includes("/^[AB]\\d{2}$/"));
check('guide season source wrapper is generic rather than A26-only',js.includes('__seasonAwareEntries')&&js.includes("filter(x=>x.season===source)"));
check('season UI reports missing next-season data without inventing it',ui.includes('verisi henüz yüklenmedi')&&ui.includes('OTOMATİK YAYIN SEZONU'));
check('season comparison reports new removed and changed frequencies',js.includes('newRows')&&js.includes('removed')&&js.includes('changed'));
check('atlas routes require real schedule coordinates',js.includes('s.latitude')&&js.includes('s.longitude')&&js.includes('if(!s||!validCoords'));
check('atlas routes match personal logs to guide transmitter records',js.includes('bestTxMatch(log)')&&js.includes('for(const log of R.logs||[])'));
check('atlas route uses great circle points',js.includes('function greatCircle')&&ui.includes('L.polyline(r.path'));
check('atlas route exposes distance bearing power target and day night context',ui.includes('Azimut')&&ui.includes('Verici yönü')&&ui.includes('Hedef')&&ui.includes('Gündüz')===false&&js.includes('originPhase')&&js.includes('txPhase'));
check('atlas transmitter map clearly states actual transmitter sites',ui.includes('gerçek verici sahasına büyük daire yolunu gösterir'));
check('new intelligence UI has mobile and night styling',css.includes('@media(max-width:700px)')&&css.includes('html.night .app-rec-why')&&css.includes('.app-atlas-tx-map'));
{
 const R={guideEntries:[{season:'A26',entry_type:'station_target'}],features:{register(){}},events:{on(){}},norm:v=>String(v??'').toLocaleLowerCase('tr-TR'),atlas:{origin:()=>({coords:[38.151,27.36],label:'Bozköy'}),distance:()=>100,bearing:()=>90,direction:()=> 'D'},guideService:{entries:()=>[],scoreEntry:()=>({score:80,active:true,why:[],history:{count:0}})}};
 const sandbox={window:{R},Date,Math,Map,Set,String,Number,Object,Array,Intl,console};sandbox.window.window=sandbox.window;vm.createContext(sandbox);vm.runInContext(js,sandbox,{filename:'app-radio-intelligence.js'});const I=R.radioIntelligence;
 check('season boundary before A26 is B25',I.seasonFor(new Date('2026-03-28T12:00:00Z'))==='B25');
 check('A26 starts on last Sunday of March',I.seasonFor(new Date('2026-03-29T12:00:00Z'))==='A26');
 check('A26 remains active before last Sunday October',I.seasonFor(new Date('2026-10-24T12:00:00Z'))==='A26');
 check('B26 starts on last Sunday October',I.seasonFor(new Date('2026-10-25T12:00:00Z'))==='B26');
 check('January 2027 still belongs to B26',I.seasonFor(new Date('2027-01-10T12:00:00Z'))==='B26');
 const st=I.seasonStatus('2026-09-11');check('season status detects current A26 data and absent B26',st.expected==='A26'&&st.ready===true&&st.next==='B26'&&st.nextReady===false);
 const tx=I.txInfo({raw:{schedule:{latitude:52.3,longitude:-2.7,tx_site_name:'Woofferton',power_kw:100,target:'27SE'}}});check('transmitter info accepts valid real coordinates',tx?.site==='Woofferton'&&tx.coords[0]===52.3);
 check('transmitter info rejects missing coordinates',I.txInfo({raw:{schedule:{tx_site_name:'Unknown'}}})===null);
 const path=I.greatCircle([38.151,27.36],[52.3,-2.7]);check('great-circle route generates intermediate path',path.length>20&&path[0][0]===38.151);
}
for(const[name,ok]of checks)console.log(`${ok?'✓':'✗'} ${name}`);const failed=checks.filter(x=>!x[1]);console.log(`\n${checks.length-failed.length}/${checks.length} radio intelligence checks passed.`);if(failed.length)console.error('Failed:',failed.map(x=>x[0]).join(', '));
