import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(import.meta.dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const boot=read('app-bootstrap.js');
const sw=read('sw.js');
const manifest=JSON.parse(read('manifest.webmanifest'));
const icon=read('icon.svg');
const js=read('app-branding-assets.js');
const css=read('app-branding-assets.css');
const surfaces=read('app-branding-surfaces.js');
const surfaceCss=read('app-branding-surfaces.css');
const darkVisual=read('assets/branding/r9012-dark.svg');
const lightVisual=read('assets/branding/r9012-light.svg');
const sql=read('sql/20260917_radio_branding_assets.sql');

assert(boot.includes("'app-branding-assets.js'"),'branding manager must be booted');
assert(boot.indexOf("'app-menu-ui.js'")<boot.indexOf("'app-branding-assets.js'"),'branding manager must load after menu events exist');
assert(boot.includes("'app-branding-surfaces.js'"),'radio visual surface connector must be booted');
assert(boot.indexOf("'app-now-ui.js'")<boot.indexOf("'app-branding-surfaces.js'"),'visual connector must load after Home and Now renderers');
assert(sw.includes("const BRANDING_ASSET_SYSTEM='20260917-1';"),'service worker must carry branding release marker');
assert(sw.includes("const BRANDING_SURFACE_USAGE='20260917-2';"),'service worker must carry visual-surface release marker');
for(const asset of ['./app-branding-assets.js','./app-branding-assets.css','./app-branding-surfaces.js','./app-branding-surfaces.css','./apple-touch-icon.png','./icon.svg','./assets/branding/r9012-dark.svg','./assets/branding/r9012-light.svg'])assert(sw.includes(`'${asset}'`),`service worker must cache ${asset}`);
assert(fs.statSync(path.join(root,'apple-touch-icon.png')).size>1000,'apple touch icon must be a non-empty PNG asset');

const appIcon=manifest.icons?.find(x=>x.src==='icon.svg');
assert(appIcon&&appIcon.type==='image/svg+xml','manifest must retain the packaged radio SVG icon');
assert(String(appIcon.purpose||'').includes('maskable'),'manifest icon must remain maskable-compatible');
assert(icon.includes('#0d2a44')&&icon.includes('#f4b94f'),'radio icon must preserve navy body and amber tuning marker');
assert((icon.match(/<circle/g)||[]).length>=20,'radio icon must contain a recognizable speaker grille / controls');
assert(icon.includes('stroke="#b8c6d3"'),'radio icon must contain the telescopic antenna treatment');

for(const key of ['app_icon','icon_flat','icon_realistic','splash','radio_dark','radio_light','share_cover'])assert(js.includes(`key:'${key}'`),`branding slot missing: ${key}`);
assert(js.includes("const BUCKET='radio-branding',TABLE='radio_branding_assets'"),'branding manager must use the dedicated table and bucket');
assert(js.includes('MAX_BYTES=10*1024*1024'),'client upload limit must match the 10 MB bucket limit');
assert(js.includes("createSignedUrl(row.storage_path,SIGNED_SECONDS)"),'private branding previews must use signed URLs');
assert(!js.includes('getPublicUrl('),'private branding bucket must not be exposed through public URLs');
assert(js.includes('`${userId}/${assetKey}/${stamp}-${safeName(file.name)}`'),'storage paths must begin with the authenticated user id');
assert(js.includes("if(uid()!==userId){await removeObject(path,'branding-upload-session-change')"),'upload must abort safely if the account changes');
assert(js.includes('const byKey=new Map(DEFS.map(x=>[x.key,x])),loadFlights=new Map()'),'loads must be isolated per account');
assert(js.includes("l.rel='apple-touch-icon';l.href='apple-touch-icon.png'"),'iOS home-screen identity must register the radio touch icon');
assert(js.includes('Telefon simgesi yerleşik radyo ikonuyla gelir.'),'UI must accurately explain that the installed phone icon is packaged');
assert(js.includes("R.events?.on?.('menu:opened'"),'branding manager must expose itself through Settings');
assert(js.includes('<b>Radyo görselleri</b>'),'Settings entry must be clearly named in Turkish');

assert(surfaces.includes("radio_dark:'assets/branding/r9012-dark.svg'"),'dark theme must have a packaged R-9012 fallback');
assert(surfaces.includes("radio_light:'assets/branding/r9012-light.svg'"),'light theme must have a packaged R-9012 fallback');
assert(surfaces.includes("R.brandingAssets?.resolve?.(key)"),'surface connector must resolve user-specific private branding assets');
assert(surfaces.includes("data.brandingSurface='home'")||surfaces.includes("dataset.brandingSurface='home'"),'home must receive a managed radio visual');
assert(surfaces.includes("dataset.brandingSurface='now'"),'Now must receive a managed compact radio visual');
assert(surfaces.includes("new MutationObserver"),'visuals must survive Home and Now rerenders');
assert(surfaces.includes("attributeFilter:['class']"),'theme class changes must trigger automatic visual switching');
assert(surfaces.includes("'branding:changed'"),'custom branding updates must refresh live surfaces');
assert(surfaceCss.includes('.app-radio-visual-home')&&surfaceCss.includes('.app-radio-visual-now'),'surface CSS must distinguish Home and Now layouts');
assert(surfaceCss.includes('@media(max-width:520px)'),'radio visuals must have a compact mobile layout');
for(const svg of [darkVisual,lightVisual]){assert(svg.includes('TECSUN')&&svg.includes('R-9012'),'packaged radio visual must visibly identify the receiver');assert(svg.includes('SW1')&&svg.includes('MW'),'packaged radio visual must preserve receiver-band cues')}

assert(css.includes('z-index:var(--app-layer-modal,20000)'),'branding dialog must obey the shared modal layer contract');
assert(css.includes('var(--app-radio-amber)')&&css.includes('var(--app-radio-panel)'),'branding UI must use canonical radio surface tokens');
assert(css.includes('width:44px;height:44px;min-width:44px'),'close action must keep a 44px touch target');
assert(css.includes('@media(max-width:620px)'),'branding UI must have a mobile layout');

assert(sql.includes('create table if not exists public.radio_branding_assets'),'migration must create the branding table');
assert(sql.includes('alter table public.radio_branding_assets enable row level security'),'branding table must have RLS enabled');
assert(sql.includes('grant select, insert, update, delete on public.radio_branding_assets to authenticated'),'authenticated Data API privileges must be explicit');
assert(sql.includes('revoke all on public.radio_branding_assets from anon'),'anonymous table access must be revoked');
for(const op of ['select','insert','update','delete'])assert(sql.includes(`radio_branding_assets_${op}_own`),`own-row ${op} policy missing`);
assert(sql.includes("'radio-branding',\n  'radio-branding',\n  false"),'branding bucket must be private');
assert(sql.includes('10485760'),'bucket/table limits must enforce 10 MB');
assert(sql.includes("array['image/png','image/jpeg','image/webp','image/svg+xml']::text[]"),'bucket must allow only supported image MIME types');
for(const op of ['select','insert','update','delete'])assert(sql.includes(`radio_branding_storage_${op}_own`),`own-folder Storage ${op} policy missing`);
assert((sql.match(/\(storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)\)::text/g)||[]).length>=5,'Storage policies must scope access to the user UUID folder');

console.log('branding-assets-static-check: ok');
await import('./branding-experience-static-check.mjs');
