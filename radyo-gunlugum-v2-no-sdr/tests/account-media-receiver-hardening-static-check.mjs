import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const checks=[];
function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}

const audio=read('app-audio-ui.js');
const records=read('app-record-service.js');
const guide=read('app-guide-service.js');
const current=read('app-current-programs.js');

for(const [file,src] of [['app-audio-ui.js',audio],['app-record-service.js',records],['app-guide-service.js',guide],['app-current-programs.js',current]]){
  let ok=true;try{new vm.Script(src,{filename:file})}catch{ok=false}
  check(`syntax ${file}`,ok);
}

check('audio upload pins the opening account',audio.includes('const userId=R.me?.id')&&audio.includes('path=`${userId}/'));
check('audio upload ignores stale completion after account switch',audio.indexOf('if(R.me?.id!==userId)')>=0&&audio.indexOf('if(R.me?.id!==userId)')<audio.indexOf('input.value=path'));
check('audio upload coalesces duplicate actions',audio.includes('uploadFlight')&&audio.includes("if(uploadFlight)return msg('Bir ses yüklemesi zaten sürüyor.')"));
check('audio state clears stored path on reset',audio.includes("const audioPath=$('#audioPath');if(audioPath)audioPath.value=''"));
check('authenticated account switch resets audio state',audio.includes('changedAccount=!!x?.previousUserId&&x.previousUserId!==userId')&&audio.includes('if(changedAccount){cleanup();resetAudioState()'));

check('record updates verify a returned owned row',records.includes(".update(payload).eq('id',id).eq('user_id',userId).select('id,audio_path').maybeSingle()")&&records.includes("if(!q.data)throw new Error('Kayıt bulunamadı veya bu hesaba ait değil.')"));
check('record deletes verify a returned owned row',records.includes(".delete().eq('id',log.id).eq('user_id',userId).select('id,audio_path').maybeSingle()"));
check('record audio cleanup is account-pinned',records.includes('if(!sameUser(userId))')&&records.includes('ses dosyası temizliği güvenli biçimde atlandı'));
check('signed audio URLs reject foreign account paths',records.includes("if(!String(path).startsWith(`${userId}/`))throw new Error('Bu ses dosyası açık hesaba ait değil.')"));
check('record events are not emitted into another account',records.includes("if(sameUser(userId))events?.emit?.('record:saved'")&&records.includes("if(sameUser(userId))events?.emit?.('record:deleted'"));

check('guide rejects bands absent from receiver definition',guide.includes('if(bands&&Object.keys(bands).length&&!range)return false'));
check('current-program fallback rejects unsupported receiver bands',current.includes('if(bands&&Object.keys(bands).length&&!r)return false'));
check('guide pagination has an explicit non-silent ceiling',current.includes('MAX_GUIDE_ROWS=50000')&&current.includes('veri sessizce kesilmedi'));

// Functional audio race: a completed upload from account A must not attach to account B's form.
{
  let resolveUpload,uploadedPath=null;
  const elements={
    '#audioMsg':{textContent:''},
    '#audioPath':{value:''},
    '#uploadAudioBtn':{disabled:false,dataset:{}},
    '#formSuggestionStrip':{textContent:''}
  };
  const R={
    me:{id:'u1'},recordedBlob:{size:128,type:'audio/webm'},
    S:{storage:{from(){return{upload(path){uploadedPath=path;return new Promise(resolve=>{resolveUpload=resolve})}}}}},
    events:{on(){},emit(){}},router:{register(){}},features:{register(){}},reportError(){}
  };
  const sandbox={
    window:{R,addEventListener(){}},document:{querySelector:s=>elements[s]||null},navigator:{},
    URL:{createObjectURL(){return'blob:test'},revokeObjectURL(){}},Date,Math,Number,String,Array,Object,Promise,Error,Blob,
    setTimeout(){return 0},setInterval(){return 0},clearInterval(){},console
  };
  vm.createContext(sandbox);vm.runInContext(audio,sandbox,{filename:'app-audio-ui.js'});
  const pending=R.audioUI.upload();
  R.me={id:'u2'};
  resolveUpload({error:null});
  await pending;
  check('audio upload path belongs to the account that started upload',String(uploadedPath).startsWith('u1/'));
  check('stale audio upload does not populate the next account form',elements['#audioPath'].value==='');
}

