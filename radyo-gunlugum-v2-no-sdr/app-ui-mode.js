(()=>{
const R=window.R;if(!R||R.__uiMode386)return;R.__uiMode386=true;
const MOBILE_MAX=900;
let state=null,resizeRaf=0;
const mq=q=>{try{return window.matchMedia(q)}catch{return{matches:false,addEventListener(){}}}};
const standaloneMQ=mq('(display-mode: standalone)'),coarseMQ=mq('(pointer: coarse)'),fineMQ=mq('(pointer: fine)');
function shortSide(){const s=window.screen||{},vals=[Number(s.width),Number(s.height)].filter(x=>Number.isFinite(x)&&x>0);return vals.length?Math.min(...vals):Math.min(window.innerWidth||1280,window.innerHeight||720)}
function viewportWidth(){return Math.max(0,Number(window.innerWidth)||Number(document.documentElement?.clientWidth)||0)}
function detect(){const ua=String(navigator.userAgent||''),touch=Number(navigator.maxTouchPoints||0),coarse=!!coarseMQ.matches,fine=!!fineMQ.matches,standalone=!!standaloneMQ.matches||navigator.standalone===true,uaMobile=navigator.userAgentData?.mobile===true||/Android|iPhone|iPod|Mobile|Silk|Kindle/i.test(ua),ipadLike=/iPad/i.test(ua)||(navigator.platform==='MacIntel'&&touch>1&&coarse),compactTouch=!fine&&coarse&&touch>0&&shortSide()<=820,mobileHardware=uaMobile||ipadLike||compactTouch,width=viewportWidth(),viewportMobile=width>0?width<=MOBILE_MAX:mobileHardware;return Object.freeze({mode:viewportMobile?'mobile':'desktop',context:standalone?'app':'browser',mobileHardware,viewportMobile,viewportWidth:width,mobileMax:MOBILE_MAX,standalone,coarse,fine,touch,shortSide:shortSide()})}
function apply(){const next=detect(),changed=!state||state.mode!==next.mode||state.context!==next.context||state.coarse!==next.coarse||state.fine!==next.fine||state.viewportWidth!==next.viewportWidth;state=next;const root=document.documentElement;root.dataset.uiMode=next.mode;root.dataset.uiContext=next.context;root.classList.toggle('app-ui-mobile',next.mode==='mobile');root.classList.toggle('app-ui-desktop',next.mode==='desktop');api.state=next;if(changed)window.dispatchEvent(new CustomEvent('app:uimode',{detail:next}));return next}
function onResize(){if(resizeRaf)cancelAnimationFrame(resizeRaf);resizeRaf=requestAnimationFrame(()=>{resizeRaf=0;apply()})}
const api={detect,apply,state:null,current:()=>state?.mode||apply().mode,isMobile:()=>state?.mode==='mobile',isDesktop:()=>state?.mode==='desktop'};R.uiMode=api;apply();
for(const m of [standaloneMQ,coarseMQ,fineMQ])m.addEventListener?.('change',apply);window.addEventListener('resize',onResize,{passive:true});window.addEventListener('orientationchange',onResize,{passive:true});
})();