// Run with node tests/keys-repair.cjs; current main's live effect-target rules.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let now=0;const elements=new Map();
function element(){return {textContent:'',innerHTML:'',style:{setProperty(){}},addEventListener(){},appendChild(){}};}
const document={addEventListener(){},createElement:element,getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);}};
const c=vm.createContext({document,console,Math,Date,Set,Map,WeakMap,Float32Array,performance:{now:()=>now}});
vm.runInContext(fs.readFileSync('js/app.js','utf8'),c);const run=s=>vm.runInContext(s,c);
run(`drawKeysRepair=()=>{};showKeysHitLabel=()=>{};updateUI=()=>{};updateDialog=()=>{};
updateTrackAudioVisuals=()=>{};addLog=()=>{};playUISound=()=>{};playSwitchSound=()=>{};startSources=()=>{};
els.dialog={open:false,showModal(){this.open=true;},close(){this.open=false;}};els.keysTargetLabels=document.createElement('div');
function press(lane,extra={}){handleKeysRepairKey({code:KEYS_CODES[lane],target:{tagName:'BODY'},preventDefault(){},...extra});}`);
for(let song=0;song<4;song++){
 now=0;run(`currentSongIndex=${song};TRACKS=SONGS[currentSongIndex].tracks;trackState=songTrackStates[SONGS[currentSongIndex].id];
 state.sources={};state.audio=null;state.playing=true;
 trackState.keys.events=[{type:'lowpass',severity:40},{type:'delay',severity:20}];trackState.keys.lowpass=400;trackState.keys.delayDepth=.7;
 trackState.bass.events=[{type:'crackle',severity:20}];openTrackDialog('keys');`);
 assert.equal(run('keysRepair.notes.length'),2);
 now=2500;run('press((keysRepair.notes[0].lane+1)%4);press(keysRepair.notes[0].lane,{repeat:true})');
 assert.equal(run('keysRepair.repairedCount'),0);
 run('press(keysRepair.notes[0].lane);press(keysRepair.notes[0].lane)');
 assert.equal(run('keysRepair.repairedCount'),1);
 assert.equal(run('trackState.keys.lowpass'),20000);
 assert.equal(run('trackState.keys.events.length'),1);
 assert.equal(run("keysRepair.bursts.filter(b=>b.kind==='hit').length"),1,'one successful burst despite extra feedback');
 now=5000;run('updateKeysRepair()');
 assert.equal(run('keysRepair.missCount'),1,'missed live effect returns as an arrow');
 assert.equal(run('trackState.keys.events.length'),1);
 now=run('keysRepair.notes[1].at');run('press(keysRepair.notes[1].lane)');
 assert.equal(run('trackState.keys.delayDepth'),0);
 assert.equal(run('trackState.keys.events.length'),0);
 assert.equal(run('trackState.bass.events.length'),1);
 assert.equal(run('els.dialog.open'),true,'hit feedback finishes before closing');
 now+=800;run('updateKeysRepair()');
 assert.equal(run('els.dialog.open'),true,'completed Keys game stays open after the animation');
 assert.notEqual(run('keysRepair'),null);
 run('closeTrackDialog()');
 assert.equal(run('els.dialog.open'),false);
 assert.equal(run('keysRepair'),null);
}
now=0;run("trackState.keys.events=[{type:'crackle',severity:10}];openTrackDialog('keys');closeTrackDialog()");
now=10000;run('updateKeysRepair()');
assert.equal(run('trackState.keys.events.length'),1);
console.log('PASS: current live-effect Keys game on all four songs, correct direction, held-input rejection, returning misses, particles, audio reset, manual close and cancellation');
