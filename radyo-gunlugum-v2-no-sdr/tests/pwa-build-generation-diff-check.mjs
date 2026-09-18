import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const repoRoot=process.cwd();
const app='radyo-gunlugum-v2-no-sdr';
const base=String(process.env.PWA_DIFF_BASE||'').trim();

function fail(message){
  console.error('✗',message);
  process.exitCode=1;
}
function git(args){
  return execFileSync('git',args,{cwd:repoRoot,encoding:'utf8'}).trim();
}
function read(rel){
  return fs.readFileSync(path.join(repoRoot,rel),'utf8');
}
function fromBase(rel){
  try{return git(['show',`${base}:${rel}`])}catch{return''}
}
function buildId(source){
  return source.match(/buildId:'([^']+)'/)?.[1]||'';
}
function generation(source){
  return source.match(/PWA_CACHE_GENERATION='([^']+)'/)?.[1]||'';
}
function cachedPaths(source){
  const body=source.match(/const LOCAL=\[(.*?)\];/s)?.[1]||'';
  const set=new Set();
  for(const m of body.matchAll(/'([^']+)'/g)){
    const value=m[1];
    if(!value.startsWith('./'))continue;
    set.add(`${app}/${value.slice(2)}`);
  }
  return set;
}

const currentConfig=read(`${app}/app-config.js`);
const currentSw=read(`${app}/sw.js`);
const currentBuild=buildId(currentConfig);
const currentGeneration=generation(currentSw);

if(!currentBuild||currentBuild==='legacy')fail('app-config.js must expose a non-legacy buildId.');
if(!currentGeneration)fail('sw.js must expose PWA_CACHE_GENERATION.');
if(currentBuild!==currentGeneration)fail(`app buildId (${currentBuild}) must equal PWA_CACHE_GENERATION (${currentGeneration}).`);

if(!/^[0-9a-f]{40}$/i.test(base)||/^0+$/.test(base)){
  console.log('• No usable diff base; generation equality was checked, diff guard skipped.');
  process.exit(process.exitCode||0);
}

const baseConfig=fromBase(`${app}/app-config.js`);
const baseSw=fromBase(`${app}/sw.js`);
if(!baseConfig||!baseSw){
  console.log('• Base app config/service worker unavailable; generation equality was checked, diff guard skipped.');
  process.exit(process.exitCode||0);
}

const changed=git(['diff','--name-only',base,'HEAD','--',app]).split('\n').map(x=>x.trim()).filter(Boolean);
const protectedPaths=new Set([...cachedPaths(baseSw),...cachedPaths(currentSw),`${app}/sw.js`]);
const runtimeChanged=changed.filter(file=>protectedPaths.has(file));
const baseBuild=buildId(baseConfig);

if(runtimeChanged.length&&currentBuild===baseBuild){
  fail(`PWA-cached runtime changed without a new buildId: ${runtimeChanged.join(', ')}`);
}else if(runtimeChanged.length){
  console.log(`✓ PWA build generation advanced: ${baseBuild||'(missing)'} → ${currentBuild}`);
  console.log(`✓ Cached runtime changes covered: ${runtimeChanged.join(', ')}`);
}else{
  console.log('✓ No cached runtime files changed; buildId bump not required.');
}

process.exit(process.exitCode||0);
