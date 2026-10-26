// Run with node tests/keys-repair.cjs; no dependencies.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let now=0;
const elements=new Map();
const document={addEventListener(){},getElementById(id){
 if(!elements.has(id))elements.set(id,{textContent:'',hidden:false});return elements.get(id);
}};
const c=vm.createContext({document,console,Math,Date,Set,Map,WeakMap,Float32Array,performance:{now:()=>now}});
vm.runInContext(fs.readFileSync('script.js','utf8'),c);
const run=s=>vm.runInContext(s,c);
run(`
const actualDraw=drawKeysRepair;drawKeysRepair=()=>{};
updateUI=()=>{};updateDialog=()=>{};updateTrackAudioVisuals=()=>{};addLog=()=>{};
playUISound=()=>{};startSources=()=>{};currentMasterOffset=()=>12;
els.dialog={open:false,showModal(){this.open=true;},close(){this.open=false;}};
els.keysRetry={hidden:true};
function pressLane(lane,extra={}){
 handleKeysRepairKey({code:KEYS_CODES[lane],target:{tagName:'BODY'},preventDefault(){},...extra});
}
function damagedKeys(){
 trackState.keys.events=[{type:'lowpass',severity:40},{type:'delay',severity:20}];
 trackState.keys.lowpass=400;trackState.keys.delayDepth=.7;
 openTrackDialog('keys');
}
`);
for(let song=0;song<4;song++){
 now=0;run(`currentSongIndex=${song};TRACKS=SONGS[currentSongIndex].tracks;
 trackState=songTrackStates[SONGS[currentSongIndex].id];state.sources={};state.audio=null;state.playing=true;
 state.buffers=Object.fromEntries(TRACKS.map(t=>[t.id,{duration:300}]));
 trackState.bass.events=[{type:'crackle',severity:20}];damagedKeys();`);
 assert.equal(run('keysRepair.notes.length'),8);
 assert.equal(run('new Set(keysRepair.notes.map(n=>n.lane)).size'),4);
 now=2500;
 run('pressLane((keysRepair.notes[0].lane+1)%4)');
 assert.equal(run('keysRepair.hits'),0,'wrong direction rejected');
 run('pressLane(keysRepair.notes[0].lane,{repeat:true});pressLane(keysRepair.notes[0].lane,{ctrlKey:true})');
 assert.equal(run('keysRepair.hits'),0);
 run('pressLane(keysRepair.notes[0].lane);pressLane(keysRepair.notes[0].lane)');
 assert.equal(run('keysRepair.hits'),1,'one fresh press per arrow');
 assert.equal(run('keysRepair.bursts.length'),1,'hit triggers shake and particle burst');
 for(let i=1;i<6;i++){now=2500+i*2000;run(`pressLane(keysRepair.notes[${i}].lane)`);}
 assert.equal(run('keysRepair.hits'),6);
 assert.equal(run('trackState.keys.events.length'),2,'six hits do not end early');
 assert.equal(run('els.dialog.open'),true);
 now=18000;run('updateKeysRepair()');
 assert.equal(run('trackState.keys.events.length'),0);
 assert.equal(run('trackState.keys.lowpass'),20000);
 assert.equal(run('trackState.keys.delayDepth'),0);
 assert.equal(run('trackState.bass.events.length'),1);
 assert.equal(run('els.dialog.open'),false,'complete round auto closes');
 assert.equal(run('keysRepair'),null,'close cancels old session');
 assert.equal(run('state.playing'),true);
}
// Five hits fail; retry is available without falsely repairing.
now=0;run('damagedKeys()');
for(let i=0;i<5;i++){now=2500+i*2000;run(`pressLane(keysRepair.notes[${i}].lane)`);}
now=18000;run('updateKeysRepair()');
assert.equal(run('trackState.keys.events.length'),2);
assert.equal(run('els.dialog.open'),true);
assert.equal(run('els.keysRetry.hidden'),false);
assert.match(elements.get('keys-feedback').textContent,/ROUND INCOMPLETE/);
// Inclusive ±280ms input window; outside press does not consume a future cue.
for(const delta of [-280,280,281]){
 now=0;run('startKeysRepair()');now=2500+delta;run('pressLane(keysRepair.notes[0].lane)');
 assert.equal(run('keysRepair.hits'),delta===281?0:1);
}
now=0;run('startKeysRepair();state.selectedTrack="bass";pressLane(keysRepair.notes[0].lane)');
assert.equal(run('keysRepair.hits'),0,'wrong dialog ignored');
run('state.selectedTrack="keys";state.songGeneration++;pressLane(keysRepair.notes[0].lane)');
assert.equal(run('keysRepair.hits'),0,'stale song generation ignored');
run('closeTrackDialog();');
now=30000;run('updateKeysRepair()');
assert.equal(run('keysRepair'),null);
assert.equal(run('trackState.keys.events.length'),2,'closing is not a repair');
// Rendering proof: notes share the matching receptor's x/y at their due time.
now=0;run('damagedKeys()');
const calls=[];
const ctx={setTransform(){},save(){},restore(){},rotate(){},beginPath(){},lineTo(){},moveTo(){},closePath(){},fill(){},stroke(){},fillRect(){},translate(x,y){calls.push(['translate',x,y]);},arc(...args){calls.push(['particle',...args]);}};
elements.set('keys-signal',{getBoundingClientRect:()=>({width:320}),getContext:()=>ctx});
c.window={devicePixelRatio:1};
run('actualDraw(2500)');
const lane=run('keysRepair.notes[0].lane');
assert.equal(calls.filter(call=>call[0]==='translate'&&call[1]===320*(lane+.5)/4&&call[2]===44).length,2,'moving arrow meets its receptor exactly');
now=2500;run('pressLane(keysRepair.notes[0].lane)');calls.length=0;
run('actualDraw(2600)');
assert.equal(calls.filter(call=>call[0]==='particle').length,12,'hit emits 12 light particles');
assert.ok(Math.abs(calls.filter(call=>call[0]==='translate')[lane][1]-320*(lane+.5)/4)>0,'matching receptor shakes on hit');
console.log('PASS: Keys game across all four songs, 18s/6-of-8, direction/timing/repeat gates, no early repair, retry, cancel, audio reset, exact receptor alignment and particles');
