(()=>{
const R=window.R;if(!R||R.__uiMode386)return;R.__uiMode386=true;
let state=null;
const mq=q=>{try{return window.matchMedia(q)}catch{return{matches:false,addEventListener(){}}}};
const standaloneMQ=mq('(display-mode: standalone)'),coarseMQ=mq('(pointer: coarse)'),fineMQ=mq('(pointer: fine)');
function shortSide(){const s=window.screen||{},vals=[Number(s.width),Number(s.height)].filter(x=>Number.isFinite(x)&&x>0);return vals.length?Math.min(...vals):Math.min(window.innerWidth||1280,window.innerHeight||720)}
function detect(){const uaMobile=navigator.userAgentData?.mobile===true,coarse=!!coarseMQ.matches,fine=!!fineMQ.matches,touch=Number(navigator.maxTouchPoints||0),standalone=!!standaloneMQ.matches||navigator.standalone===true,compactTouch=!fine&&coarse&&touch>0&&shortSide()<=1100,mobileHardware=uaMobile||compactTouch;return Object.freeze({mode:mobileHardware?'mobile':'desktop',context:standalone?'app':'browser',mobileHardware,standalone,coarse,fine,touch,shortSide:shortSide()})}
function apply(){const next=detect(),changed=!state||state.mode!==next.mode||state.context!==next.context||state.coarse!==next.coarse||state.fine!==next.fine;state=next;const root=document.documentElement;root.dataset.uiMode=next.mode;root.dataset.uiContext=next.context;root.classList.toggle('app-ui-mobile',next.mode==='mobile');root.classList.toggle('app-ui-desktop',next.mode==='desktop');api.state=next;if(changed)window.dispatchEvent(new CustomEvent('app:uimode',{detail:next}));return next}
const api={detect,apply,state:null,current:()=>state?.mode||apply().mode,isMobile:()=>state?.mode==='mobile',isDesktop:()=>state?.mode==='desktop'};R.uiMode=api;apply();
for(const m of [standaloneMQ,coarseMQ,fineMQ])m.addEventListener?.('change',apply);window.addEventListener('orientationchange',apply,{passive:true});
})();
