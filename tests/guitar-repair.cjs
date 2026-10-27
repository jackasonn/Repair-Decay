// Run with node tests/guitar-repair.cjs; tracks current main's effect targets.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const elements=new Map();
const document={addEventListener(){},getElementById(id){
 if(!elements.has(id))elements.set(id,{textContent:'',innerHTML:'',hidden:false});return elements.get(id);
}};
let now=0;
const c=vm.createContext({document,console,Math,Date,Set,Map,WeakMap,Float32Array,performance:{now:()=>now}});
vm.runInContext(fs.readFileSync('script.js','utf8'),c);
const run=s=>vm.runInContext(s,c);
run(`
updateUI=()=>{};updateDialog=()=>{};updateTrackAudioVisuals=()=>{};addLog=()=>{};
playUISound=()=>{};playSwitchSound=()=>{};startSources=()=>{};vibrateGuitarString=()=>{};showGuitarHitLabel=()=>{};
els.guitarTargets={innerHTML:'',contains:button=>button.inside!==false};
els.guitarNotices={innerHTML:''};
els.dialog={open:false,showModal(){this.open=true;},close(){this.open=false;}};
function clickDot(id,inside=true){
 const button={dataset:{guitarTarget:String(id)},inside};
 handleGuitarTarget({target:{closest:()=>button}});
}
`);
for(let song=0;song<4;song++){
 now=0;
 run(`currentSongIndex=${song};TRACKS=SONGS[currentSongIndex].tracks;
 trackState=songTrackStates[SONGS[currentSongIndex].id];state.sources={};state.audio=null;state.playing=true;
 trackState.guitars.events=[{type:'lowpass',severity:30},{type:'delay',severity:15}];
 trackState.guitars.lowpass=500;trackState.guitars.delayDepth=.7;
 trackState.bass.events=[{type:'crackle',severity:15}];openTrackDialog('guitars');`);
 assert.equal(run('guitarRepair.targets.length'),2,'one target per active effect type');
 run('clickDot(0)');
 assert.equal(run('trackState.guitars.events.length'),2,'not-yet-visible targets ignored');
 now=600;run('updateGuitarRepair();clickDot(0,false)');
 assert.equal(run('trackState.guitars.events.length'),2);
 run('clickDot(0);clickDot(0)');
 assert.equal(run('guitarRepair.repairedCount'),1,'repeat click cannot score twice');
 assert.equal(run('trackState.guitars.lowpass'),20000,'target immediately resets matching effect');
 assert.equal(run('trackState.guitars.events.length'),1,'other effect remains');
 assert.match(run('els.guitarTargets.innerHTML'),/is-exploding/);
 run('clickDot(1)');
 assert.equal(run('trackState.guitars.delayDepth'),0);
 assert.equal(run('trackState.guitars.events.length'),0);
 assert.equal(run('trackState.bass.events.length'),1);
 assert.equal(run('els.dialog.open'),true,'wait for hit animation before closing');
 now=1400;run('updateGuitarRepair()');
 assert.equal(run('els.dialog.open'),false);
 assert.equal(run('guitarRepair'),null);
 assert.equal(run('state.playing'),true);
}
// New decay within an open session creates a matching target; closing cancels.
now=0;run("trackState.guitars.events=[];openTrackDialog('guitars');");
assert.equal(run('guitarRepair.targets.length'),0);
run("trackState.guitars.events=[{type:'crackle',severity:20}];updateGuitarRepair()");
assert.equal(run('guitarRepair.targets.length'),1);
run('closeTrackDialog()');
now=5000;run('clickDot(0);updateGuitarRepair()');
assert.equal(run('trackState.guitars.events.length'),1);
now=0;run("openTrackDialog('guitars');state.songGeneration++;clickDot(0)");
assert.equal(run('guitarRepair.repairedCount'),0);
console.log('PASS: current Guitar effect-target repair on all four songs, matching audio effects, duplicate/hidden input, animations, auto-close, cancellation and song isolation');
