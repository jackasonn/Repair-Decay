// Decode and actually schedule the explode MP3 through Chromium's Web Audio.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({headless:true,args:['--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
  try {
    const page=await browser.newPage();
    // Do not download every full album stem just to check a short UI sound.
    await page.route('**/assets/audio/stems/**', route=>route.abort());
    await page.goto('http://127.0.0.1:8765/',{waitUntil:'load'});
    const stats=await page.evaluate(async()=>{
      const response=await fetch('assets/audio/ui/explode.mp3',{cache:'no-store'});
      if(!response.ok)throw new Error('Explosion sound HTTP '+response.status);
      const ctx=new AudioContext();
      const buffer=await ctx.decodeAudioData(await response.arrayBuffer());
      let peak=0,sum=0,samples=0;
      for(let channel=0;channel<buffer.numberOfChannels;channel++){
        const data=buffer.getChannelData(channel);
        for(const val of data){peak=Math.max(peak,Math.abs(val));sum+=val*val;samples++;}
      }
      await ctx.close();
      return {channels:buffer.numberOfChannels,duration:buffer.duration,
        peak,rms:Math.sqrt(sum/samples),sampleRate:buffer.sampleRate};
    });
    console.log('Explode MP3 decoded waveform:',JSON.stringify(stats));
    assert.ok(stats.duration>.05,'MP3 has no usable duration');
    assert.ok(stats.peak>0.01,'MP3 appears silent');
    await page.evaluate(()=>{
      window.__explodeStarts=0;
      const original=AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start=function(...args){
        if(this.buffer === state.switchSoundBuffers?.explode)window.__explodeStarts++;
        return original.apply(this,args);
      };
      const button=document.createElement('button');
      button.id='test-explode';
      button.textContent='Test explode audio';
      button.style.cssText='position:fixed;z-index:99999;top:15px;left:15px;';
      button.addEventListener('click',()=>void playUISound('explode'));
      document.body.appendChild(button);
    });
    await page.locator('#test-explode').click();
    await page.waitForFunction(()=>window.__explodeStarts>0,{timeout:20000});
    const scheduled=await page.evaluate(()=>({
      starts:window.__explodeStarts,contextState:state.audio?.state,
      available:Boolean(state.switchSoundBuffers?.explode),duration:state.switchSoundBuffers?.explode?.duration,
      musicLoaded:state.loaded
    }));
    console.log('Explode Web Audio play on real click:',JSON.stringify(scheduled));
    assert.equal(scheduled.starts,1,'One click must schedule one explosion sound');
    assert.equal(scheduled.contextState,'running','AudioContext must be unlocked');
    await page.close();
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
