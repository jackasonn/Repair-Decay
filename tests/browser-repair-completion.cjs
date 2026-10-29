// Headless Chromium: visual completion animation, five real repair paths,
// timed auto-close, no premature celebration, and dismissal safeguards.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = 'http://127.0.0.1:8765/';
const viewports = [{width:1440,height:900},{width:390,height:844}];
async function complete(page,track) {
  await page.evaluate(id=>{
    state.playing=false;
    state.audio=null;
    trackState[id].events=[{type:'lowpass',severity:30,name:'LOW PASS FILTER'}];
    trackState[id].lowpass=400;
    if (id==='vocals') {
      state.playing=true;
      const first=ON_TIME_LYRICS[0];
      audibleSongPosition=()=>first.start+.1;
    }
    openTrackDialog(id);
    if (id==='drums') {
      const note=rhythm.targets.find(n=>n.type==='lowpass');
      if(!note || !completeDrumTarget(note,rhythm.elapsed,200,115))
        throw Error('Drum line could not be repaired');
    } else if (id==='guitars') {
      const target=guitarRepair.targets.find(n=>n.type==='lowpass');
      if(!target)throw Error('Guitar target missing');
      target.visible=true;
      renderGuitarTargets();
      const button=els.guitarTargets.querySelector('[data-guitar-target="'+target.id+'"]');
      if(!button)throw Error('Guitar button missing');
      button.click();
    } else if (id==='keys') {
      const note=keysRepair.notes.find(n=>n.type==='lowpass');
      if(!note)throw Error('Keys note missing');
      if(!completeKeysTarget(note,performance.now(),0,30))throw Error('Keys note not repaired');
    } else if (id==='vocals') {
      const line=ON_TIME_LYRICS[0];
      updateVocalRepair();
      els.vocalInput.value=vocalChallenge(line).expected;
      handleVocalInput({isComposing:false});
    } else if (id==='bass') {
      const slot=bassRepair.slots.find(s=>s.status==='active'&&s.type==='lowpass');
      const index=bassRepair.slots.indexOf(slot);
      if(index<0)throw Error('Bass tuner missing');
      els.bassTuners.querySelector('[data-bass-peg="'+index+'"]').click();
      slot.startedAt=performance.now()-BASS_TURN_MS-5;
      updateBassRepair(performance.now());
    }
    if(trackState[id].events.length)throw Error('Final decay still active: '+id);
  },track);
  // The tick scales in from a small size: measure it after the pop animation.
  await page.waitForTimeout(480);
  const overlay=await page.evaluate(()=>{
    const o=document.getElementById('repair-complete-overlay');
    const tick=o.querySelector('.repair-complete-tick').getBoundingClientRect();
    const box=o.getBoundingClientRect();
    const dlg=els.dialog.getBoundingClientRect();
    return {hidden:o.hidden,display:getComputedStyle(o).display,
      animation:getComputedStyle(o.querySelector('.repair-complete-tick')).animationName,
      text:o.querySelector('.repair-complete-message').textContent,
      width:box.width,height:box.height,tickWidth:tick.width,
      popupWidth:dlg.width,popupHeight:dlg.height,
      scheduled:repairCompletion?.trackId};
  });
  assert.equal(overlay.hidden,false,track+' completion must become visible');
  assert.equal(overlay.display,'grid',track+' overlay is not displayed');
  assert.equal(overlay.scheduled,track,track+' completion session is not recorded');
  assert.equal(overlay.text,'FULLY REPAIRED');
  assert.ok(overlay.animation.includes('repairCompletePop'),track+' tick animation missing');
  assert.ok(overlay.tickWidth>=140,'The green tick should be large and readable');
  assert.ok(Math.abs(overlay.width-overlay.popupWidth)<3,track+' overlay must cover its popup');
  assert.ok(Math.abs(overlay.height-overlay.popupHeight)<3,track+' overlay must fill popup height');
  assert.equal(await page.locator('#track-dialog').evaluate(el=>el.open),true);
  await page.waitForTimeout(1450);
  assert.equal(await page.locator('#track-dialog').evaluate(el=>el.open),false,
    track+' popup must automatically close after the animation');
  assert.equal(await page.locator('#repair-complete-overlay').evaluate(el=>el.hidden),true,
    track+' overlay must reset for the next game');
  console.log('PASS '+track+' tick appears and dialog auto-closes');
}
async function checkViewport(browser,viewport){
  const page=await browser.newPage({viewport});
  await page.addInitScript(()=>{
    Object.defineProperty(window,'AudioContext',{value:undefined,configurable:true});
    Object.defineProperty(window,'webkitAudioContext',{value:undefined,configurable:true});
  });
  await page.goto(base,{waitUntil:'load',timeout:45000});
  await page.evaluate(()=>document.fonts.ready);
  for(const track of ['drums','guitars','keys','bass','vocals'])await complete(page,track);
  await page.evaluate(()=>{
    state.playing=false;
    trackState.keys.events=[];
    openTrackDialog('keys');
  });
  assert.equal(await page.locator('#repair-complete-overlay').evaluate(el=>el.hidden),true,
    'Opening a clean panel should not show completion');
  await page.evaluate(()=>closeTrackDialog());
  if(viewport.width===1440){
    await page.evaluate(()=>{
      trackState.guitars.events=[{type:'lowpass',severity:20},{type:'delay',severity:20}];
      openTrackDialog('guitars');
      repairTrackEventType('guitars','lowpass');
      closeRepairedDialog('guitars');
    });
    assert.equal(await page.locator('#repair-complete-overlay').evaluate(el=>el.hidden),true,
      'Partial repair must never trigger completion');
    await page.evaluate(()=>{
      repairTrackEventType('guitars','delay');closeRepairedDialog('guitars');
      closeTrackDialog(); // Visitor dismisses while the animation is running.
      trackState.keys.events=[{type:'highpass',severity:20}];
      openTrackDialog('keys');
    });
    await page.waitForTimeout(1450);
    assert.equal(await page.locator('#track-dialog').evaluate(el=>el.open),true,
      'Old completion timer must not close another game');
    await page.evaluate(()=>closeTrackDialog());
    await page.evaluate(()=>{
      trackState.guitars.events=[{type:'lowpass',severity:30}];
      openTrackDialog('guitars');
      repairTrackEventType('guitars','lowpass');closeRepairedDialog('guitars');
      trackState.guitars.events.push({type:'delay',severity:20});
    });
    await page.waitForTimeout(1450);
    assert.equal(await page.locator('#track-dialog').evaluate(el=>el.open),true,
      'New decay must prevent auto-close');
    assert.equal(await page.locator('#repair-complete-overlay').evaluate(el=>el.hidden),true,
      'New decay must dismiss the completed overlay');
    await page.evaluate(()=>closeTrackDialog());
  }
  console.log('PASS completion view '+viewport.width+'x'+viewport.height);
  await page.close();
}
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
  try{for(const viewport of viewports)await checkViewport(browser,viewport);}
  finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
