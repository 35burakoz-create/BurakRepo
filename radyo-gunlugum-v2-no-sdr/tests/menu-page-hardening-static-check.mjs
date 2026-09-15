import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const menu=read('app-menu-ui.js');
const css=read('app-menu.css');
const sw=read('sw.js');
const config=read('app-config.js');
const checks=[];
function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}

let syntax=true;try{new vm.Script(menu,{filename:'app-menu-ui.js'})}catch{syntax=false}
check('menu module syntax',syntax);
check('menu stylesheet is loaded',menu.includes("app-menu.css"));
check('menu stylesheet is cached',sw.includes("'./app-menu.css'"));
check('menu dialog trigger exposes aria state',menu.includes("aria-haspopup")&&menu.includes("aria-expanded")&&menu.includes("aria-controls"));
check('menu close clears trigger state',menu.includes('menuTriggers(false)'));
check('menu preserves opener focus',menu.includes('returnFocus=document.activeElement'));
check('menu restores opener focus',menu.includes('restoreFocus')&&menu.includes('target.focus'));
check('current route is announced',menu.includes('aria-current'));
check('current route group opens automatically',menu.includes('revealCurrentRoute')&&menu.includes('group.open=true'));
check('accordion closes sibling groups',menu.includes("addEventListener('toggle'")&&menu.includes('other.open=false'));
check('theme row reflects active mode',menu.includes('Gece görünümü açık')&&menu.includes('Açık görünüm açık'));
check('install state distinguishes installed and ready',menu.includes("'Kurulu'")&&menu.includes("'Hazır'")&&menu.includes("'İsteğe bağlı'"));
check('installed state disables duplicate install action',menu.includes('disabled:install.installed'));
check('collection loading pins account identity',menu.includes('activeUserId()!==userId'));
check('collection completion is lifecycle guarded',menu.includes('token!==lifecycle'));
check('collection rows are account owned',menu.includes("filter(x=>x?.user_id===userId)"));
check('frequency display rejects malformed values',menu.includes("Number.isFinite(n)")&&menu.includes("n<=0"));
check('reminder clock validates hour and minute',menu.includes('Number(m[1])<=23')&&menu.includes('Number(m[2])<=59'));
check('favorites subview has a back action',menu.includes("backAction:'back:favorites'"));
check('reminders subview has a back action',menu.includes("backAction:'back:reminders'"));
check('reminder controls expose pressed state',menu.includes('aria-pressed'));
check('sync flights are coalesced by account',menu.includes('syncFlights=new Map()')&&menu.includes('syncFlights.has(userId)'));
check('sync requires a real provider',menu.includes("typeof R.syncOutbox!=='function'"));
check('sync reports synchronized count',menu.includes('çevrimdışı kayıt bulutla eşitlendi'));
check('sync result is account gated',menu.includes('if(activeUserId()!==userId)return result'));
check('route transition closes stale menu overlay',menu.includes("route:before")&&menu.includes('restoreFocus:false'));
check('account transition closes account-sensitive menu',menu.includes('changedAccount'));
check('delegated menu click checks Element targets',menu.includes('e.target instanceof Element'));
check('Escape closes the active menu',menu.includes("e.key==='Escape'"));
check('menu stack uses explicit grid layout',css.includes('.v38-menu-groups')&&css.includes('display:grid'));
check('desktop expanded menu uses multiple columns',css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'));
check('desktop menu has centered modal treatment',css.includes('translate(-50%,-50%)'));
check('mobile menu uses bottom-sheet geometry',css.includes('max-height:94dvh')&&css.includes('border-radius:26px 26px 0 0'));
check('menu header stays sticky',css.includes('.v38-sheethead')&&css.includes('position:sticky'));
check('menu rows keep readable typography',css.includes('.v38-menu-row b')&&css.includes('font-size:14px'));
check('current route has a distinct visual state',css.includes('.v38-menu-row.is-current'));
check('menu header controls meet touch sizing',css.includes('44px'));
check('menu footer remains reachable',css.includes('bottom:0'));
check('reminder toggles meet touch sizing',css.includes('min-width:78px')&&css.includes('min-height:44px'));
check('disabled menu action hides misleading chevron',css.includes(':disabled .v38-menu-tail i'));
check('menu has focus-visible treatment',css.includes('focus-visible'));
check('night mode covers menu sheet and rows',css.includes('html.night #v38Sheet.v38-menu-sheet')&&css.includes('html.night #v38Sheet .v38-menu-row'));
check('reduced motion disables menu animation',css.includes('prefers-reduced-motion:reduce')&&css.includes('animation:none'));
check('menu release follows current PWA generation',config.includes("cacheVersion:'v385-core-boundary-radio-intelligence-20260915-51'"));

class FakeClassList{
  constructor(){this.values=new Set()}
  contains(x){return this.values.has(x)}
  add(x){this.values.add(x)}
  remove(x){this.values.delete(x)}
}
const bodyClasses=new FakeClassList();
const doc={
  querySelector(){return null},querySelectorAll(){return[]},
  createElement(tag){return{tagName:String(tag).toUpperCase(),dataset:{},classList:new FakeClassList(),style:{removeProperty(){}},setAttribute(){},removeAttribute(){},appendChild(){},append(){},focus(){},isConnected:true}},
  head:{appendChild(){}},body:{classList:bodyClasses,append(){}},documentElement:{classList:new FakeClassList()},activeElement:null,addEventListener(){}
};
class ElementStub{}
let syncCalls=0,resolveSync;
const R={
  me:{id:'u1'},router:{current:()=> 'log'},pwaInstall:{isStandalone:()=>false},installPrompt:null,
  events:{on(){},emit(){}},features:{register(){}},toast(){},reportError(){},
  syncOutbox(){syncCalls++;return new Promise(r=>{resolveSync=r})},esc:v=>String(v??'')
};
const context={window:{R},document:doc,HTMLElement:class{},Element:ElementStub,localStorage:{setItem(){},getItem(){return null}},console,queueMicrotask,Intl,Number,Map,Set,Promise,Error,String,Array,Object,Math,setTimeout,clearTimeout};
vm.runInNewContext(menu,context,{filename:'app-menu-ui.js'});
const api=R.menuUI;
check('functional menu API is available',!!api);
check('functional frequency formatter keeps valid SW value',api.frequencyText({frequency:9500,band:'SW5',unit:'kHz'})==='9.500 kHz');
check('functional frequency formatter rejects malformed value',api.frequencyText({frequency:'bad',band:'SW5',unit:'kHz'})==='');
check('functional frequency formatter rejects zero',api.frequencyText({frequency:0,band:'MW',unit:'kHz'})==='');
check('functional reminder clock accepts 23:59',api.reminderTimeText('23:59')==='23:59');
check('functional reminder clock rejects invalid values',api.reminderTimeText('24:00')===''&&api.reminderTimeText('03:99')==='');
check('functional collection ownership excludes foreign and ownerless rows',api.ownedRows([{user_id:'u1'},{user_id:'u2'},{user_id:null}],'u1').length===1);
check('functional install state reports optional',api.installState().installed===false&&api.installState().state==='İsteğe bağlı');
R.pwaInstall.isStandalone=()=>true;
check('functional install state reports installed',api.installState().installed===true&&api.installState().state==='Kurulu');
R.pwaInstall.isStandalone=()=>false;
const first=api.syncNow(null),second=api.syncNow(null);
check('functional duplicate synchronization starts one provider call',syncCalls===1);
resolveSync({synced:2,pending:0});
await Promise.all([first,second]);
bodyClasses.add('night-mode');
check('functional theme helper sees night mode',api.themeNight()===true);
bodyClasses.remove('night-mode');
check('functional theme helper sees light mode',api.themeNight()===false);

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} menu-page hardening checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
