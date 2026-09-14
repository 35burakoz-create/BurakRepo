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
check('menu loads its dedicated stylesheet',menu.includes("l.href='app-menu.css'")&&menu.includes("data-menu-css"));
check('menu stylesheet injection tolerates reduced DOMs',menu.includes("typeof document.createElement!=='function'")&&menu.includes('document.head?.appendChild?.(l)')&&menu.includes("document.querySelector?.(s)||null"));
check('menu stylesheet is cached for installed PWA',sw.includes("'./app-menu.css'"));
check('menu triggers expose dialog expanded state',menu.includes("setAttribute('aria-haspopup','dialog')")&&menu.includes("setAttribute('aria-expanded',opened?'true':'false')")&&menu.includes("setAttribute('aria-controls','v38Sheet')"));
check('menu close clears trigger expanded state',menu.includes('function removeSheet()')&&menu.includes('menuTriggers(false)'));
check('menu preserves and restores opener focus',menu.includes('returnFocus=document.activeElement')&&menu.includes('if(restoreFocus&&target?.isConnected)target.focus?.()'));
check('menu marks current route in navigation rows',menu.includes("if(current)attrs.push('aria-current=\"page\"')")&&menu.includes("class=\"v38-menu-row${current?' is-current':''}\""));
check('menu opens the group containing the current route',menu.includes('function revealCurrentRoute')&&menu.includes("current.closest('.v38-menu-group')")&&menu.includes('group.open=true'));
check('menu keeps accordion behavior',menu.includes("group.addEventListener('toggle'")&&menu.includes('other.open=false'));
check('menu main surface has explicit visual group wrapper',menu.includes('class="v38-menu-groups"')&&menu.includes('v38-menu-group-title'));
check('menu theme row reports current mode',menu.includes("night?'Gece görünümü açık':'Açık görünüm açık'")&&menu.includes("pressed:night"));
check('theme action updates state without reopening menu',menu.includes("if(a==='theme')")&&menu.includes('syncThemeRow()'));
check('install row reflects standalone and install-ready states',menu.includes("state:installed?'Kurulu':ready?'Hazır':'İsteğe bağlı'")&&menu.includes('syncInstallRow'));
check('installed app disables redundant install action',menu.includes('disabled:install.installed')&&menu.includes('b.disabled=x.installed'));
check('favorites and reminders pin the initiating account',menu.includes('const userId=activeUserId(),token=lifecycle')&&menu.includes('activeUserId()!==userId'));
check('stale collection completion cannot reopen a closed menu',menu.includes("token!==lifecycle||!$('#v38Sheet')"));
check('collection views use account-owned rows only',menu.includes("filter(x=>x?.user_id===userId)"));
check('favorites avoid NaN frequency presentation',menu.includes("if(!Number.isFinite(n)||n<=0)return''")&&menu.includes('frequencyText(x)'));
check('reminder time renderer bounds hours and minutes',menu.includes('Number(m[1])<=23&&Number(m[2])<=59'));
check('subviews include a real back action',menu.includes("backAction:'back:favorites'")&&menu.includes("backAction:'back:reminders'"));
check('back action restores focus to originating menu row',menu.includes("focusAction:'favorites'")&&menu.includes("focusAction:'reminders'"));
check('empty favorites and reminders explain next action',menu.includes('Yayın rehberinden bir hedefi favorilere eklediğinde burada görünür.')&&menu.includes('Yayın rehberinden bir yayın saati için hatırlatıcı oluşturabilirsin.'));
check('reminder toggles are explicit buttons',menu.includes('<button type="button" class="v38-toggle'));
check('reminder toggles expose pressed state',menu.includes('aria-pressed="${enabled?\'true\':\'false\'}"')&&menu.includes("b.setAttribute('aria-pressed',applied?'true':'false')"));
check('reminder toggle labels include station context',menu.includes('hatırlatıcısını ${enabled?\'kapat\':\'aç\'}')&&menu.includes('hatırlatıcısını ${applied?\'kapat\':\'aç\'}'));
check('sync actions are coalesced per account',menu.includes('syncFlights=new Map()')&&menu.includes('if(syncFlights.has(userId))return syncFlights.get(userId)')&&menu.includes('syncFlights.set(userId,flight)'));
check('sync refuses false success without provider',menu.includes("typeof R.syncOutbox!=='function'")&&menu.includes('Senkronizasyon servisi hazır değil.'));
check('sync success reports actual synchronized count',menu.includes('`${synced} çevrimdışı kayıt bulutla eşitlendi.`'));
check('sync completion does not toast into another account',menu.includes('if(activeUserId()!==userId)return result'));
check('menu closes before external route transitions can leave stale overlay',menu.includes("R.events?.on?.('route:before'")&&menu.includes("close({restoreFocus:false})"));
check('menu closes account-sensitive UI on account changes',menu.includes('changedAccount')&&menu.includes("if(!x?.authenticated||changedAccount)close({restoreFocus:false})"));
check('menu delegated clicks reject non-Element targets',menu.includes('e.target instanceof Element?e.target:null'));
check('escape closes the active menu',menu.includes("e.key==='Escape'&&$('#v38Sheet')")&&menu.includes('e.preventDefault();close()'));
check('menu group stack avoids paired accordion whitespace',css.includes('#v38Sheet .v38-menu-groups{display:grid;grid-template-columns:1fr'));
check('desktop expanded menu rows use the available width',css.includes('html[data-ui-mode="desktop"] #v38Sheet .v38-menu-group[open] .v38-menu-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))'));
check('desktop menu is centered and fully rounded',css.includes('html[data-ui-mode="desktop"] #v38Sheet.v38-menu-sheet{top:50%;bottom:auto!important')&&css.includes('transform:translate(-50%,-50%)!important;border-radius:28px!important'));
check('mobile menu is a true edge-to-edge bottom sheet',css.includes('#v38Sheet.v38-menu-sheet{left:0!important;right:0!important;bottom:0!important;width:100%!important;max-height:94dvh!important;transform:none!important;border-radius:26px 26px 0 0!important'));
check('menu header stays reachable while content scrolls',css.includes('#v38Sheet.v38-menu-sheet .v38-sheethead{position:sticky;top:-16px'));
check('menu search has a strong readable action surface',css.includes('#v38Sheet .v42-menu-search{width:100%;min-height:64px')&&css.includes('#v38Sheet .v42-menu-search b{font-size:14px')&&css.includes('font-size:12px!important'));
check('menu row typography overrides older microcopy sizes',css.includes('#v38Sheet .v38-menu-row b{font-size:14px!important')&&css.includes('#v38Sheet .v38-menu-row small{display:block!important')&&css.includes('font-size:12px!important'));
check('menu current route receives a distinct visual state',css.includes('.v38-menu-row.is-current')&&css.includes('background:#eef2ff'));
check('menu header controls meet touch target sizing',css.includes('flex:0 0 44px;width:44px!important;height:44px!important'));
check('menu footer stays reachable while long menu scrolls',css.includes('position:sticky;bottom:0'));
check('menu logout is visually distinguished as destructive',css.includes('--menu-danger:#b42318')&&css.includes('border-color:#fecaca!important'));
check('menu reminder toggles meet touch target sizing',css.includes('min-width:78px;min-height:44px'));
check('desktop favorite and reminder cards use two columns',css.includes('html[data-ui-mode="desktop"] #v38Sheet .v38-mini-list{grid-template-columns:repeat(2,minmax(0,1fr))'));
check('disabled menu actions remove misleading chevron',css.includes('#v38Sheet .v38-menu-row:disabled .v38-menu-tail i{visibility:hidden}'));
check('menu has explicit focus-visible treatment',css.includes('#v38Sheet button:focus-visible,#v38Sheet summary:focus-visible'));
check('menu night mode covers sheet groups rows and subcards',css.includes('html.night #v38Sheet.v38-menu-sheet')&&css.includes('html.night #v38Sheet .v38-menu-row')&&css.includes('html.night #v38Sheet .v38-mini'));
check('menu night mode covers reminder toggle states',css.includes('html.night #v38Sheet .v38-toggle')&&css.includes('html.night #v38Sheet .v38-toggle.on'));
check('menu reduced-motion mode disables menu animation',css.includes('@media(prefers-reduced-motion:reduce)')&&css.includes('animation:none!important'));
check('menu release has a fresh PWA generation',config.includes("cacheVersion:'v385-core-boundary-radio-intelligence-20260914-48'"));

