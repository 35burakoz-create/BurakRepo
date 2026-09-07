(()=>{
const R=window.R;if(!R)return;
const VERSION='V3.6.1';
function loadCss(){if(document.querySelector('link[data-v43-css]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='v43-search-hotfix.css';l.dataset.v43Css='1';document.head.appendChild(l)}
function trigger(input){
  if(!input)return;
  input.dispatchEvent(new Event('input',{bubbles:true}));
  setTimeout(()=>document.querySelector('#v42SearchResults')?.scrollIntoView({behavior:'smooth',block:'nearest'}),100);
}
function enhance(){
  loadCss();
  const sheet=document.querySelector('#v42Search');
  const input=document.querySelector('#v42SearchInput');
  const command=sheet?.querySelector('.v42-command');
  if(!sheet||!input||!command)return;
  input.type='search';
  input.enterKeyHint='search';
  input.setAttribute('aria-label','Global arama');
  const oldKbd=command.querySelector('kbd');
  if(oldKbd)oldKbd.hidden=true;
  if(!command.querySelector('[data-v43searchsubmit]')){
    const b=document.createElement('button');
    b.type='button';
    b.className='v43-search-submit';
    b.dataset.v43searchsubmit='1';
    b.textContent='Ara';
    b.setAttribute('aria-label','Ara');
    b.onclick=()=>trigger(input);
    command.appendChild(b);
  }
  if(!input.dataset.v43Bound){
    input.dataset.v43Bound='1';
    input.addEventListener('keydown',e=>{
      if(e.key==='Enter'){
        e.preventDefault();
        trigger(input);
        input.blur();
      }
    });
  }
  if(!sheet.querySelector('#v43SearchHelp')){
    const p=document.createElement('div');
    p.id='v43SearchHelp';
    p.className='v43-search-help';
    p.textContent='Yazarken sonuçlar güncellenir; istersen Ara düğmesine veya klavyedeki Enter/Ara tuşuna bas.';
    command.after(p);
  }
}
loadCss();
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',e=>{if(e.target.closest('[data-v42search]'))setTimeout(enhance,0)},true);
setTimeout(enhance,300);
document.title=`Radyo Günlüğüm ${VERSION}`;
const ver=document.querySelector('.topbar h1 span');if(ver)ver.textContent=VERSION;
})();