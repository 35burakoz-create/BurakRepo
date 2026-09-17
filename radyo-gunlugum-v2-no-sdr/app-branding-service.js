(()=>{
const R=window.R;if(!R||R.__brandingAssetsService)return;R.__brandingAssetsService=true;
const BUCKET='branding-assets',MAX_BYTES=8*1024*1024,ALLOWED=new Set(['image/png','image/jpeg','image/webp','image/svg+xml']);
const DEFAULTS={
 app_icon_main:'assets/radio/icon-1024.png',
 app_icon_flat:'assets/radio/icon-flat-1024.png',
 app_icon_realistic:'assets/radio/icon-1024.png',
 splash_main:'assets/radio/icon-1024.png',
 hero_dark_radio:'assets/radio/icon-1024.png',
 hero_light_radio:'assets/radio/icon-1024.png',
 share_cover_main:'assets/radio/icon-1024.png'
};
let rows=new Map(),urls=new Map(),loadedUser=null,flight=null;
const userId=()=>R.me?.id||null;
function assertKey(key){if(!(key in DEFAULTS))throw new Error('Desteklenmeyen görsel türü.');return key}
function safeName(name='image'){return String(name).replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'image'}
function fallback(key){return DEFAULTS[assertKey(key)]}
function get(key){assertKey(key);return urls.get(key)||fallback(key)}
function row(key){assertKey(key);return rows.get(key)||null}
async function signed(path){const {data,error}=await R.S.storage.from(BUCKET).createSignedUrl(path,3600);if(error)throw error;return data?.signedUrl||null}
async function load(force=false){const uid=userId();if(!uid){rows=new Map();urls=new Map();loadedUser=null;return{rows,urls}}if(!force&&loadedUser===uid&&!flight)return{rows,urls};if(flight)return flight;flight=(async()=>{const {data,error}=await R.S.from('branding_assets').select('id,user_id,asset_key,storage_path,mime_type,width,height,file_size,created_at,updated_at').eq('user_id',uid);if(error)throw error;const nextRows=new Map(),nextUrls=new Map();for(const item of data||[]){if(!(item?.asset_key in DEFAULTS))continue;nextRows.set(item.asset_key,item);try{const url=await signed(item.storage_path);if(url)nextUrls.set(item.asset_key,url)}catch(err){R.reportError?.(err,'branding-signed-url',{silent:true})}}rows=nextRows;urls=nextUrls;loadedUser=uid;apply();R.events?.emit?.('branding:loaded',{userId:uid,count:rows.size});return{rows,urls}})().catch(error=>{R.reportError?.(error,'branding-load',{silent:true});loadedUser=uid;rows=new Map();urls=new Map();apply();return{rows,urls,error}}).finally(()=>{flight=null});return flight}
function imageSize(file){return new Promise(resolve=>{if(!file||file.type==='image/svg+xml')return resolve({width:null,height:null});const u=URL.createObjectURL(file),img=new Image();img.onload=()=>{const out={width:img.naturalWidth||null,height:img.naturalHeight||null};URL.revokeObjectURL(u);resolve(out)};img.onerror=()=>{URL.revokeObjectURL(u);resolve({width:null,height:null})};img.src=u})}
async function upload(key,file){assertKey(key);const uid=userId();if(!uid)throw new Error('Görsel yüklemek için giriş yapmalısın.');if(!(file instanceof File))throw new Error('Bir görsel dosyası seç.');if(!ALLOWED.has(file.type))throw new Error('PNG, JPG, WebP veya SVG dosyası seç.');if(file.size>MAX_BYTES)throw new Error('Görsel en fazla 8 MB olabilir.');const previous=rows.get(key),dims=await imageSize(file),path=`${uid}/${key}/${Date.now()}-${safeName(file.name)}`;const up=await R.S.storage.from(BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});if(up.error)throw up.error;const payload={user_id:uid,asset_key:key,storage_path:path,mime_type:file.type,width:dims.width,height:dims.height,file_size:file.size,updated_at:new Date().toISOString()};const saved=await R.S.from('branding_assets').upsert(payload,{onConflict:'user_id,asset_key'}).select().single();if(saved.error){await R.S.storage.from(BUCKET).remove([path]).catch(()=>{});throw saved.error}if(previous?.storage_path&&previous.storage_path!==path)await R.S.storage.from(BUCKET).remove([previous.storage_path]).catch(err=>R.reportError?.(err,'branding-old-file',{silent:true}));await load(true);R.events?.emit?.('branding:changed',{key,action:'upload'});return saved.data}
async function reset(key){assertKey(key);const uid=userId();if(!uid)return false;const previous=rows.get(key);const del=await R.S.from('branding_assets').delete().eq('user_id',uid).eq('asset_key',key);if(del.error)throw del.error;if(previous?.storage_path)await R.S.storage.from(BUCKET).remove([previous.storage_path]).catch(err=>R.reportError?.(err,'branding-reset-file',{silent:true}));rows.delete(key);urls.delete(key);apply();R.events?.emit?.('branding:changed',{key,action:'reset'});return true}
function apply(){const root=document.documentElement;if(!root?.style)return;for(const key of ['hero_dark_radio','hero_light_radio']){const url=get(key).replace(/["\\]/g,'');root.style.setProperty(`--branding-${key.replaceAll('_','-')}`,`url("${url}")`)}}
R.brandingAssets={bucket:BUCKET,keys:Object.freeze(Object.keys(DEFAULTS)),defaults:Object.freeze({...DEFAULTS}),maxBytes:MAX_BYTES,get,row,load,upload,reset,apply};
R.events?.on?.('auth:changed',()=>{loadedUser=null;rows=new Map();urls=new Map();load(true)});
R.events?.on?.('data:loaded',()=>load(false));
R.features?.register?.('branding-assets',{ready:true,provider:'app-branding-service'});
})();