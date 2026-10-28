// Chromium regression checks: geometry, dialogs, responsive grids and background flash.
// Intentionally disable AudioContext to isolate visual layout from downloading album stems.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const viewports=[{width:1440,height:900},{width:1100,height:800},{width:900,height:800},{width:768,height:1024},{width:390,height:844}];
const near=(a,b,tolerance=2)=>Math.abs(a-b)<=tolerance;
async function sample(page, song){
  return page.evaluate(index=>{
    currentSongIndex=index;
    TRACKS=SONGS[index].tracks;
    trackState=songTrackStates[SONGS[index].id];
    renderCurrentSong();updateSongNavigation();renderTracks();updateUI();
    const rect=selector=>{
      const r=document.querySelector(selector).getBoundingClientRect();
      return {width:r.width,height:r.height,left:r.left,right:r.right};
    };
    const cards=Array.from(document.querySelectorAll('.track-card'),el=>el.getBoundingClientRect().width);
    return {grid:rect('.track-grid'),firstCard:rect('.track-card:first-child'),lastCard:rect('.track-card:last-child'),
      cover:rect('#album-art'),panel:rect('#player-panel'),title:rect('#song-title'),
      play:rect('#play-button'),card:rect('.track-card'),log:rect('.log-panel'),
      header:rect('.site-header'),cardWidths:cards,
      columns:getComputedStyle(document.querySelector('.track-grid')).gridTemplateColumns.split(' ').length,
      headerBorder:getComputedStyle(document.querySelector('.site-header')).borderBottomWidth,
      footerBorder:getComputedStyle(document.querySelector('.site-footer')).borderTopWidth,
      scrollWidth:document.documentElement.scrollWidth};
  },song);
}
async function verify(browser, viewport){
  const page=await browser.newPage({viewport,deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    Object.defineProperty(window,'AudioContext',{value:undefined,configurable:true});
    Object.defineProperty(window,'webkitAudioContext',{value:undefined,configurable:true});
  });
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'load',timeout:45000});
  await page.evaluate(()=>document.fonts.ready);
  const visual=await page.evaluate(()=>{
    const logo=document.querySelector('.brand-lockup .wordmark').getBoundingClientRect();
    const credit=document.querySelector('.album-credit').getBoundingClientRect();
    const root=getComputedStyle(document.documentElement);
    const body=getComputedStyle(document.body);
    return {logoBottom:logo.bottom,creditTop:credit.top,
      lockupDirection:getComputedStyle(document.querySelector('.brand-lockup')).flexDirection,
      colors:['--green','--yellow','--red'].map(name=>root.getPropertyValue(name).trim()),
      background:body.backgroundImage};
  });
  assert.equal(visual.lockupDirection,'column','Header credit must stack beneath logo');
  assert.ok(visual.creditTop>=visual.logoBottom-2,'Header credit is still next to the logo');
  assert.deepEqual(visual.colors,['#69aa77','#eab466','#d65d71'],
    'UI state colours should match the chosen cover-art palette');
  assert.ok(visual.background.includes('rgba(3, 3, 3, 0.84)'),
    'Dark backdrop should allow slightly more image detail through');
  const rows=[];
  for(let song=0;song<4;song++){
    const row=await sample(page,song);
    rows.push(row);
    assert.equal(row.cardWidths.length,song===1?4:5,'Incorrect instrument count');
    assert.equal(row.headerBorder,'0px');
    assert.equal(row.footerBorder,'0px');
    assert.ok(row.scrollWidth<=viewport.width+2,'Horizontal page overflow: '+row.scrollWidth);
    assert.ok(row.cardWidths.every(w=>near(w,row.cardWidths[0])),'Unequal instrument card widths');
    assert.ok(row.play.right<=viewport.width+2,'Play button out of view');
    if(viewport.width>850){
      assert.ok(near(row.cover.width,row.cover.height),'Desktop cover is not square');
      assert.ok(near(row.cover.height,row.panel.height),'Desktop player and cover not equal height');
      assert.equal(row.columns,song===1?4:5,'Desktop grid must match the song instrument count');
      if(song===1) {
        const leftSpace=row.firstCard.left-row.grid.left;
        const rightSpace=row.grid.right-row.lastCard.right;
        assert.ok(near(leftSpace,rightSpace),'Reconcile instrument row is not centred');
        assert.ok(leftSpace>0,'Four-card row should preserve the existing card size');
      }
    }else{
      assert.equal(row.columns,viewport.width<=560?1:2,'Incorrect responsive track grid');
    }
  }
  for(const name of ['cover','panel','title','play','card','log','header'])
    for(const dimension of ['width','height'])
      for(let song=1;song<4;song++){
        const difference=Math.abs(rows[song][name][dimension]-rows[0][name][dimension]);
        assert.ok(difference<=2,'Layout shift at '+viewport.width+'px, song '+song+': '+name+'.'+dimension+' changed '+difference+'px');
      }
  await page.evaluate(()=>{currentSongIndex=0;TRACKS=SONGS[0].tracks;trackState=songTrackStates[SONGS[0].id];renderCurrentSong();renderTracks();updateUI();});
  for(const track of ['drums','bass','guitars','keys','vocals']){
    await page.evaluate(id=>openTrackDialog(id),track);
    const popup=await page.locator('#track-dialog').evaluate(el=>{
      const r=el.getBoundingClientRect();return {open:el.open,left:r.left,right:r.right};
    });
    assert.ok(popup.open&&popup.left>=-2&&popup.right<=viewport.width+2,'Dialog out of view: '+track);
    await page.evaluate(()=>closeTrackDialog());
  }
  const flash=await page.evaluate(()=>{
    document.body.classList.add('decay-warning');
    return {z:getComputedStyle(document.body,'::after').zIndex,
      background:getComputedStyle(document.body,'::after').backgroundImage,
      animation:getComputedStyle(document.body,'::after').animationName};
  });
  assert.equal(flash.z,'0','Flash overlay must stay behind controls');
  assert.ok(flash.background.includes('radial-gradient'),'Warning backdrop flash not found');
  assert.ok(flash.animation.includes('screenFlash'),'Warning flash not animated');
  assert.ok(flash.background.includes('234, 180, 102'),'Yellow flash must use the cover-art gold');
  const tints=await page.evaluate(()=>{
    document.body.classList.remove('decay-warning','decay-critical');
    document.body.classList.add('decay-calm');
    const green=getComputedStyle(document.body,'::after').backgroundImage;
    document.body.classList.remove('decay-calm');
    document.body.classList.add('decay-critical');
    const red=getComputedStyle(document.body,'::after').backgroundImage;
    return {green,red};
  });
  assert.ok(tints.green.includes('105, 170, 119'),'Calm state needs a green backdrop tint');
  assert.ok(tints.red.includes('214, 93, 113'),'Critical state needs a coral backdrop tint');
  await page.goto('http://127.0.0.1:8765/about.html',{waitUntil:'load'});
  assert.equal(await page.locator('.site-header').evaluate(el=>getComputedStyle(el).borderBottomWidth),'0px');
  assert.deepEqual(errors,[],'Uncaught browser JavaScript errors');
  console.log('PASS browser '+viewport.width+'x'+viewport.height+': four songs, fixed layout, five dialogs, flash, About page');
  console.log('  cover='+rows[0].cover.width.toFixed(1)+'x'+rows[0].cover.height.toFixed(1)+', card='+rows[0].card.width.toFixed(1)+', cols='+rows[0].columns);
  await page.close();
}
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
  try{for(const viewport of viewports)await verify(browser,viewport);}
  finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
