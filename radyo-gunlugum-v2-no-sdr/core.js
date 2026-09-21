const R=window.R={};
R.__coreBase=true;
R.authRecoveryHint=/(?:^|[?#&])type=recovery(?:&|$)/.test(`${globalThis.location?.search||''}${globalThis.location?.hash||''}`);
R.URL='https://mesbtntnclokgzgunept.supabase.co';
R.KEY='sb_publishable_sUZxv1oXvj8y3oOKhXGNtw_BwoiREML';
function dependencyFatal(message){
  if(typeof document==='undefined'||document.querySelector?.('#appDependencyFatal'))return;
  try{
    document.documentElement?.setAttribute?.('data-app-dependency-error','supabase');
    const wrap=document.createElement('div');wrap.id='appDependencyFatal';wrap.setAttribute('role','alert');wrap.setAttribute('aria-live','assertive');wrap.style.cssText='position:fixed;inset:18px;z-index:40000;display:grid;place-items:center;background:rgba(15,23,42,.82);backdrop-filter:blur(10px);padding:18px';
    const card=document.createElement('section');card.style.cssText='width:min(540px,100%);background:#fff;color:#0f172a;border-radius:22px;padding:22px;box-shadow:0 24px 80px rgba(15,23,42,.35)';
    const title=document.createElement('h2');title.textContent='Uygulama bileşeni yüklenemedi';title.style.margin='0 0 8px';
    const text=document.createElement('p');text.textContent=message;text.style.cssText='margin:0 0 14px;color:#475569;line-height:1.5';
    const hint=document.createElement('p');hint.textContent='Yerel PWA dosyaların korunur. Bağlantı düzeldiğinde sayfayı yeniden yükleyebilirsin.';hint.style.cssText='margin:0 0 14px;color:#64748b;font-size:13px;line-height:1.5';
    const button=document.createElement('button');button.type='button';button.textContent='Yeniden yükle';button.style.cssText='border:0;border-radius:12px;background:#4f46e5;color:#fff;font-weight:800;padding:12px 16px;min-height:44px';button.onclick=()=>location.reload();
    card.append(title,text,hint,button);wrap.append(card);document.body?.append(wrap);button.focus?.();
  }catch{}
}
const createSupabase=globalThis.supabase&&supabase.createClient;
if(typeof createSupabase==='function')R.S=createSupabase(R.URL,R.KEY);
else{R.S=null;R.dependencyError={key:'supabase',message:'Supabase istemci kitaplığı alınamadı.'};dependencyFatal('Hesap ve bulut verisi için gereken Supabase istemci kitaplığı alınamadı. İnternet bağlantını kontrol et.')}

R.$=s=>document.querySelector(s);
R.$$=s=>[...document.querySelectorAll(s)];
R.B=['FM','MW','SW1','SW2','SW3','SW4','SW5','SW6','SW7','SW8','SW9','SW10'];
R.me=null;
R.logs=[];
R.schedules=[];
R.guideEntries=[];
R.guideRules=[];
R.bandProfiles=[];
R.nowMode='ALL';
R.lastSmart=null;
R.editAudio=null;
R.recordedBlob=null;
R.esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
R.norm=(s='')=>String(s).toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
R.num=v=>v===''||v==null?null:Number(v);
R.today=()=>new Date().toLocaleDateString('en-CA');
R.local=()=>{const d=new Date(),x=new Date(d-d.getTimezoneOffset()*60000).toISOString();return{date:x.slice(0,10),time:x.slice(11,16),month:x.slice(0,7)}};
R.freq=x=>{const n=Number(x?.frequency);if(!Number.isFinite(n)||n<=0)return'';return`${n.toLocaleString('tr-TR',{maximumFractionDigits:3})} ${x?.band==='FM'?'MHz':'kHz'}`};
R.download=(name,text,type='text/plain;charset=utf-8')=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
R.fill=(id,value='')=>{const el=R.$('#'+id);if(el)el.value=value??''};