class FakeClassList{
  constructor(){this.values=new Set()}
  contains(x){return this.values.has(x)}
  add(x){this.values.add(x)}
  remove(x){this.values.delete(x)}
  toggle(x,force){if(force===true){this.values.add(x);return true}if(force===false){this.values.delete(x);return false}if(this.values.has(x)){this.values.delete(x);return false}this.values.add(x);return true}
}
const classBody=new FakeClassList(),classHtml=new FakeClassList();
const made=[];
const documentStub={
  querySelector:()=>null,
  querySelectorAll:()=>[],
  createElement(tag){const el={tagName:String(tag).toUpperCase(),dataset:{},classList:new FakeClassList(),style:{removeProperty(){}},setAttribute(){},removeAttribute(){},appendChild(){},append(){},focus(){},isConnected:true};made.push(el);return el},
  head:{appendChild(){}},body:{classList:classBody,append(){}},documentElement:{classList:classHtml},activeElement:null,addEventListener(){}
};
class HTMLElementStub{}
class ElementStub{}
const handlers={};let syncCalls=0,syncResolve;
const R={me:{id:'u1'},esc:v=>String(v??'').replace(/[&<>"']/g,''),router:{current:()=> 'log'},pwaInstall:{isStandalone:()=>false},installPrompt:null,events:{on(name,fn){(handlers[name]??=[]).push(fn)},emit(){}},features:{register(){}},toast(){},reportError(){},syncOutbox(){syncCalls++;return new Promise(r=>{syncResolve=r})}};
const context={window:{R},document:documentStub,HTMLElement:HTMLElementStub,Element:ElementStub,localStorage:{setItem(){},getItem(){return null}},console,queueMicrotask,Intl,Number,Map,Set,Promise,Error,String,Array,Object,Math,setTimeout,clearTimeout};
vm.runInNewContext(menu,context,{filename:'app-menu-ui.js'});
const api=R.menuUI;
check('functional menu exposes hardened helpers',!!api&&typeof api.frequencyText==='function'&&typeof api.syncNow==='function');
check('functional frequency formatter keeps valid SW value',api.frequencyText({frequency:9500,band:'SW5',unit:'kHz'})==='9.500 kHz');
check('functional frequency formatter rejects corrupt value',api.frequencyText({frequency:'NaN',band:'SW5',unit:'kHz'})==='');
check('functional frequency formatter rejects non-positive value',api.frequencyText({frequency:0,band:'MW',unit:'kHz'})==='');
check('functional reminder clock accepts 23:59',api.reminderTimeText('23:59')==='23:59');
check('functional reminder clock rejects 24:00 and bad minute',api.reminderTimeText('24:00')===''&&api.reminderTimeText('03:99')==='');
check('functional collection ownership excludes foreign and ownerless rows',api.ownedRows([{user_id:'u1'},{user_id:'u2'},{user_id:null}],'u1').length===1);
check('functional install state reports optional when not standalone',api.installState().installed===false&&api.installState().state==='İsteğe bağlı');
R.pwaInstall.isStandalone=()=>true;
check('functional install state reports installed app',api.installState().installed===true&&api.installState().state==='Kurulu');
R.pwaInstall.isStandalone=()=>false;
const p1=api.syncNow(null),p2=api.syncNow(null);
check('functional duplicate synchronization starts one provider call',syncCalls===1);
syncResolve({synced:2,pending:0});
await Promise.all([p1,p2]);
let syncResolve2;
R.syncOutbox=()=>{syncCalls++;return new Promise(r=>{syncResolve2=r})};
const p3=api.syncNow(null);
check('functional synchronization flight clears after completion',syncCalls===2);
syncResolve2({synced:0,pending:0});
await p3;
classBody.add('night-mode');
check('functional theme helper sees night mode',api.themeNight()===true);
classBody.remove('night-mode');
check('functional theme helper sees light mode',api.themeNight()===false);

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} menu-page hardening checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));