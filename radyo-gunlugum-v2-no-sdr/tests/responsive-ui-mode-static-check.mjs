import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(import.meta.dirname,'..');
const js=fs.readFileSync(path.join(root,'app-ui-mode.js'),'utf8');
new Function(js);
assert(js.includes('const MOBILE_MAX=900'),'responsive mode must use one explicit viewport breakpoint');
assert(js.includes("viewportMobile=width>0?width<=MOBILE_MAX:mobileHardware"),'viewport width must be the primary layout signal with hardware only as a no-viewport fallback');
assert(js.includes("mode:viewportMobile?'mobile':'desktop'"),'layout mode must follow the viewport decision');
assert(js.includes('mobileHardware,viewportMobile,viewportWidth:width,mobileMax:MOBILE_MAX'),'hardware context must remain observable without controlling layout');
assert(js.includes("window.addEventListener('resize',onResize,{passive:true})"),'layout mode must react to viewport resize');
assert(js.includes("window.addEventListener('orientationchange',onResize,{passive:true})"),'orientation changes must reuse the viewport recalculation path');
assert(js.includes('requestAnimationFrame(()=>{resizeRaf=0;apply()})'),'resize recalculation must be animation-frame throttled');
console.log('responsive-ui-mode-static-check: ok');
