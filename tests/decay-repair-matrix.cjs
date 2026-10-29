// Complete state-to-audio repair matrix. All four songs, every eligible stem,
// all eight effects, individual and global repairs, and defensive legacy duplicates.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
class Param {
  constructor(value=0){this.value=value;this.calls=[];}
  setTargetAtTime(value,when,tau){this.value=value;this.calls.push({value,when,tau});}
  cancelScheduledValues(when){this.cancelledAt=when;}
}
class Node {
  constructor(){this.connected=[];this.started=false;this.stopped=false;}
  connect(node){this.connected.push(node);return node;}
  disconnect(){this.connected=[];this.disconnected=true;}
  start(when){this.started=true;this.startedAt=when;}
  stop(when){this.stopped=true;this.stoppedAt=when;}
}
class BufferSource extends Node {
  constructor(){super();this.playbackRate=new Param(1);this.loop=false;}
}
class Gain extends Node {constructor(){super();this.gain=new Param(1);}}
class Audio {
  constructor(){this.currentTime=12;this.sampleRate=44100;this.created=[];}
  createGain(){const node=new Gain();this.created.push(node);return node;}
  createBufferSource(){const node=new BufferSource();this.created.push(node);return node;}
}
const fakeMath=Object.create(Math);
let draws=[];
fakeMath.random=()=>draws.length?draws.shift():0.5;
const audio=new Audio();
const context=vm.createContext({
  console,Date,Math:fakeMath,Set,Map,WeakMap,Float32Array,Array,
  document:{addEventListener(){}},performance:{now:()=>1250},mockAudio:audio,
  setTimeout(){return 1;},clearTimeout(){}
});
vm.runInContext(fs.readFileSync('js/app.js','utf8'),context);
const run=code=>vm.runInContext(code,context);
run("updateUI=()=>{};updateDialog=()=>{};updateTrackAudioVisuals=()=>{};addLog=()=>{};playSwitchSound=()=>{};playRepairSuccess=()=>{};closeRepairedDialog=()=>{};scheduleNextEvent=()=>{};state.playing=true;state.pitchReady=true;state.audio=mockAudio;state.crackleBuffer={duration:2};");
function mockChain(){
  const chain={
    highpass:{frequency:new Param(20)},lowpass:{frequency:new Param(20000)},
    crush:{curve:null},phaseDepth:{gain:new Param(0)},
    warpDepth:{gain:new Param(0)},warpFlutterDepth:{gain:new Param(0)},
    delayGainOne:{gain:new Param(0)},delayGainTwo:{gain:new Param(0)},
    delayGainThree:{gain:new Param(0)},artifactGain:new Node(),
    pitchShift:{parameters:new Map([['pitchCents',new Param(0)]])},
    crackleSource:null,crackleGain:null
  };
  return chain;
}
function fresh(song){
  run('currentSongIndex='+song+';TRACKS=SONGS[currentSongIndex].tracks;trackState=createTrackState(TRACKS);state.playing=true;state.pitchReady=true;state.overallDialog=false;state.sources={};');
  context.mockChains={};
  for(const id of run('TRACKS.map(t=>t.id)'))context.mockChains[id]=mockChain();
  run('state.sources=mockChains');
}
function events(track){return run("trackState['"+track+"'].events.map(e=>e.type)");}
function state(track,property){return run("trackState['"+track+"']."+property);}
function audioState(track,type){return context.mockChains[track];}
function effectIsNeutral(type,s,chain){
  switch(type){
    case 'detune': assert.equal(s.detune,0);assert.equal(chain.pitchShift.parameters.get('pitchCents').value,0);break;
    case 'highpass': assert.equal(s.highpass,20);assert.equal(chain.highpass.frequency.value,20);break;
    case 'lowpass': assert.equal(s.lowpass,20000);assert.equal(chain.lowpass.frequency.value,20000);break;
    case 'bitcrush': assert.equal(s.bitDepth,16);assert.ok(chain.crush.curve instanceof Float32Array);break;
    case 'phase': assert.equal(s.phaseDepth,0);assert.equal(chain.phaseDepth.gain.value,0);break;
    case 'warp': assert.equal(s.warpDepth,0);assert.equal(chain.warpDepth.gain.value,0);
      assert.equal(chain.warpFlutterDepth.gain.value,0);break;
    case 'delay': assert.equal(s.delayDepth,0);for(const key of ['delayGainOne','delayGainTwo','delayGainThree']){
      assert.equal(chain[key].gain.value,0,'All delay taps must return to zero');
      assert.equal(chain[key].gain.calls.at(-1).tau,.018,'Echo tails should fade quickly');
    }break;
    case 'crackle': assert.equal(s.crackleDepth,0);assert.equal(chain.crackleSource,null);
      assert.equal(chain.crackleGain,null);break;
  }
}
const types=Array.from(run('EVENT_TYPES.map(t=>t.id)'));
const names=Array.from(run('SONGS.map(song=>song.id)'));
const counts=[];
for(let song=0;song<names.length;song++){
  const songTracks=Array.from(run('SONGS['+song+'].tracks.map(t=>t.id)'));
  let passed=0;
  for(const id of songTracks)for(const type of types){
    if(type==='warp' && id==='drums')continue;
    fresh(song);
    const available=types.slice();
    const eligible=songTracks.filter(track=>type!=='warp'||track!=='drums');
    const index=eligible.indexOf(id);
    draws=[(available.indexOf(type)+.1)/available.length,(index+.1)/eligible.length,.5,.6,.5,.5,.5];
    run('applyEvent()');
    assert.deepEqual(Array.from(events(id)),[type],names[song]+'/'+id+'/'+type+' event did not activate on intended stem');
    const chain=audioState(id,type);
    if(type==='crackle'){
      assert.ok(chain.crackleSource,'Crackle must have an active continuous audio source');
      assert.ok(chain.crackleSource.loop,'Crackle must loop until repaired');
      assert.ok(chain.crackleSource.started,'Crackle should actually start playing');
      assert.ok(chain.crackleGain.gain.value>0,'Crackle output must be audible');
      assert.ok(chain.crackleSource.connected.includes(chain.crackleGain));
      assert.ok(chain.crackleGain.connected.includes(chain.artifactGain));
    }
    if(type==='delay'){
      assert.ok(chain.delayGainOne.gain.value>0);
      assert.ok(chain.delayGainTwo.gain.value>0);
      assert.ok(chain.delayGainThree.gain.value>0);
    }
    const before=audio.created.filter(x=>x instanceof BufferSource).length;
    const removed=run("repairTrackEventType('"+id+"','"+type+"')");
    assert.equal(removed,1);
    assert.equal(events(id).length,0);
    const s={detune:state(id,'detune'),highpass:state(id,'highpass'),lowpass:state(id,'lowpass'),
      bitDepth:state(id,'bitDepth'),phaseDepth:state(id,'phaseDepth'),warpDepth:state(id,'warpDepth'),
      delayDepth:state(id,'delayDepth'),crackleDepth:state(id,'crackleDepth')};
    effectIsNeutral(type,s,chain);
    if(type==='crackle')assert.equal(audio.created.filter(x=>x instanceof BufferSource).length,before,
      'Repair must not schedule new crackle bursts');
    assert.equal(run('state.playing'),true,'Repair may not pause the album');
    assert.equal(run('state.sources===mockChains'),true,'Repair may not restart the stems');
    passed++;
  }
  counts.push({song:names[song],tracks:songTracks.length,combinations:passed});
}
// Global repair: one type across every stem, other effect types remain active.
for(let song=0;song<names.length;song++){
  for(const type of types){
    fresh(song);
    const ids=Array.from(run('TRACKS.map(t=>t.id)')).filter(id=>type!=='warp'||id!=='drums');
    run('state.overallDialog=true;state.selectedTrack=null;');
    for(const id of ids){
      const e={type,name:type,severity:20};
      context.currentEvent=e;
      run("trackState['"+id+"'].events.push(currentEvent)");
      const chain=audioState(id,type);
      if(type==='highpass'){run("trackState['"+id+"'].highpass=750");chain.highpass.frequency.value=750;}
      if(type==='lowpass'){run("trackState['"+id+"'].lowpass=900");chain.lowpass.frequency.value=900;}
      if(type==='detune'){run("trackState['"+id+"'].detune=100");chain.pitchShift.parameters.get('pitchCents').value=100;}
      if(type==='warp'){run("trackState['"+id+"'].warpDepth=120");chain.warpDepth.gain.value=120;chain.warpFlutterDepth.gain.value=26.4;}
      if(type==='phase'){run("trackState['"+id+"'].phaseDepth=.5");chain.phaseDepth.gain.value=.5;}
      if(type==='bitcrush')run("trackState['"+id+"'].bitDepth=5");
      if(type==='delay'){run("trackState['"+id+"'].delayDepth=.6");run("setDelayEffect(state.sources['"+id+"'],.6)");}
      if(type==='crackle'){run("trackState['"+id+"'].crackleDepth=.45");run("setCrackleEffect(state.sources['"+id+"'],.45)");}
    }
    run("repairGlobalEventType('"+type+"')");
    for(const id of ids){
      assert.equal(events(id).length,0,'Global repair did not clear '+names[song]+'/'+id+'/'+type);
      const chain=audioState(id,type);
      const s={detune:state(id,'detune'),highpass:state(id,'highpass'),lowpass:state(id,'lowpass'),
        bitDepth:state(id,'bitDepth'),phaseDepth:state(id,'phaseDepth'),warpDepth:state(id,'warpDepth'),
        delayDepth:state(id,'delayDepth'),crackleDepth:state(id,'crackleDepth')};
      effectIsNeutral(type,s,chain);
    }
    run('state.overallDialog=false');
  }
}
// Vocal repairs with two different effects: only the selected event is removed.
for(const song of [0,2,3]){
  fresh(song);
  context.currentEvent={type:'lowpass',name:'LOW PASS',severity:20};
  run("trackState.vocals.events.push(currentEvent);trackState.vocals.lowpass=1250");
  context.mockChains.vocals.lowpass.frequency.value=1250;
  context.currentEvent={type:'delay',name:'DELAY',severity:20};
  run('trackState.vocals.events.push(currentEvent);trackState.vocals.delayDepth=.55;setDelayEffect(state.sources.vocals,.55)');
  run("repairSingleTrackEvent('vocals',trackState.vocals.events[0])");
  assert.deepEqual(Array.from(events('vocals')),['delay']);
  assert.equal(context.mockChains.vocals.lowpass.frequency.value,20000);
  assert.ok(context.mockChains.vocals.delayGainOne.gain.value>0,'Remaining Delay must stay active');
  run("repairSingleTrackEvent('vocals',trackState.vocals.events[0])");
  assert.equal(events('vocals').length,0);
  for(const key of ['delayGainOne','delayGainTwo','delayGainThree'])assert.equal(context.mockChains.vocals[key].gain.value,0);
}
// Legacy duplicate guard: a first Vocal repair must audibly lessen the same type.
fresh(0);
run("trackState.vocals.lowpass=1250;trackState.vocals.events=[{type:'lowpass'},{type:'lowpass'}]");
context.mockChains.vocals.lowpass.frequency.value=1250;
run("repairSingleTrackEvent('vocals',trackState.vocals.events[0])");
assert.equal(events('vocals').length,1);
assert.ok(state('vocals','lowpass')>1250 && state('vocals','lowpass')<20000,
  'Removing one legacy duplicate needs to restore some high frequencies');
