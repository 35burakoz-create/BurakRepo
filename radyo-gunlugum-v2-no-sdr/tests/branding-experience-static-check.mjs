import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(import.meta.dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const boot=read('app-bootstrap.js');
const sw=read('sw.js');
const html=read('index.html');
const js=read('app-branding-experience.js');
const social=read('app-social-meta-runtime.js');
const css=read('app-branding-experience.css');
const splash=read('assets/branding/r9012-splash.svg');
const cover=read('assets/branding/r9012-share-cover.svg');
const og=fs.readFileSync(path.join(root,'assets/branding/r9012-og.png'));

new Function(js);
new Function(social);
assert(boot.includes("'app-branding-experience.js'"),'branding experience must be booted');
assert(boot.indexOf("'app-foundation.js'")<boot.indexOf("'app-branding-experience.js'"),'branding experience must load after foundation events');
assert(boot.indexOf("'app-branding-experience.js'")<boot.indexOf("'app-social-meta-runtime.js'"),'runtime social metadata must load after the branding experience');
assert(boot.indexOf("'app-social-meta-runtime.js'")<boot.indexOf("'app-auth-service.js'"),'runtime social metadata must settle before auth/data startup work');
assert(sw.includes("const BRANDING_ENTRY_SHARE='20260917-3';"),'service worker must carry splash/share release marker');
assert(sw.includes("const STATIC_SOCIAL_PREVIEW='20260917-4';"),'service worker must carry static social preview release marker');
assert(sw.includes("const DYNAMIC_LISTENING_SHARE_CARD='20260917-5';"),'service worker must carry dynamic share-card release marker');
assert(sw.includes("const RUNTIME_SOCIAL_META='20260917-9';"),'service worker must carry runtime social metadata release marker');
for(const asset of ['./app-branding-experience.js','./app-social-meta-runtime.js','./app-branding-experience.css','./assets/branding/r9012-splash.svg','./assets/branding/r9012-share-cover.svg','./assets/branding/r9012-og.png'])assert(sw.includes(`'${asset}'`),`service worker must cache ${asset}`);
assert(js.includes("splash:'assets/branding/r9012-splash.svg'"),'splash slot must have an R-9012 packaged fallback');
assert(js.includes("share_cover:'assets/branding/r9012-share-cover.svg'"),'share_cover slot must have an R-9012 packaged fallback');
assert(js.includes("R.brandingAssets?.resolve?.(key)"),'custom private branding must resolve through the signed-url branding manager');
assert(js.includes("R.brandingAssets?.rowFor?.('splash')")&&js.includes("R.brandingAssets?.rowFor?.('share_cover')"),'UI must distinguish custom splash/share assets');
assert(js.includes("ensureSplash()")&&js.includes("SPLASH_FAILSAFE_MS"),'startup branding must mount immediately and remain fail-safe non-blocking');
assert(js.includes("dataAuthBranding='1'")||js.includes("dataset.authBranding='1'"),'login experience must receive a branded receiver visual');
assert(js.includes("button.dataset.brandingShare=id"),'journal records must receive a share action without changing stored data');
assert(js.includes("navigator.share")&&js.includes("navigator.clipboard.writeText"),'sharing must support native share with a copy fallback');
assert(js.includes("location.origin}${location.pathname}"),'shared app URL must exclude query strings and hashes');
const shareCopy=js.slice(js.indexOf('function shareCopy'),js.indexOf('function shareCardData'));
const shareCardData=js.slice(js.indexOf('function shareCardData'),js.indexOf('function decorateRecord'));
for(const privateField of ['location','latitude','longitude','notes','signal_strength','signal','transcript','program','qsl']){
  assert(!shareCopy.includes(`log?.${privateField}`),`default share text must not include ${privateField}`);
  assert(!shareCardData.includes(`log?.${privateField}`),`dynamic share card data must not include ${privateField}`);
}
assert(js.includes('CARD_W=1200,CARD_H=630'),'dynamic share cards must render at 1200×630');
assert(js.includes("canvas.toBlob")&&js.includes("'image/png'"),'dynamic share card must be rendered as PNG');
assert(js.includes('async function dynamicCardFile(log,coverUrl)'),'dynamic listening-card renderer must exist');
assert(js.includes("const {station,frequency,band,when}=shareCardData(log)"),'renderer must consume the privacy-filtered card data object');
assert(js.includes("new File([blob],`radyo-gunlugum-${slug}.png`"),'dynamic card must be handed to Web Share as a PNG File');
assert(js.includes('shareFile=dynamic')&&js.includes("navigator.canShare?.({files:[shareFile]})"),'native share must prefer the generated listening-card file when supported');
assert(js.includes("sharePreviewUrl=URL.createObjectURL(dynamic)"),'share dialog must preview the generated dynamic card');
assert(js.includes('URL.revokeObjectURL?.(sharePreviewUrl)'),'dynamic-card preview URLs must be revoked when replaced or closed');
assert(js.includes("Kart hazırlanıyor…")&&js.includes("Dinamik dinleme kartı"),'share UI must disclose dynamic-card preparation and completion');
assert(js.includes("Konum, kişisel notlar ve sinyal bilgisi paylaşım metnine veya görseline eklenmez."),'share UI must state image privacy scope');
assert(js.includes("credentials:'omit'"),'share-cover fetch must not forward ambient credentials');
assert(social.includes("IMAGE_PATH='assets/branding/r9012-og.png'"),'runtime social metadata must use the packaged raster OG image');
assert(social.includes('new URL(IMAGE_PATH,document.baseURI||location.href).href'),'runtime social metadata must make the raster image absolute on the active host');
assert(social.includes("property('og:image',image)")&&social.includes("named('twitter:image',image)"),'Open Graph and Twitter must share the same raster runtime image');
assert(social.includes("property('og:image:type','image/png')")&&social.includes("property('og:image:width','1200')")&&social.includes("property('og:image:height','630')"),'runtime raster metadata must disclose PNG dimensions');
assert(social.includes("R.events?.on?.('branding:changed',install)"),'custom branding changes must not replace the durable crawler-safe runtime image');
assert(!social.includes('share_cover')&&!social.includes('brandingAssets')&&!social.includes('supabase.co'),'runtime social metadata must never depend on private or expiring branding URLs');
for(const marker of [
  '<meta property="og:type" content="website">',
  '<meta property="og:title" content="Radyo Günlüğüm">',
  '<meta property="og:image" content="/assets/branding/r9012-og.png">',
  '<meta property="og:image:type" content="image/png">',
  '<meta property="og:image:width" content="1200">',
  '<meta property="og:image:height" content="630">',
  '<meta name="twitter:card" content="summary_large_image">',
  '<meta name="twitter:image" content="/assets/branding/r9012-og.png">'
])assert(html.includes(marker),`static crawler metadata missing: ${marker}`);
assert(!html.includes('supabase.co/storage'),'crawler metadata must not expose private or expiring storage URLs');
assert(og.length<250000,'static OG raster should stay lightweight');
assert(og.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])),'static OG raster must be a PNG');
assert.equal(og.readUInt32BE(16),1200,'static OG raster must be 1200px wide');
assert.equal(og.readUInt32BE(20),630,'static OG raster must be 630px tall');
assert(css.includes('.app-branding-splash')&&css.includes('.app-auth-branding')&&css.includes('.app-branding-share-dialog'),'splash, login and share surfaces must all be styled');
assert(css.includes('width:44px;height:44px;min-width:44px'),'share close action must preserve a 44px touch target');
assert(css.includes('@media(max-width:620px)'),'branding experience must have a compact mobile layout');
assert(css.includes('@media(prefers-reduced-motion:reduce)'),'startup animation must respect reduced motion');
assert(splash.includes('viewBox="0 0 1242 2208"')&&splash.includes('TECSUN R-9012')&&splash.includes('Radyo Günlüğüm'),'packaged splash must preserve the requested portrait R-9012 identity');
assert(cover.includes('viewBox="0 0 1200 628"')&&cover.includes('TECSUN R-9012')&&cover.includes('Radyo Günlüğüm'),'packaged share cover must preserve the requested 1200×628 R-9012 identity');

console.log('branding-experience-static-check: ok');
