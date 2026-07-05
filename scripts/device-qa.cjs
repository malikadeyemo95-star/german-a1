const assert = require('node:assert/strict');
const { chromium, devices, webkit } = require('playwright');

(async () => {
  const chrome = await chromium.launch({ headless:true });
  const android = await chrome.newContext({ ...devices['Pixel 7'] });
  const androidPage = await android.newPage();
  await androidPage.goto('http://127.0.0.1:8765/?android-qa=1');
  await androidPage.evaluate(() => navigator.serviceWorker.ready);
  const androidResult = await androidPage.evaluate(async () => {
    const manifest = await fetch('./manifest.json').then((response) => response.json());
    return {
      standalone:manifest.display === 'standalone',
      worker:Boolean(navigator.serviceWorker.controller || await navigator.serviceWorker.ready),
      overflow:document.documentElement.scrollWidth > innerWidth,
    };
  });
  assert.deepEqual(androidResult,{standalone:true,worker:true,overflow:false});
  await android.close();
  await chrome.close();

  const safari = await webkit.launch({ headless:true });
  const iphone = await safari.newContext({ ...devices['iPhone 13'] });
  const iphonePage = await iphone.newPage();
  const errors = [];
  iphonePage.on('pageerror',(error)=>errors.push(error.message));
  await iphonePage.goto('http://127.0.0.1:8765/?webkit-qa=1#day/1');
  await iphonePage.waitForTimeout(1400);
  await iphonePage.locator('.section-card[data-type="speaking"] summary').click();
  await iphonePage.locator('.microphone-button').click();
  const webkitResult = await iphonePage.evaluate(() => ({
    overflow:document.documentElement.scrollWidth > innerWidth,
    speechApi:'speechSynthesis' in window,
    recognitionApi:Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    visibleSpeakers:[...document.querySelectorAll('.speak-button')].filter((button)=>!button.hidden).length,
    sections:document.querySelectorAll('.section-card').length,
    speakingCoaches:document.querySelectorAll('.speaking-coach').length,
    manualFallbackVisible:!document.querySelector('.speaking-manual').hidden,
  }));
  assert.equal(webkitResult.overflow,false);
  assert.equal(webkitResult.sections,12);
  assert.equal(webkitResult.speakingCoaches,1);
  assert.ok(webkitResult.recognitionApi || webkitResult.manualFallbackVisible);
  assert.ok(webkitResult.speechApi ? webkitResult.visibleSpeakers > 0 : webkitResult.visibleSpeakers === 0);
  assert.deepEqual(errors,[]);
  await iphone.close();
  await safari.close();
  console.log(`Android Chromium installability/service worker and iPhone WebKit audio + speaking fallback verified (${webkitResult.visibleSpeakers} speaker controls).`);
})().catch((error)=>{console.error(error);process.exit(1);});
