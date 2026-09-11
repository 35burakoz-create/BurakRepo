import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const checks=[];
function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}

const ui=read('app-ui-state.js');
const auth=read('app-auth-service.js');
const audio=read('app-audio-ui.js');
const audioSafety=read('app-audio-safety.js');
const map=read('app-map-ui.js');

check('last valid route is restored when no hash exists',ui.includes("readHash()||(VALID.has(old.tab)?old.tab:'home')"));
check('draft storage is scoped to the authenticated user',ui.includes('function draftStorageKey()')&&ui.includes('`${DRAFT_KEY}:${id}`'));
check('legacy unscoped draft key is explicitly cleared',ui.includes('function clearLegacyDraft()')&&ui.includes('localStorage.removeItem(DRAFT_KEY)'));
check('logout clears the visible form after auth state changes',ui.includes("if(x?.authenticated){restoreFilters();restoreDraft();R.navigation.restore()}else setTimeout(()=>{R.reset?.()"));
check('sign out persists the current user draft first',auth.includes('R.uiStatePersistence?.saveDraft?.();')&&auth.indexOf('saveDraft')<auth.indexOf('R.S.auth.signOut'));
check('recording cleanup discards a capture when leaving the audio route',audio.includes('discardOnStop=true')&&audio.includes('if(discard)return'));
check('recorder errors restore recording controls',audio.includes('activeRecorder.onerror')&&audio.includes('setRecordingControls(false)'));
check('form reset clears in-memory audio state',audio.includes("R.events?.on?.('form:reset',resetAudioState)")&&audio.includes('R.recordedBlob=null'));
check('orphan audio recovery is paginated',audioSafety.includes('AUDIO_PAGE_SIZE=100')&&audioSafety.includes('MAX_AUDIO_ROWS=10000')&&audioSafety.includes('offset,sortBy'));
check('orphan audio recovery fails explicitly at its safety limit',audioSafety.includes('güvenlik sınırını aştı'));
check('map rejects latitude outside -90..90',map.includes('a>=-90&&a<=90'));
check('map rejects longitude outside -180..180',map.includes('b>=-180&&b<=180'));
check('map point filtering uses coordinate validation',map.includes('validCoord(x.latitude,x.longitude)'));

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} newly-audited-area checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
