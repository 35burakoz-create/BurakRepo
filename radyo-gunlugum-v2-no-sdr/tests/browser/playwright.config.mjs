import {defineConfig} from '@playwright/test';

const mobileUA='Mozilla/5.0 (Linux; Android 16; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Mobile Safari/537.36';
const tabletUA='Mozilla/5.0 (Linux; Android 16; Pixel Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36';

export default defineConfig({
  testDir:'.',
  testMatch:'**/*.spec.mjs',
  timeout:30_000,
  expect:{timeout:8_000},
  fullyParallel:false,
  retries:1,
  workers:1,
  reporter:[['list'],['html',{outputFolder:'../../../playwright-report',open:'never'}]],
  outputDir:'../../../test-results/browser-audit',
  use:{
    baseURL:'http://127.0.0.1:4173',
    headless:true,
    serviceWorkers:'block',
    trace:'retain-on-failure',
    screenshot:'only-on-failure',
    video:'off'
  },
  webServer:{
    command:'python3 -m http.server 4173 --bind 127.0.0.1 --directory ../..',
    url:'http://127.0.0.1:4173/index.html',
    reuseExistingServer:false,
    timeout:15_000
  },
  projects:[
    {name:'mobile-390x844',use:{viewport:{width:390,height:844},userAgent:mobileUA,isMobile:true,hasTouch:true}},
    {name:'tablet-768x1024',use:{viewport:{width:768,height:1024},userAgent:tabletUA,isMobile:true,hasTouch:true}},
    {name:'laptop-1366x768',use:{viewport:{width:1366,height:768}}},
    {name:'desktop-1440x900',use:{viewport:{width:1440,height:900}}}
  ]
});