// Functional record mutation checks: zero-row writes must not delete audio or emit success.
{
  let mutation={data:null,error:null},removed=[],signedCalls=0,emitted=[];
  const chain=()=>({eq(){return this},select(){return this},maybeSingle:async()=>mutation});
  const R={
    me:{id:'u1'},logs:[{id:'1',user_id:'u1',audio_path:'u1/old.webm'}],
    S:{
      from(){return{update(){return chain()},delete(){return chain()},insert:async()=>({data:null,error:null})}},
      storage:{from(){return{remove:async paths=>{removed.push(...paths);return{error:null}},createSignedUrl:async()=>{signedCalls++;return{data:{signedUrl:'https://example.invalid'},error:null}}}}}
    },
    events:{emit:(name,payload)=>emitted.push([name,payload])},features:{register(){}},reportError(){}
  };
  const sandbox={window:{R},Error,Promise,String,Object,Array,console};
  vm.createContext(sandbox);vm.runInContext(records,sandbox,{filename:'app-record-service.js'});
  let updateRejected=false;try{await R.records.save({audio_path:'u1/new.webm'},{id:'missing',oldAudioPath:'u1/old.webm'})}catch{updateRejected=true}
  check('zero-row record update is rejected',updateRejected);
  check('zero-row record update cannot delete old audio',removed.length===0);
  let deleteRejected=false;try{await R.records.remove('1')}catch{deleteRejected=true}
  check('zero-row record delete is rejected',deleteRejected);
  check('zero-row record delete cannot delete audio',removed.length===0);
  check('zero-row mutations emit no success event',emitted.length===0);
  let foreignRejected=false;try{await R.records.signedAudioUrl('u2/foreign.webm')}catch{foreignRejected=true}
  check('foreign audio path is rejected before signed URL call',foreignRejected&&signedCalls===0);
  mutation={data:{id:'1',audio_path:'u1/new.webm'},error:null};
  await R.records.save({audio_path:'u1/new.webm'},{id:'1',oldAudioPath:'u1/old.webm'});
  check('verified record update cleans replaced audio',removed.includes('u1/old.webm'));
  check('verified record update emits success',emitted.some(([name])=>name==='record:saved'));
}

// Functional TECSUN compatibility checks.
{
  const R={
    norm:v=>String(v??'').toLocaleLowerCase('tr-TR'),events:{on(){},emit(){}},features:{register(){}},
    clock:{today:()=> '2026-09-11',time:()=> '12:00',parts:()=>({date:'2026-09-11',hour:12,minute:0})},
    logs:[],bandProfiles:[],guideEntries:[]
  };
  const config={timezone:'Europe/Istanbul',receiver:{bands:{FM:{min:76,max:108},MW:{min:525,max:1610},SW1:{min:3900,max:4000}}}};
  const sandbox={window:{R},globalThis:null,RADIO_APP_CONFIG:config,Intl,Date,Math,Number,String,Array,Object,Map,Set,Promise,console,setTimeout(){return 0}};
  sandbox.globalThis=sandbox;
  vm.createContext(sandbox);vm.runInContext(guide,sandbox,{filename:'app-guide-service.js'});
  check('supported FM frequency remains compatible',R.guideService.receiverCompatible({mode:'FM',frequency:100})===true);
  check('out-of-range FM frequency is rejected',R.guideService.receiverCompatible({mode:'FM',frequency:110})===false);
  check('supported TECSUN SW band remains compatible',R.guideService.receiverCompatible({mode:'SW',band:'SW1',frequency:3950})===true);
  check('unsupported SW band is rejected',R.guideService.receiverCompatible({mode:'SW',band:'SW2',frequency:4800})===false);
  check('missing SW band is rejected when receiver bands are defined',R.guideService.receiverCompatible({mode:'SW',frequency:3950})===false);
}

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} account/media/receiver hardening checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
