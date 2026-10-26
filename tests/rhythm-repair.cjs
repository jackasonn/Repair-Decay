// Run with node tests/rhythm-repair.cjs; no packages required.
const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const elements = new Map();
const document = {addEventListener(){},getElementById(id) {
  if (!elements.has(id)) elements.set(id,{textContent:'',value:0,hidden:false});
  return elements.get(id);
}};
const context = vm.createContext({document,console,Date,Math,Set,WeakMap,Float32Array,performance:{now:()=>1000}});
vm.runInContext(fs.readFileSync('script.js','utf8'),context);
const run = code => vm.runInContext(code,context);
run(`
let position = 5;
const actualClock = repairSongPosition;
repairSongPosition = () => position;
drawRepairSignal = () => {};
updateDialog = () => {};
updateUI = () => {};
updateTrackAudioVisuals = () => {};
addLog = () => {};
playSwitchSound = () => {};
let sourceRestarts = 0, closeCalls = 0;
startSources = () => { sourceRestarts++; };
state.buffers = Object.fromEntries(TRACKS.map(t=>[t.id,{duration:120}]));
state.playing = true;
state.selectedTrack = 'drums';
els.dialog = {open:true,close(){this.open=false;closeCalls++;}};
els.rhythmPanel = {};
els.rhythmStart = {};
function session() {
  rhythm = {beats:[5,6,7,8,9,10,11,12],judged:new Set(),hits:0,active:true,finished:false};
  els.dialog.open = true;state.selectedTrack='drums';state.overallDialog=false;
}
function press(extra={}) {
  handleRepairKey({code:'KeyF',repeat:false,target:{tagName:'BODY'},preventDefault(){},...extra});
}
session();
trackState.drums.events = [{type:'lowpass',severity:40},{type:'crackle',severity:20}];
trackState.drums.lowpass=400;trackState.drums.crackleDepth=.5;trackState.drums.delayDepth=.7;
trackState.bass.events = [{type:'lowpass',severity:20}];trackState.bass.lowpass=500;
currentMasterOffset = () => position;
press(); press(); press({repeat:true});
`);
assert.equal(run('rhythm.hits'),1,'a cue can only score once');
run('position=6;state.playing=false;press();state.playing=true;els.dialog.open=false;press();els.dialog.open=true;state.selectedTrack="bass";press();state.selectedTrack="drums";press({ctrlKey:true});');
assert.equal(run('rhythm.hits'),1,'ignore paused, closed, wrong track, modified input');
run('press();position=7;press();');
assert.equal(run('rhythm.hits'),3);
assert.equal(run('trackState.drums.events.length'),2,'three hits must not repair');
assert.equal(run('els.dialog.open'),true);
run('position=8-.24;press();position=9+.24;press();');
assert.equal(run('rhythm.hits'),5,'inclusive early and late boundaries');
run('position=10;press();position=11;press();position=12-.24;press();finishRhythmRepair();');
assert.equal(run('rhythm.hits'),8);
assert.equal(run('trackState.drums.events.length'),2,'all early hits still wait for the entire round');
assert.equal(run('els.dialog.open'),true);
run('position=12.25;updateRhythmRepair();');
assert.equal(run('rhythm.finished'),true);
assert.equal(run('trackState.drums.events.length'),0,'full round clears all Drum decay');
assert.equal(run('trackState.drums.lowpass'),20000);
assert.equal(run('trackState.drums.crackleDepth'),0);
assert.equal(run('trackState.drums.delayDepth'),0);
assert.equal(run('trackState.drums.bitDepth'),16);
assert.equal(run('sourceRestarts'),1);
assert.equal(run('state.offsets.drums'),12.25);
assert.equal(run('trackState.bass.events.length'),1);
assert.equal(run('trackState.bass.lowpass'),500);
assert.equal(run('els.dialog.open'),false,'successful Drum round auto closes');
assert.equal(run('closeCalls'),1);
assert.equal(run('state.playing'),true,'closing does not pause song');
assert.match(elements.get('repair-feedback').textContent,/RHYTHM REPAIR COMPLETE.*DRUM SIGNAL RESTORED/);
run('finishRhythmRepair();press();');
assert.equal(run('sourceRestarts'),1,'completion is idempotent');
// Six early hits meet the target but MUST wait for both remaining cues.
run(`session();trackState.drums.events=[{type:'lowpass',severity:20}];
for (const time of [5,6,7,8,9,10]) {position=time;press();}
finishRhythmRepair();updateRhythmRepair();`);
assert.equal(run('rhythm.hits'),6);
assert.equal(run('rhythm.finished'),false);
assert.equal(run('els.dialog.open'),true);
assert.equal(run('trackState.drums.events.length'),1);
assert.match(elements.get('repair-feedback').textContent,/TARGET REACHED/);
run('position=12.25;updateRhythmRepair()');
assert.equal(run('rhythm.finished'),true);
assert.equal(run('els.dialog.open'),false);
assert.equal(run('trackState.drums.events.length'),0,'two misses allowed after full round');
// Seven hits also pass; five hits must fail and expose retry.
for (const hits of [7,5]) {
  run(`session();trackState.drums.events=[{type:'lowpass',severity:20}];
  for(let i=0;i<${hits};i++){position=5+i;press();}
  position=12.25;updateRhythmRepair();`);
  assert.equal(run('rhythm.hits'),hits);
  assert.equal(run('rhythm.finished'),hits>=6);
  assert.equal(run('els.dialog.open'),hits<6);
  assert.equal(run('trackState.drums.events.length'),hits<6?1:0);
}
assert.equal(run('rhythm.active'),false);
assert.equal(run('els.rhythmStart.hidden'),false);
assert.match(elements.get('repair-feedback').textContent,/ROUND INCOMPLETE/);
run('session();position=5.241;press();');
assert.equal(run('rhythm.hits'),0,'reject outside window');
// Individual switches close only after ALL events for that instrument are repaired.
run(`rhythm=null;state.sources={};state.audio=null;state.selectedTrack='bass';
trackState.bass.events=[{type:'lowpass',severity:20},{type:'crackle',severity:20}];
repairEventType('lowpass');`);
assert.equal(run('els.dialog.open'),true,'partial repair keeps popup');
assert.equal(run('trackState.bass.events.length'),1);
run("repairEventType('crackle')");
assert.equal(run('els.dialog.open'),false,'last switch repair closes popup');
// Existing overall repair retains its switches until the entire system is restored.
run(`els.dialog.open=true;state.overallDialog=true;state.selectedTrack=null;
TRACKS.forEach(t=>trackState[t.id].events=[]);
trackState.drums.events=[{type:'lowpass',severity:20}];trackState.bass.events=[{type:'crackle',severity:20}];
repairGlobalEventType('lowpass');`);
assert.equal(run('els.dialog.open'),true);
run("repairGlobalEventType('crackle')");
assert.equal(run('els.dialog.open'),false);
// A healthy instrument can still be opened; there is no auto-close timer.
run("state.selectedTrack='keys';els.dialog.open=true;updateRhythmPanel()");
assert.equal(run('els.dialog.open'),true);
// Detect only real leading transients, including second-channel-only drums.
run(`
const sr=48000, samples=new Float32Array(sr*50), silent=new Float32Array(samples.length);
const times=[2,3,4,31,32,33,34,35,36,37,38,39,40];
for(const time of times) for(let j=0;j<480;j++) samples[Math.round(time*sr)+j]=.6*Math.exp(-j/140);
const buffer={sampleRate:sr,length:samples.length,numberOfChannels:2,getChannelData:i=>i?samples:silent};
const cues=drumRepairBeats(buffer);
`);
assert.deepEqual(Array.from(run('cues')),Array.from(run('times')));
run('state.buffers.drums=buffer;position=32;prepareRhythmRepair()');
assert.equal(run('rhythm.active'),false,'cannot start with fewer than eight cues');
run('position=29;prepareRhythmRepair()');
assert.deepEqual(Array.from(run('rhythm.beats')),[31,32,33,34,35,36,37,38]);
assert.equal(run('rhythm.active'),true);
assert.equal(run('rhythm.hits'),0,'retry resets round progress');
assert.equal(elements.get('repair-stability').max,8);
// Output clock compensates device and neutral worklet latency.
run(`state.audio={currentTime:10,sampleRate:48000,outputLatency:.02,getOutputTimestamp:()=>({contextTime:9.96,performanceTime:990})};
state.startedAt=2;state.offsets.drums=4;state.sources.drums={pitchShift:{}};`);
assert.ok(Math.abs(run('actualClock()')-(4+9.97-2-2944/48000))<1e-9);
run('state.audio.getOutputTimestamp=undefined');
assert.ok(Math.abs(run('actualClock()')-(4+9.98-2-2944/48000))<1e-9);
assert.equal(run('DECAY_INTERVAL_MIN_MS'),4000);
assert.equal(run('DECAY_INTERVAL_MAX_MS'),7000);
console.log('PASS: 6-of-8 success after full round, no early repair, missed-round retry, automatic closing on final repair only, global repair, input gates, timing and unchanged decay');
// The same game must use the selected song's own buffer and decay state.
assert.equal(run('SONGS.length'),4);
for(let songIndex=0;songIndex<4;songIndex++) {
  run(`
  currentSongIndex=${songIndex};TRACKS=SONGS[currentSongIndex].tracks;
  trackState=songTrackStates[SONGS[currentSongIndex].id];
  state.sources={};state.audio=null;position=0;session();
  var uniqueSamples=new Float32Array(48000*20);
  for(let i=0;i<10;i++) {
    const start=Math.round((2+${songIndex}*.1+i)*48000);
    for(let j=0;j<480;j++) uniqueSamples[start+j]=.6*Math.exp(-j/140);
  }
  var songBuffer={sampleRate:48000,length:uniqueSamples.length,duration:20,numberOfChannels:1,getChannelData:()=>uniqueSamples};
  state.buffers=Object.fromEntries(TRACKS.map(t=>[t.id,songBuffer]));
  trackState.drums.events=[{type:'lowpass',severity:20}];trackState.drums.lowpass=400;
  trackState.bass.events=[{type:'crackle',severity:20}];
  prepareRhythmRepair();
  `);
  assert.equal(run('rhythm.beats.length'),8);
  assert.ok(Math.abs(run('rhythm.beats[0]')-(2+songIndex*.1))<.006,'use this song buffer, not On Time cues');
  run('for(let i=0;i<6;i++){position=rhythm.beats[i];press();}finishRhythmRepair();');
  assert.equal(run('rhythm.finished'),false);
  assert.equal(run('trackState.drums.events.length'),1);
  run('position=rhythm.beats[7]+.25;updateRhythmRepair();');
  assert.equal(run('rhythm.finished'),true);
  assert.equal(run('trackState.drums.events.length'),0);
  assert.equal(run('trackState.bass.events.length'),1);
  assert.equal(run('els.dialog.open'),false);
}
console.log('PASS: all four songs use their own Drum cues and 6-of-8 full-round repair');
// Validate the worklet delay against its actual neutral processing, not a guess.
let Processor;
const audioVM=vm.createContext({AudioWorkletProcessor:class {},Float32Array,Math,registerProcessor:(_,p)=>{Processor=p;}});
vm.runInContext(fs.readFileSync('pitch-shifter.js','utf8'),audioVM);
const processor=new Processor();
let heardAt=-1;
for(let block=0;block<30;block++) {
  const input=new Float32Array(128),output=new Float32Array(128);
  if(block===0) input[0]=1;
  processor.process([[input]],[[output]],{pitchCents:new Float32Array([0])});
  const index=output.findIndex(x=>x!==0);
  if(index>=0) heardAt=block*128+index;
}
assert.equal(heardAt,2944,'cue clock compensates measured neutral worklet impulse delay');
console.log('PASS: real worklet impulse appears at frame 2944');
// Optional local real-stem validation: ffmpeg-decoded stereo float32 PCM.
if(process.env.DRUM_PCM) {
  const raw=fs.readFileSync(process.env.DRUM_PCM);
  const pcm=new Float32Array(raw.buffer,raw.byteOffset,raw.length/4);
  const left=Float32Array.from({length:pcm.length/2},(_,i)=>pcm[i*2]);
  const right=Float32Array.from({length:left.length},(_,i)=>pcm[i*2+1]);
  context.realBuffer={sampleRate:44100,length:left.length,numberOfChannels:2,getChannelData:i=>i?right:left};
  const cues=Array.from(run('drumRepairBeats(realBuffer)'));
  assert.ok(cues.length>=8);
  assert.ok(cues.some(t=>t>30));
  const hop=Math.round(44100*.005);
  const energy=start=>{
    let sum=0;
    for(let j=start;j<start+hop;j++) sum+=left[j]**2+right[j]**2;
    return sum/(hop*2);
  };
  for(const time of cues) {
    const frame=Math.round(time*44100/hop);
    const baseline=Array.from({length:Math.min(frame,20)},(_,j)=>energy((frame-j-1)*hop)).reduce((a,b)=>a+b,0)/Math.min(frame,20);
    assert.ok(energy(frame*hop)>=baseline*3,'every selected cue is a real leading energy rise');
  }
  console.log('PASS: actual drum PCM ('+process.env.DRUM_PCM+'): '+cues.length+' real transient cues across '+(left.length/44100).toFixed(2)+'s; first cues '+cues.slice(0,5).map(t=>t.toFixed(3)).join(', '));
}
