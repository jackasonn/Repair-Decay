// Render each real Web Audio effect, repair at 0.9s and verify the audio
// recovers without restarting a stem or changing the total output length.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
 try {
  const page=await browser.newPage();
  await page.route('**/assets/audio/stems/**',route=>route.abort());
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'load'});
  const results=await page.evaluate(async()=>{
   const rate=24000,duration=1.85,cut=.9;
   const types=['highpass','lowpass','delay','crackle','phase','bitcrush','detune','warp'];
   const rms=(arr,a,b)=>{let sum=0,n=0;for(let i=Math.floor(a*rate);i<Math.floor(b*rate);i++){sum+=arr[i]*arr[i];n++;}return Math.sqrt(sum/n)};
   const peak=(arr,a,b)=>{let max=0;for(let i=Math.floor(a*rate);i<Math.floor(b*rate);i++)max=Math.max(max,Math.abs(arr[i]));return max};
   const estimateHz=(arr,a,b)=>{let zero=0;for(let i=Math.floor(a*rate)+1;i<Math.floor(b*rate);i++)if(arr[i-1]<=0&&arr[i]>0)zero++;return zero/(b-a)};
   const output=[];
   for(const type of types){
     const context=new OfflineAudioContext(2,Math.floor(duration*rate),rate);
     await context.audioWorklet.addModule('js/audio/pitch-shifter.js?v=20261029-true-pitch-shift');
     state.audio=context;state.masterGain=context.destination;state.pitchReady=true;
     state.playing=true;state.sources={};state.overallDialog=false;
     currentSongIndex=0;TRACKS=SONGS[0].tracks;
     trackState=createTrackState(TRACKS);
     const stem=trackState.keys;
     const source=context.createBufferSource();
     const buffer=context.createBuffer(1,Math.floor(duration*rate),rate);
     const data=buffer.getChannelData(0);
     const frequency=type==='lowpass'?4300:220;
     for(let i=0;i<data.length;i++){
       const t=i/rate;
       if(type==='crackle')data[i]=0;
       else if(type==='delay'){
         if(Math.abs(t-.4)<1/rate||Math.abs(t-.73)<1/rate)data[i]=1;
       }else data[i]=Math.sin(2*Math.PI*frequency*t)*.2;
     }
     source.buffer=buffer;
     const chain=makeTrackChain('keys',source);
     state.sources.keys=chain;
     stem.events=[{type,name:type,severity:20}];
     if(type==='highpass'){stem.highpass=1250;chain.highpass.frequency.setValueAtTime(1250,0);}
     if(type==='lowpass'){stem.lowpass=900;chain.lowpass.frequency.setValueAtTime(900,0);}
     if(type==='delay'){stem.delayDepth=.8;setDelayEffect(chain,.8);}
     if(type==='phase'){stem.phaseDepth=.65;chain.phaseDepth.gain.setValueAtTime(.65,0);}
     if(type==='bitcrush'){stem.bitDepth=3;chain.crush.curve=makeBitCurve(3);}
     if(type==='detune'){stem.detune=180;chain.pitchShift.parameters.get('pitchCents').setValueAtTime(180,0);}
     if(type==='warp'){
       stem.warpDepth=105;chain.warpDepth.gain.setValueAtTime(105,0);
       chain.warpFlutterDepth.gain.setValueAtTime(105*.22,0);
     }
     if(type==='crackle'){
       const pops=context.createBuffer(1,rate,rate);
       const noise=pops.getChannelData(0);
       for(let j=0;j<rate;j+=1250)
         for(let k=0;k<100;k++)noise[j+k]=(Math.random()*2-1)*(1-k/100);
       state.crackleBuffer=pops;
       stem.crackleDepth=.55;setCrackleEffect(chain,.55);
     }
     source.start(0);
     const suspended=context.suspend(cut);
     const rendering=context.startRendering();
     await suspended;
     const repaired=repairTrackEventType('keys',type);
     if(repaired!==1||stem.events.length)throw Error(type+' event did not clear');
     if(type==='crackle'&&chain.crackleSource!==null)throw Error('Crackle source survived repair');
     await context.resume();
     const rendered=await rendering;
     const left=rendered.getChannelData(0),right=rendered.getChannelData(1);
     const diff=Float32Array.from(left,(value,i)=>value-right[i]);
     output.push({
       type,duration:rendered.duration,
       priorRms:rms(left,.38,.78),afterRms:rms(left,1.28,1.6),
       priorPeak:peak(left,.38,.78),afterPeak:peak(left,1.28,1.6),
       beforeHz:estimateHz(left,.38,.73),afterHz:estimateHz(left,1.28,1.63),
       stereoBefore:rms(diff,.38,.78),stereoAfter:rms(diff,1.28,1.6),
       delayedEcho:peak(left,1.12,1.21),delayBefore:peak(left,.77,.88)
     });
   }
   return output;
  });
  console.log('Real audio recovery metrics:',JSON.stringify(results));
  const metric=type=>results.find(x=>x.type===type);
  for(const x of results)
    assert.ok(Math.abs(x.duration-1.85)<.002,x.type+' changed playback duration');
  for(const type of ['highpass','lowpass']){
    const s=metric(type);
    assert.ok(s.afterRms>s.priorRms*3,type+' did not restore filtered frequencies');
  }
  const crackle=metric('crackle');
  assert.ok(crackle.priorPeak>.01,'Crackle was inaudible before repair');
  assert.ok(crackle.afterPeak<crackle.priorPeak*.08,'Crackle persisted after repair');
  const delay=metric('delay');
  assert.ok(delay.delayBefore>.015,'Delay failed to produce an echo before repair');
  assert.ok(delay.delayedEcho<.02,'Delay emitted a late echo after repair');
  const detune=metric('detune');
  assert.ok(Math.abs(detune.afterHz-220)<18,'Detune pitch did not restore after repair');
  const phase=metric('phase');
  assert.ok(phase.stereoBefore>phase.stereoAfter*1.4,'Phase panning persisted after repair');
  console.log('PASS eight real Web Audio effects: audible recovery with unchanged playback duration');
  await page.close();
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
