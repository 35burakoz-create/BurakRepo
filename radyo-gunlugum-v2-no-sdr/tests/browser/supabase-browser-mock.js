(()=>{
const user={id:'browser-audit-user',email:'audit@example.test'};
function result(data=[]){return Promise.resolve({data,error:null})}
function query(){
  let proxy;
  const fn=()=>proxy;
  proxy=new Proxy(fn,{get(_target,prop){
    if(prop==='then')return(resolve,reject)=>result([]).then(resolve,reject);
    if(prop==='maybeSingle')return async()=>({data:null,error:null});
    if(prop==='single')return async()=>({data:null,error:null});
    if(prop==='throwOnError')return()=>proxy;
    if(prop==='count')return 0;
    return()=>proxy;
  },apply(){return proxy}});
  return proxy;
}
function storageBucket(){return{
  list:async()=>({data:[],error:null}),
  upload:async(_path,_body)=>({data:{path:'browser-audit/mock.webm'},error:null}),
  remove:async()=>({data:[],error:null}),
  createSignedUrl:async()=>({data:{signedUrl:'https://example.test/mock-audio'},error:null})
}}
globalThis.supabase={createClient(){return{
  auth:{
    getSession:async()=>({data:{session:{user}},error:null}),
    onAuthStateChange(callback){queueMicrotask(()=>callback?.('INITIAL_SESSION',{user}));return{data:{subscription:{unsubscribe(){}}}}},
    signInWithPassword:async()=>({data:{user,session:{user}},error:null}),
    signUp:async()=>({data:{user,session:{user}},error:null}),
    signOut:async()=>({error:null}),
    resetPasswordForEmail:async()=>({data:{},error:null}),
    updateUser:async()=>({data:{user},error:null})
  },
  from(){return query()},
  storage:{from(){return storageBucket()}},
  functions:{invoke:async()=>({data:{},error:null})}
}}};
})();
