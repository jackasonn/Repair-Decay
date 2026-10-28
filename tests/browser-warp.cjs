// Render WARP through the actual pitch-shifter worklet. The source oscillator
// stays fixed at 220 Hz; only the pitch-shift parameter receives moving cents.
const { chromium }=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
  try {
    const page=await browser.newPage();
    await page.goto('http://127.0.0.1:8765/',{waitUntil:'load'});
    const stats=await page.evaluate(async()=>{
      const rate=44100, duration=2.6, baseHz=220;
      async function render(depth){
        const context=new OfflineAudioContext(1,Math.round(duration*rate),rate);
        await context.audioWorklet.addModule('js/audio/pitch-shifter.js?v=20261029-true-pitch-shift');
        const source=context.createOscillator();
        source.type='sine';source.frequency.value=baseHz;
        const shifter=new AudioWorkletNode(context,'pitch-shifter',{
          numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1],
          parameterData:{pitchCents:0}
        });
        source.connect(shifter).connect(context.destination);
        if(depth){
          const wobble=context.createOscillator();
          const wobbleDepth=context.createGain();
          wobble.frequency.value=1.65;wobbleDepth.gain.value=depth;
          wobble.connect(wobbleDepth).connect(shifter.parameters.get('pitchCents'));
          wobble.start(0);
          const flutter=context.createOscillator(),flutterDepth=context.createGain();
          flutter.frequency.value=5.2;flutterDepth.gain.value=depth*.22;
          flutter.connect(flutterDepth).connect(shifter.parameters.get('pitchCents'));
          flutter.start(0);
        }
        source.start(0);
        const audio=await context.startRendering();
        const samples=audio.getChannelData(0);
        function approxHz(start,seconds=.24) {
          const first=Math.floor(start*rate),last=Math.floor((start+seconds)*rate);
          let crossings=0;
          for(let i=first+1;i<last;i++)if(samples[i-1]<=0&&samples[i]>0)crossings++;
          return crossings/seconds;
        }
        const windows=[.35,.62,.89,1.16,1.43,1.70,1.97,2.22].map(t=>approxHz(t));
        let energy=0;
        for(let i=Math.floor(.3*rate);i<samples.length;i++)energy+=samples[i]*samples[i];
        return {duration:audio.duration,frequencies:windows,rms:Math.sqrt(energy/(samples.length-.3*rate))};
      }
      return {neutral:await render(0),warp:await render(105)};
    });
    console.log('Pitch-shift worklet offline audio rendering:',JSON.stringify(stats));
    const neutral=stats.neutral,warp=stats.warp;
    assert.ok(Math.abs(neutral.duration-warp.duration)<1e-6,'WARP must not change rendered audio duration');
    assert.ok(neutral.rms>.002&&warp.rms>.002,'Audio must be audible with and without WARP');
    const spread=arr=>Math.max(...arr)-Math.min(...arr);
    assert.ok(spread(warp.frequencies)>spread(neutral.frequencies)+8,
      'WARP must produce clearly moving pitch, not just the same frequency as the neutral signal');
    console.log('PASS: real WARP AudioWorklet changes pitch over time without altering duration');
    await page.close();
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
