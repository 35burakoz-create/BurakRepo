(()=>{
const R=window.R;if(!R)return;const $=R.$;
function norm(v=''){return R.norm?R.norm(v):String(v).toLowerCase()}
function toast(v){R.toast?R.toast(v):alert(v)}

// Preserve duration and provenance when an existing imported/AI-assisted row is edited.
const baseBody=R.body;R.body=()=>{const b=baseBody(),id=$('#logId')?.value,old=id?(R.logs||[]).find(x=>x.id===id):null,d=Number($('#audioPreview')?.duration);if(Number.isFinite(d)&&d>0)b.audio_duration_seconds=Math.round(d);if(old){b.source=old.source||b.source;for(const k of ['smart_language','smart_station','smart_program','smart_confidence'])if((b[k]===null||b[k]===undefined)&&old[k]!=null)b[k]=old[k]}return b};

// Clear media/transcript controls with a form reset, so old state cannot leak into a new log.
const baseReset=R.reset;R.reset=()=>{const out=baseReset();if($('#audioFile'))$('#audioFile').value='';if($('#speechText'))$('#speechText').value='';if($('#audioMsg'))$('#audioMsg').textContent='';if($('#speechMsg'))$('#speechMsg').textContent='';if($('#recordTimer'))$('#recordTimer').textContent='00:00';$('#v36AudioActions')?.remove();return out};

// Expose the languages already supported by the AI layer to browser speech recognition too.
const speech=$('#speechLang');if(speech){for(const [value,label] of [['ro-RO','Romence'],['pt-PT','Portekizce'],['ja-JP','Japonca'],['ko-KR','Korece'],['zh-CN','Çince'],['fa-IR','Farsça'],['el-GR','Yunanca'],['bg-BG','Bulgarca']])if(!speech.querySelector(`option[value="${value}"]`)){const o=document.createElement('option');o.value=value;o.textContent=label;speech.appendChild(o)}}

// Delete the database row first. Storage cleanup failure can then only leave a recoverable orphan, never a log pointing at a missing audio file.
R.del=async id=>{const x=(R.logs||[]).find(z=>z.id===id);if(!x||!confirm('Bu kaydı silmek istiyor musun?'))return;const q=await R.S.from('radio_logs').delete().eq('id',id).eq('user_id',R.me.id);if(q.error)return alert(q.error.message);if(x.audio_path){const s=await R.S.storage.from('radio-audio').remove([x.audio_path]);if(s.error)console.warn('Kayıt silindi ancak ses dosyası temizlenemedi; Ses Kurtarma alanından kontrol edilebilir.',s.error)}await R.load()};

// Apply the candidate the user actually selected in AI analysis. The old handler always used candidates[0] for country metadata.
document.addEventListener('click',async e=>{const b=e.target.closest('[data-v30apply]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();const a=(R.v30Analyses||[]).find(x=>x.id===b.dataset.v30apply);if(!a)return;const log=(R.logs||[]).find(x=>x.id===a.log_id);if(!log)return;const cands=Array.isArray(a.candidates)?a.candidates:[],idx=Number(a.evidence?.selected_candidate_index),cand=Number.isInteger(idx)&&idx>=0?cands[idx]:(cands.find(x=>norm(x.station)===norm(a.station_candidate))||cands[0]||null),p={transcript:a.transcript||log.transcript||null,smart_language:a.detected_language||null,smart_station:a.station_candidate||cand?.station||null,smart_program:a.program_candidate||cand?.content_hint||null,smart_confidence:a.confidence??cand?.score??null};if(!log.language&&a.detected_language&&a.detected_language!=='Bilinmiyor')p.language=a.detected_language;if(!log.station&&(a.station_candidate||cand?.station))p.station=a.station_candidate||cand.station;if(!log.country&&cand?.country)p.country=cand.country;if(!log.program&&(a.program_candidate||cand?.content_hint))p.program=a.program_candidate||cand.content_hint;const q=await R.S.from('radio_logs').update(p).eq('id',log.id).eq('user_id',R.me.id);if(q.error)return toast(q.error.message);await R.load();toast('AI önerisi kayda uygulandı; doğrulama durumu değiştirilmedi.')},true);
})();
