import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const axePath=require.resolve('axe-core/axe.min.js');
const supabaseMock=fs.readFileSync(fileURLToPath(new URL('./supabase-browser-mock.js',import.meta.url)),'utf8');
const leafletMock=fs.readFileSync(fileURLToPath(new URL('./leaflet-browser-mock.js',import.meta.url)),'utf8');
const expectedRoutes=['home','now','log','audio','analysis','map','calendar','qsl','guide','smart','atlas','ai','memory','propagation'];

async function installNetworkMocks(page,{supabaseMode='mock'}={}){
  await page.route(/https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\.116\.0(?:\/.*)?/,route=>supabaseMode==='abort'?route.abort('failed'):route.fulfill({status:200,contentType:'application/javascript',body:supabaseMock}));
  await page.route(/https:\/\/unpkg\.com\/leaflet@1\.9\.4\/dist\/leaflet\.js(?:\?.*)?/,route=>route.fulfill({status:200,contentType:'application/javascript',body:leafletMock}));
  await page.route(/https:\/\/unpkg\.com\/leaflet@1\.9\.4\/dist\/leaflet\.css(?:\?.*)?/,route=>route.fulfill({status:200,contentType:'text/css',body:''}));
  await page.route(/https:\/\/services\.swpc\.noaa\.gov\/.*/,route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
}

async function boot(page){
  await installNetworkMocks(page);
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(String(error?.message||error)));
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.R?.bootstrap?.ready===true,null,{timeout:15_000});
  await page.waitForFunction(()=>window.R?.me?.id==='browser-audit-user',null,{timeout:10_000});
  await expect(page.locator('#appView')).toBeVisible();
  await expect(page.locator('#authView')).toBeHidden();
  await expect(page.locator('#appBootstrapFatal')).toHaveCount(0);
  return pageErrors;
}

async function assertNoHorizontalOverflow(page){
  const delta=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body?.scrollWidth||0)-window.innerWidth);
  expect(delta,'page should not overflow horizontally').toBeLessThanOrEqual(2);
}

async function go(page,route){
  await page.evaluate(name=>window.R.router.go(name,{source:'browser-audit',historyMode:'none'}),route);
  await expect(page.locator(`#tab-${route}`)).toBeVisible();
  const visible=page.locator('.tab-view:not(.hidden)');
  await expect(visible).toHaveCount(1);
  await assertNoHorizontalOverflow(page);
}

test('Supabase CDN failure degrades to one accessible dependency error without boot cascade',async({page})=>{
  await installNetworkMocks(page,{supabaseMode:'abort'});
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(String(error?.message||error)));
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#appDependencyFatal')).toBeVisible();
  await expect(page.locator('#appDependencyFatal')).toContainText('Uygulama bileşeni yüklenemedi');
  await expect(page.locator('html')).toHaveAttribute('data-app-dependency-error','supabase');
  const state=await page.evaluate(()=>({dependency:window.R?.dependencyError?.key||null,bootstrap:!!window.R?.bootstrap}));
  expect(state.dependency).toBe('supabase');
  expect(state.bootstrap,'bootstrap must not start after a required dependency failure').toBe(false);
  expect(pageErrors,'dependency failure should be handled without uncaught page errors').toEqual([]);
});

test('authenticated shell boots with the correct responsive navigation',async({page},testInfo)=>{
  const pageErrors=await boot(page);
  const mobile=/^(mobile|tablet)-/.test(testInfo.project.name);
  await expect(page.locator('html')).toHaveAttribute('data-ui-mode',mobile?'mobile':'desktop');
  if(mobile){
    await expect(page.locator('#v38Dock')).toBeVisible();
    await expect(page.locator('#appDesktopNav')).toHaveCount(0);
  }else{
    await expect(page.locator('#appDesktopNav')).toBeVisible();
    await expect(page.locator('#v38Dock')).toHaveCount(0);
  }
  const targets=await page.locator(mobile?'#v38Dock button':'#appDesktopNav button').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return{w:r.width,h:r.height,label:node.textContent?.trim()||''}}));
  expect(targets.length).toBeGreaterThanOrEqual(5);
  for(const target of targets){
    expect(target.w,`${target.label} width`).toBeGreaterThanOrEqual(44);
    expect(target.h,`${target.label} height`).toBeGreaterThanOrEqual(44);
  }
  expect(pageErrors,'uncaught browser errors during shell boot').toEqual([]);
});

test('startup preload budget stays bounded and avoids heavy optional modules',async({page})=>{
  const pageErrors=await boot(page);
  const preload=await page.evaluate(()=>({
    declared:[...(window.R?.bootstrap?.startupPreload||[])],
    links:[...document.querySelectorAll('link[data-app-preload]')].map(x=>x.dataset.appPreload)
  }));
  expect(preload.declared.length,'startup preload budget').toBeLessThanOrEqual(16);
  expect(preload.links.length,'rendered preload links').toBe(preload.declared.length);
  for(const critical of ['app-foundation.js','app-runtime-core.js','app-auth-service.js','app-router-core.js','app-auth-ui.js'])expect(preload.declared).toContain(critical);
  for(const heavy of ['app-ai-ui.js','app-atlas-ui.js','app-memory.js','app-map-ui.js'])expect(preload.declared).not.toContain(heavy);
  expect(pageErrors,'uncaught browser errors during bounded preload boot').toEqual([]);
});

