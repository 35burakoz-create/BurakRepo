(()=>{
const R=window.R;if(!R||R.__authService385)return;R.__authService385=true;const events=R.events;let currentId=null,booting=null;
function applyUser(user,source='auth'){const next=user||null,id=next?.id||null,previousUserId=currentId,changed=id!==previousUserId;currentId=id;R.me=next;if(changed){R.logs=[];if(!next)R.schedules=[];R.store?.sync?.(next?'auth-user-changed':'auth-cleared')}if(changed||source==='boot')events?.emit?.('auth:changed',{user:next,authenticated:!!next,source,previousUserId});return next}
async function signIn(email,password){const q=await R.S.auth.signInWithPassword({email,password});if(q.error)throw q.error;applyUser(q.data?.user||null,'sign-in');if(q.data?.user)await R.load?.();return q.data}
async function signUp(email,password){const q=await R.S.auth.signUp({email,password});if(q.error)throw q.error;if(q.data?.user&&q.data?.session){applyUser(q.data.user,'sign-up');await R.load?.()}return q.data}
async function signOut(){R.uiStatePersistence?.saveDraft?.();const q=await R.S.auth.signOut();if(q.error)throw q.error;applyUser(null,'sign-out');return true}
async function boot(){if(booting)return booting;booting=(async()=>{const q=await R.S.auth.getSession();if(q.error)throw q.error;const user=q.data?.session?.user||null;applyUser(user,'boot');if(user)await R.load?.();return user})().finally(()=>booting=null);return booting}
R.S.auth.onAuthStateChange((event,session)=>{queueMicrotask(async()=>{const user=session?.user||null,prior=currentId;applyUser(user,`supabase:${event}`);if(user&&user.id!==prior){try{await R.load?.()}catch(error){R.reportError?.(error,'auth-state-load',{silent:true})}}})});
R.auth={signIn,signUp,signOut,boot,user:()=>R.me};R.boot=boot;R.features?.register?.('auth-service',{ready:true,provider:'app-auth-service'});
})();