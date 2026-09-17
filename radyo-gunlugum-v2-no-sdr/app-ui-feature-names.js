(()=>{
const R=window.R;if(!R||R.__uiFeatureNames20260917)return;R.__uiFeatureNames20260917=true;
const NAMES=Object.freeze({
  'route:audio':{title:'Ses Kaydı ve Döküm',desc:'Ses örneği kaydet, yükle ve canlı konuşma dökümü oluştur'},
  'route:ai':{title:'Yapay zekâ analizi',desc:'Kaydedilmiş sesi Whisper ile analiz et ve istasyon adaylarını karşılaştır'},
  'route:smart':{title:'Dinleme merkezi',desc:'Tarama oturumları, kadran kalibrasyonu ve çözülemeyen yayınlar'}
});
function renameMenu(sheet=document.querySelector('#v38Sheet')){if(!sheet)return 0;let changed=0;for(const[action,copy]of Object.entries(NAMES)){const row=sheet.querySelector(`[data-action="${action}"]`),title=row?.querySelector('.v38-menu-copy b'),desc=row?.querySelector('.v38-menu-copy small');if(title&&title.textContent!==copy.title){title.textContent=copy.title;changed++}if(desc&&desc.textContent!==copy.desc){desc.textContent=copy.desc;changed++}}return changed}
function renameSmartSurface(){const root=document.querySelector('#appSmart');if(!root)return false;const kicker=root.querySelector('.app-smart-hero>small');if(kicker)kicker.textContent='DİNLEME MERKEZİ · OTURUMLAR VE KALİBRASYON';return true}
function renameAudioSurface(){const root=document.querySelector('#tab-audio');if(!root)return false;const first=root.querySelector('.two-col .card h2');if(first)first.textContent='Ses kaydı';const smart=root.querySelector('.smart-card .section-head h2');if(smart)smart.textContent='Akıllı istasyon önerisi';return true}
function renameAiSurface(){const root=document.querySelector('#appAI');if(!root)return false;const kicker=root.querySelector('.app-ai-hero>small');if(kicker)kicker.textContent='YAPAY ZEKÂ ANALİZİ · CİHAZDA WHISPER';return true}
function clarifyQuickLog(){const form=document.querySelector('#qForm');if(!form)return false;const context=form.querySelector('.app-quick-context'),small=context?.querySelector('small');if(small)small.textContent='Tarih, saat, konum adı ve koordinatlar otomatik eklenir';let note=form.querySelector('.app-quick-location-note');if(!note){note=document.createElement('p');note.className='app-quick-location-note';context?.after(note)}const origin=R.listeningOrigin?.()?.name||'varsayılan dinleme konumu';if(note)note.textContent=`Bu hızlı kayıt, ${origin} için kayıtlı koordinatları da saklar. Konumu Ayarlar’dan değiştirebilirsin.`;return true}
function refresh(){renameMenu();renameSmartSurface();renameAudioSurface();renameAiSurface();clarifyQuickLog()}
R.events?.on?.('menu:opened',x=>{renameMenu(x?.sheet);setTimeout(clarifyQuickLog,0)});
R.events?.on?.('route:changed',x=>{if(['smart','audio','ai'].includes(x?.to))setTimeout(refresh,0)});
for(const event of ['render:all','data:loaded','listening:data','ai:data','user:settings'])R.events?.on?.(event,()=>setTimeout(refresh,0));
R.uiFeatureNames={names:NAMES,renameMenu,renameSmartSurface,renameAudioSurface,renameAiSurface,clarifyQuickLog,refresh};
R.features?.register?.('ui-feature-names',{ready:true,provider:'app-ui-feature-names'});
setTimeout(refresh,0);
})();
