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
let sourceRestarts = 0;
startSources = () => { sourceRestarts++; };
state.buffers = Object.fromEntries(TRACKS.map(t=>[t.id,{duration:120}]));
state.playing = true;
state.selectedTrack = 'drums';
els.dialog = {open:true};
els.rhythmPanel = {};
els.rhythmStart = {};
function session() {
  rhythm = {beats:[5,6,7,8,9],judged:new Set(),hits:0,active:true,finished:false};
}
function press(extra={}) {
  handleRepairKey({code:'KeyF',repeat:false,target:{tagName:'BODY'},preventDefault(){},...extra});
}
session();
trackState.drums.events = [{type:'lowpass',severity:40},{type:'crackle',severity:20}];
trackState.drums.lowpass=400;
trackState.drums.crackleDepth=.5;
trackState.drums.delayDepth=.7;
trackState.bass.events = [{type:'lowpass',severity:20}];
trackState.bass.lowpass=500;
currentMasterOffset = () => position;
press(); press(); press({repeat:true});
`);
assert.equal(run('rhythm.hits'),1,'a cue can only score once');
run('position=6;state.playing=false;press();state.playing=true;els.dialog.open=false;press();els.dialog.open=true;state.selectedTrack="bass";press();state.selectedTrack="drums";press({ctrlKey:true});');
assert.equal(run('rhythm.hits'),1,'ignore paused, closed, wrong track, modified input');
run('position=7.3;updateRhythmRepair();press();');
assert.equal(run('rhythm.hits'),1,'misses retain earned hits');
run('position=8-.24;press();');
assert.equal(run('rhythm.hits'),2,'inclusive early boundary');
assert.equal(run('trackState.drums.events.length'),2,'no premature repair');
run('position=9+.24;press();');
assert.equal(run('rhythm.hits'),3,'inclusive late boundary');
assert.equal(run('rhythm.finished'),true);
assert.equal(run('trackState.drums.events.length'),0,'third hit clears ALL drum decay');
assert.equal(run('trackState.drums.lowpass'),20000);
assert.equal(run('trackState.drums.crackleDepth'),0);
assert.equal(run('trackState.drums.delayDepth'),0);
assert.equal(run('trackState.drums.bitDepth'),16);
assert.equal(run('sourceRestarts'),1,'rebuild effects at shared offset');
assert.equal(run('state.offsets.drums'),9.24);
assert.equal(run('trackState.bass.events.length'),1,'preserve other instruments');
assert.equal(run('trackState.bass.lowpass'),500);
assert.match(elements.get('repair-feedback').textContent,/RHYTHM REPAIR COMPLETE.*DRUM SIGNAL RESTORED/);
run('finishRhythmRepair();press();');
assert.equal(run('sourceRestarts'),1,'completion is idempotent');
run('session();position=5.241;press();');
assert.equal(run('rhythm.hits'),0,'reject outside window');
run('finishRhythmRepair()');
assert.equal(run('rhythm.finished'),false,'song end cannot repair without 3 hits');
// Detect only real leading transients, including second-channel-only drums.
run(`
const sr=48000, samples=new Float32Array(sr*40), silent=new Float32Array(samples.length);
for(const time of [2,3,4,31,32,33]) for(let j=0;j<480;j++) samples[Math.round(time*sr)+j]=.6*Math.exp(-j/140);
const buffer={sampleRate:sr,length:samples.length,numberOfChannels:2,getChannelData:i=>i?samples:silent};
const cues=drumRepairBeats(buffer);
`);
assert.deepEqual(Array.from(run('cues')),[2,3,4,31,32,33]);
run('state.buffers.drums=buffer;position=30;prepareRhythmRepair()');
assert.deepEqual(Array.from(run('rhythm.beats')),[32,33]);
assert.equal(run('rhythm.active'),false,'never start unwinnable late session');
run('position=29;prepareRhythmRepair()');
assert.deepEqual(Array.from(run('rhythm.beats')),[31,32,33]);
assert.equal(run('rhythm.active'),true,'select upcoming cues after 20 seconds');
// Output clock accounts for device and neutral worklet latency; pause uses frozen offset.
run(`state.audio={currentTime:10,sampleRate:48000,outputLatency:.02,getOutputTimestamp:()=>({contextTime:9.96,performanceTime:990})};
state.startedAt=2;state.offsets.drums=4;state.sources.drums={pitchShift:{}};`);
assert.ok(Math.abs(run('actualClock()')-(4+9.97-2-2944/48000))<1e-9);
run('state.audio.getOutputTimestamp=undefined');
assert.ok(Math.abs(run('actualClock()')-(4+9.98-2-2944/48000))<1e-9);
assert.equal(run('DECAY_INTERVAL_MIN_MS'),4000);
assert.equal(run('DECAY_INTERVAL_MAX_MS'),7000);
console.log('PASS: 3-hit automatic repair, all drum effects reset, other instruments preserved, forgiving misses, input gates, 240ms boundaries, stereo transients, late starts, output timing, 4–7s decay');
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
  assert.ok(cues.length>=3);
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
  console.log('PASS: actual On Time drum PCM: '+cues.length+' real transient cues across '+(left.length/44100).toFixed(2)+'s; first cues '+cues.slice(0,5).map(t=>t.toFixed(3)).join(', '));
}
