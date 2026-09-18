import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const checks=[];
function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}

const search=read('v44-search-rebuild.js');
new Function(search);

for(const title of ['Dinleme merkezi','Ses Kaydı ve Döküm','Yapay zekâ analizi','Dinleme Haritası','Radyo Sözlüğü','Başarılar','Favoriler','Hatırlatıcılar','Radyo Görselleri'])check(`global search includes ${title}`,search.includes(`'${title}'`));
check('route tools still use canonical router navigation',search.includes('function openTool(tab)')&&search.includes("R.router.go(tab,{source:'search'})"));
check('non-route commands use direct APIs where available',search.includes("command==='achievements'")&&search.includes('R.openAchievements?.()')&&search.includes("command==='branding'")&&search.includes('R.brandingAssets?.open?.()'));
check('menu-backed commands reuse existing menu actions',search.includes("['radio-glossary','favorites','reminders'].includes(command)")&&search.includes('function openMenuAction(action)'));
check('tool search indexes both title and description',search.includes("TOOLS.filter(([t,m])=>norm(`${t} ${m}`).includes(nq))"));
check('empty search exposes an expanded quick-access catalog',search.includes('TOOLS.slice(0,8)'));
check('search status explains keyboard result navigation',search.includes('Ok tuşlarıyla sonuçlara geçebilirsin.'));
check('input supports ArrowDown and ArrowUp navigation',search.includes("input.addEventListener('keydown'")&&search.includes("e.key==='ArrowDown'")&&search.includes("e.key==='ArrowUp'"));
check('result buttons support cyclic keyboard navigation',search.includes('function moveResultFocus')&&search.includes('(index+direction+buttons.length)%buttons.length'));
check('keyboard movement keeps the focused result visible',search.includes("scrollIntoView?.({block:'nearest'})"));
check('search API exposes catalog and command helpers for regression tests',search.includes('tools:TOOLS')&&search.includes('openCommand')&&search.includes('openMenuAction')&&search.includes('moveResultFocus'));
check('search placeholder advertises tool-name queries',search.includes('Fransızca, Hatırlatıcılar…'));

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} global search catalog checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