test('responsive shell follows live viewport width across the 960px boundary',async({page})=>{
  const pageErrors=await boot(page);
  await page.setViewportSize({width:1200,height:800});
  await expect(page.locator('html')).toHaveAttribute('data-ui-mode','desktop');
  await expect(page.locator('#appDesktopNav')).toBeVisible();
  await expect(page.locator('#v38Dock')).toHaveCount(0);
  await page.setViewportSize({width:700,height:900});
  await expect(page.locator('html')).toHaveAttribute('data-ui-mode','mobile');
  await expect(page.locator('#v38Dock')).toBeVisible();
  await expect(page.locator('#appDesktopNav')).toHaveCount(0);
  await assertNoHorizontalOverflow(page);
  await page.setViewportSize({width:1100,height:800});
  await expect(page.locator('html')).toHaveAttribute('data-ui-mode','desktop');
  await expect(page.locator('#appDesktopNav')).toBeVisible();
  await expect(page.locator('#v38Dock')).toHaveCount(0);
  await assertNoHorizontalOverflow(page);
  expect(pageErrors,'uncaught browser errors during live viewport changes').toEqual([]);
});

test('all application routes render one view without horizontal overflow',async({page})=>{
  const pageErrors=await boot(page);
  const routes=await page.evaluate(()=>window.R.router.routes());
  for(const route of expectedRoutes)expect(routes).toContain(route);
  for(const route of expectedRoutes)await go(page,route);
  expect(pageErrors,'uncaught browser errors while traversing routes').toEqual([]);
});

test('map provides an actionable fallback while offline',async({page,context})=>{
  const pageErrors=await boot(page);
  await context.setOffline(true);
  try{
    await go(page,'map');
    await expect(page.locator('#map .app-map-fallback')).toBeVisible();
    await expect(page.locator('#map .app-map-fallback')).toContainText('Harita zemini çevrimdışı kullanılamıyor.');
    await expect(page.locator('#map [data-map-open-log]')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    expect(pageErrors,'uncaught browser errors during offline map fallback').toEqual([]);
  }finally{
    await context.setOffline(false);
  }
});

test('local-device cleanup explains scope and completes without cloud deletion',async({page})=>{
  const pageErrors=await boot(page);
  await page.evaluate(()=>window.R.menuUI.localData());
  const sheet=page.locator('#v38Sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText('Yalnız bu cihazdaki veriler temizlenir.');
  await expect(sheet).toContainText('Buluttaki Günlük, Favoriler, Ayarlar ve Hatırlatıcılar silinmez.');
  const clear=sheet.locator('[data-action="local-data-clear"]');
  await expect(clear).toBeVisible();
  const box=await clear.boundingBox();
  expect(box?.height||0,'local cleanup touch height').toBeGreaterThanOrEqual(44);
  await clear.click();
  await expect(page.locator('#v38Sheet')).toContainText(/temizlenecek yerel veri yok|Yerel veri durumu/);
  expect(pageErrors,'uncaught browser errors during local-device cleanup').toEqual([]);
});

test('home surface has no critical axe violations and produces light/dark visual artifacts',async({page},testInfo)=>{
  const pageErrors=await boot(page);
  await go(page,'home');
  await page.screenshot({path:testInfo.outputPath('home-light.png'),fullPage:true});
  await page.addScriptTag({path:axePath});
  const result=await page.evaluate(async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}}));
  const critical=result.violations.filter(x=>x.impact==='critical');
  await testInfo.attach('axe-report',{body:Buffer.from(JSON.stringify({violations:result.violations.map(x=>({id:x.id,impact:x.impact,help:x.help,nodes:x.nodes.length}))},null,2)),contentType:'application/json'});
  expect(critical.map(x=>`${x.id}: ${x.help}`),'critical axe violations').toEqual([]);
  await page.evaluate(()=>{document.documentElement.classList.add('night');document.body.classList.add('night-mode')});
  await page.screenshot({path:testInfo.outputPath('home-dark.png'),fullPage:true});
  await assertNoHorizontalOverflow(page);
  expect(pageErrors,'uncaught browser errors during visual/a11y audit').toEqual([]);
});

test('Now and Journal surfaces render stable visual artifacts',async({page},testInfo)=>{
  const pageErrors=await boot(page);
  await go(page,'now');
  await page.screenshot({path:testInfo.outputPath('now-light.png'),fullPage:true});
  await go(page,'log');
  await page.screenshot({path:testInfo.outputPath('journal-light.png'),fullPage:true});
  expect(pageErrors,'uncaught browser errors during core surface audit').toEqual([]);
});
