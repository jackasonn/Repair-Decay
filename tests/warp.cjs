// WARP regression: moving pitch modulation, repair and constant playback rate.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class Param {
  constructor(value=0){this.value=value;}
  setTargetAtTime(v){this.value=v;}
  setValueAtTime(v){this.value=v;}
}
class Node {
  constructor(){this.connections=[];this.stopped=false;}
  connect(to){this.connections.push(to);return to;}
  disconnect(){this.connections=[];}
  start(){this.started=true;}
  stop(){this.stopped=true;}
}
class Audio {
  constructor(){this.currentTime=12;this.sampleRate=44100;}
  createBiquadFilter(){const x=new Node();x.frequency=new Param();return x;}
  createGain(){const x=new Node();x.gain=new Param();return x;}
  createStereoPanner(){const x=new Node();x.pan=new Param();return x;}
  createOscillator(){const x=new Node();x.frequency=new Param();return x;}
  createWaveShaper(){return new Node();}
  createDelay(){const x=new Node();x.delayTime=new Param();return x;}
  createAnalyser(){const x=new Node();x.fftSize=1024;x.frequencyBinCount=512;return x;}
}
class Worklet extends Node {
  constructor(){super();this.parameters=new Map([['pitchCents',new Param()]]);}
}
const audio=new Audio();
const c=vm.createContext({console,Date,Set,Map,WeakMap,Float32Array,Math,AudioWorkletNode:Worklet,
  document:{addEventListener(){}},performance:{now:()=>0},fakeAudio:audio});
vm.runInContext(fs.readFileSync('js/app.js','utf8'),c);
const run=code=>vm.runInContext(code,c);
run("currentSongIndex=0;TRACKS=SONGS[0].tracks.filter(t=>t.id==='keys');trackState=songTrackStates[SONGS[0].id];state.audio=fakeAudio;state.masterGain={};state.pitchReady=true;state.playing=true;state.sources={};addLog=()=>{};playSwitchSound=()=>{};updateUI=()=>{};scheduleNextEvent=()=>{};");
const source=new Node();source.playbackRate=new Param(1);c.mockSource=source;
run('state.sources.keys=makeTrackChain("keys",mockSource)');
assert.equal(run('state.sources.keys.warp.frequency.value'),1.65);
assert.equal(run('state.sources.keys.warpFlutter.frequency.value'),5.2);
assert.equal(run('state.sources.keys.warpDepth.gain.value'),0);
assert.equal(run('state.sources.keys.warpFlutterDepth.gain.value'),0);
assert.equal(run('state.sources.keys.warpDepth.connections[0]===state.sources.keys.pitchShift.parameters.get("pitchCents")'),true);
assert.equal(run('state.sources.keys.warpFlutterDepth.connections[0]===state.sources.keys.pitchShift.parameters.get("pitchCents")'),true);
assert.equal(source.playbackRate.value,1);
const originalRandom=Math.random;Math.random=()=>0.70;
try{
  run('applyEvent()');
  const intensity=run('trackState.keys.warpDepth');
  assert.ok(intensity>=90&&intensity<=120,'first WARP must be clearly audible');
  assert.equal(run('trackState.keys.events[0].type'),'warp');
  assert.equal(run('state.sources.keys.warpDepth.gain.value'),intensity);
  assert.ok(Math.abs(run('state.sources.keys.warpFlutterDepth.gain.value')-intensity*.22)<1e-7);
  assert.equal(source.playbackRate.value,1);
  run('applyEvent()');
  assert.equal(run('trackState.keys.warpDepth'),intensity,'identical active WARP cannot stack again');
  assert.equal(run("trackState.keys.events.filter(e=>e.type==='warp').length"),1,'only one WARP per stem');
  run('resetTrackEventEffect("keys","warp")');
  assert.equal(run('trackState.keys.warpDepth'),0);
  assert.equal(run('state.sources.keys.warpDepth.gain.value'),0);
  assert.equal(run('state.sources.keys.warpFlutterDepth.gain.value'),0);
  run('disposeTrackChain(state.sources.keys)');
  assert.equal(run('state.sources.keys.warp.stopped'),true);
  assert.equal(run('state.sources.keys.warpFlutter.stopped'),true);
  run('state.pitchReady=false;applyEvent()');
  assert.notEqual(run('trackState.keys.events.at(-1).type'),'warp');
  assert.notEqual(run('trackState.keys.events.at(-1).type'),'detune');
  assert.equal(source.playbackRate.value,1);
}finally{Math.random=originalRandom;}
console.log('PASS: audible WARP, flutter, reset, oscillator cleanup and unchanged playback speed');
