// Current event-based game completion paths; run from the repository root.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const document = {addEventListener(){}, getElementById(){return {textContent:''};}};
const c = vm.createContext({document, console, Date, Math, Set, Map, WeakMap, Float32Array, performance:{now:()=>100}});
vm.runInContext(fs.readFileSync('js/app.js','utf8'), c);
const run = code => vm.runInContext(code,c);
run(`
updateUI=()=>{};updateDialog=()=>{};updateTrackAudioVisuals=()=>{};addLog=()=>{};
playSwitchSound=()=>{};playUISound=()=>{};startSources=()=>{};currentMasterOffset=()=>12;
setRepairFeedback=()=>{};updateRhythmPanel=()=>{};burstDrumTarget=()=>{};
vibrateGuitarString=()=>{};renderGuitarTargets=()=>{};updateGuitarRepair=()=>{};
showKeysHitLabel=()=>{};updateKeysRepair=()=>{};
let closed=0;
els.dialog={open:true,close(){this.open=false;closed++;}};
els.guitarTargets={contains:()=>true};
function setup(index,id){
 currentSongIndex=index;TRACKS=SONGS[index].tracks;trackState=songTrackStates[SONGS[index].id];
 for(const track of TRACKS)trackState[track.id].events=[];
 state.selectedTrack=id;state.overallDialog=false;state.playing=true;state.sources={};state.audio=null;
 state.buffers=Object.fromEntries(TRACKS.map(t=>[t.id,{duration:300}]));
 els.dialog.open=true;state.soloTrack=id;
 trackState[id].events=[{type:'lowpass',severity:30},{type:'delay',severity:30}];
 trackState[id].lowpass=400;trackState[id].delayDepth=.7;
 const game={song:index,generation:state.songGeneration,active:true,repairedCount:0,bursts:[]};
 rhythm=id==='drums'?game:null;guitarRepair=id==='guitars'?game:null;keysRepair=id==='keys'?game:null;
}
function hit(id,type){
 const note={id:1,type,name:type,status:'active',visible:true,string:0,lane:0,colour:'#fff'};
 if(id==='drums')return completeDrumTarget(note,100,0,0);
 if(id==='keys')return completeKeysTarget(note,100,100,0);
 if(id==='guitars'){
  guitarRepair.targets=[note];
  handleGuitarTarget({target:{closest:()=>({dataset:{guitarTarget:'1'}})}});
 }else repairEventType(type);
}
`);
for(let song=0;song<4;song++){
 for(const id of ['drums','guitars','keys','bass']){
  run(`setup(${song},'${id}');hit('${id}','lowpass')`);
  assert.equal(run('els.dialog.open'),true,`${id} stays open during partial repair`);
  assert.equal(run(`trackState['${id}'].events.length`),1);
  run(`hit('${id}','delay')`);
  const remainsOpen = ['drums', 'guitars', 'keys'].includes(id);
  assert.equal(run('els.dialog.open'),remainsOpen,`${id} completion keeps visual feedback visible, song ${song}`);
  assert.equal(run(`trackState['${id}'].events.length`),0);
  assert.equal(run(`trackState['${id}'].lowpass`),20000);
  assert.equal(run(`trackState['${id}'].delayDepth`),0);
  assert.equal(run('state.soloTrack'),remainsOpen ? id : null);
  assert.equal(run('state.playing'),true);
  if (remainsOpen) run('closeTrackDialog()');
  assert.equal(run('els.dialog.open'),false,'manual close remains available');
  assert.equal(run('guitarRepair'),null);assert.equal(run('keysRepair'),null);
 }
}
// Track restoration must not close a different instrument's panel.
run("setup(0,'vocals');trackState.bass.events=[{type:'lowpass'}];repairTrack('bass')");
assert.equal(run('els.dialog.open'),true);
run("repairTrack('vocals')");assert.equal(run('els.dialog.open'),true,'lyric mini-game stays open after its final event');
run('closeTrackDialog()');
// Global repair stays open while any other effect remains.
run("setup(0,'bass');state.overallDialog=true;repairGlobalEventType('lowpass')");
assert.equal(run('els.dialog.open'),true);
run("repairGlobalEventType('delay')");assert.equal(run('els.dialog.open'),false);
assert.equal(run('state.selectedTrack'),null);
assert.equal(run('SONGS[2].title'), 'RAINY NIGHT');
assert.equal(run("SONGS[2].tracks.some(t=>t.id==='vocals')"),true);
assert.ok(run("songTrackStates[SONGS[2].id].vocals"));
assert.equal(run('SONGS[2].tracks.length'),5);
for(const song of [0,3])assert.equal(run(`SONGS[${song}].tracks.some(t=>t.id==='vocals')`),true);
console.log('PASS: completed mini-games remain open for feedback; switch-based/global repairs, playback, session cleanup, vocal restoration and Rainy Night vocals');