assert.equal(context.mockChains.vocals.lowpass.frequency.value,state('vocals','lowpass'));
run("repairSingleTrackEvent('vocals',trackState.vocals.events[0])");
assert.equal(events('vocals').length,0);
assert.equal(context.mockChains.vocals.lowpass.frequency.value,20000);
// Repeated random events must NEVER stack identical types, even when draws repeat.
fresh(0);
draws=[.32,.54,.5,.5,.5];
run('applyEvent()');
const firstType=events('guitars')[0];
if(firstType){
  draws=[.32,.54,.5,.5,.5];
  run('applyEvent()');
  for(const id of Array.from(run('TRACKS.map(t=>t.id)'))){
    const active=Array.from(events(id));
    assert.equal(new Set(active).size,active.length,'Duplicate effects must not stack on '+id);
  }
}
// Interacting effects must remain independent until their own event is fixed.
fresh(0);
run("trackState.keys.events=[{type:'delay'},{type:'crackle'}];trackState.keys.delayDepth=.6;trackState.keys.crackleDepth=.45;setDelayEffect(state.sources.keys,.6);setCrackleEffect(state.sources.keys,.45)");
assert.ok(context.mockChains.keys.crackleSource);
run("repairTrackEventType('keys','delay')");
assert.deepEqual(Array.from(events('keys')),['crackle']);
assert.ok(context.mockChains.keys.crackleSource,'Repairing Delay may not stop unrelated Crackle');
assert.equal(context.mockChains.keys.delayGainOne.gain.value,0);
run("repairTrackEventType('keys','crackle')");
assert.equal(context.mockChains.keys.crackleSource,null);
assert.equal(events('keys').length,0);
fresh(0);
run("trackState.keys.events=[{type:'detune'},{type:'warp'}];trackState.keys.detune=90;trackState.keys.warpDepth=115");
context.mockChains.keys.pitchShift.parameters.get('pitchCents').value=90;
context.mockChains.keys.warpDepth.gain.value=115;
context.mockChains.keys.warpFlutterDepth.gain.value=25.3;
run("repairTrackEventType('keys','detune')");
assert.deepEqual(Array.from(events('keys')),['warp']);
assert.equal(context.mockChains.keys.pitchShift.parameters.get('pitchCents').value,0);
assert.equal(context.mockChains.keys.warpDepth.gain.value,115,'Detune repair must preserve Warp modulation');
run("repairTrackEventType('keys','warp')");
assert.equal(context.mockChains.keys.warpDepth.gain.value,0);
assert.equal(context.mockChains.keys.warpFlutterDepth.gain.value,0);
fresh(0);
run("trackState.keys.events=[{type:'highpass'},{type:'lowpass'}];trackState.keys.highpass=900;trackState.keys.lowpass=1200");
context.mockChains.keys.highpass.frequency.value=900;
context.mockChains.keys.lowpass.frequency.value=1200;
run("repairTrackEventType('keys','highpass')");
assert.deepEqual(Array.from(events('keys')),['lowpass']);
assert.equal(context.mockChains.keys.highpass.frequency.value,20);
assert.equal(context.mockChains.keys.lowpass.frequency.value,1200);
run("repairTrackEventType('keys','lowpass')");
assert.equal(context.mockChains.keys.lowpass.frequency.value,20000);
fresh(0);
run("trackState.keys.events=[{type:'bitcrush'},{type:'phase'}];trackState.keys.bitDepth=3;trackState.keys.phaseDepth=.5");
context.mockChains.keys.phaseDepth.gain.value=.5;
run("repairTrackEventType('keys','bitcrush')");
assert.deepEqual(Array.from(events('keys')),['phase']);
assert.equal(context.mockChains.keys.phaseDepth.gain.value,.5);
run("repairTrackEventType('keys','phase')");
assert.equal(context.mockChains.keys.phaseDepth.gain.value,0);
// Global repair only removes the selected type; other types stay on their stems.
fresh(0);
run("TRACKS.forEach(t=>{trackState[t.id].events.push({type:'lowpass'});trackState[t.id].lowpass=1350;state.sources[t.id].lowpass.frequency.value=1350});trackState.bass.events.push({type:'phase'});trackState.bass.phaseDepth=.4;state.sources.bass.phaseDepth.gain.value=.4;state.overallDialog=true");
run("repairGlobalEventType('lowpass')");
for(const id of Array.from(run('TRACKS.map(t=>t.id)')))assert.equal(state(id,'lowpass'),20000);
assert.deepEqual(Array.from(events('bass')),['phase']);
assert.equal(context.mockChains.bass.phaseDepth.gain.value,.4);
// Rainy Night has a Vocal stem but no lyric challenge; its switches must work.
fresh(2);
assert.equal(run('vocalTypingAvailable()'),false);
assert.equal(run("TRACKS.some(t=>t.id==='vocals')"),true);
run("state.selectedTrack='vocals';trackState.vocals.events=[{type:'lowpass'}];trackState.vocals.lowpass=1000;state.sources.vocals.lowpass.frequency.value=1000;repairEventType('lowpass')");
assert.equal(events('vocals').length,0);
assert.equal(context.mockChains.vocals.lowpass.frequency.value,20000);
// Exercise repeated random draws: all active types stay unique on each track.
fresh(0);
for(let i=0;i<90;i++){
  draws=[0,0,.5,.5,.5,.5];
  run('applyEvent()');
}
for(const id of Array.from(run('TRACKS.map(t=>t.id)'))){
  const active=Array.from(events(id));
  assert.equal(new Set(active).size,active.length,'Random decay stacked the same type on '+id);
}

// In a saturated song, decay must not throw or fabricate an event.
fresh(1);
run('TRACKS.forEach(t=>trackState[t.id].events=EVENT_TYPES.filter(e=>e.id!=="warp"||t.id!=="drums").map(e=>({type:e.id,severity:10})))');
run('applyEvent()');
for(const id of Array.from(run('TRACKS.map(t=>t.id)'))){
  const active=Array.from(events(id));
  assert.equal(new Set(active).size,active.length);
}
console.log('PASS repair matrix',JSON.stringify(counts),
  'individual/ global restores, 3 Vocal songs, legacy duplicate attenuation, persistent crackle and non-stacking scheduling');
