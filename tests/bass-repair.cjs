const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function element(){return {textContent:'',dataset:{},disabled:false,attrs:{},setAttribute(k,v){this.attrs[k]=v;},toggleAttribute(k,v){if(v)this.attrs[k]='';else delete this.attrs[k];}};}
const elements=new Map();
const document={addEventListener(){},getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);}};
const c=vm.createContext({document,console,Date,Math,Set,Map,WeakMap,Float32Array,performance:{now:()=>c.now}});c.now=0;
vm.runInContext(fs.readFileSync('script.js','utf8'),c);
const run=s=>vm.runInContext(s,c);
run(`
updateUI=()=>{};updateDialog=()=>{};updateTrackAudioVisuals=()=>{};addLog=()=>{};playSwitchSound=()=>{};playUISound=()=>{};
els.dialog={open:true,close(){this.open=false;}};
let pegs=[];
function makePeg(){
 const frames=Array.from({length:4},()=>document.getElementById('frame'+Math.random()));
 const button={dataset:{},setAttribute(){},querySelectorAll:()=>frames};
 const label={textContent:''},name={textContent:''};
 return {dataset:{},querySelector:s=>s==='button'?button:s==='.bass-hit-label'?label:name,button,frames};
}
els.bassTuners={innerHTML:'',contains:()=>true,querySelectorAll:()=>pegs};
function setup(index){
 currentSongIndex=index;TRACKS=SONGS[index].tracks;trackState=songTrackStates[SONGS[index].id];
 for(const t of TRACKS)trackState[t.id].events=[];
 state.selectedTrack='bass';state.overallDialog=false;state.playing=true;state.sources={};state.audio=null;
 els.dialog.open=true;pegs=Array.from({length:4},makePeg);
 trackState.bass.events=EVENT_TYPES.map(t=>({type:t.id,severity:20}));
 Object.assign(trackState.bass,{detune:30,highpass:500,lowpass:500,bitDepth:4,phaseDepth:.7,warpDepth:.02,delayDepth:.7,crackleDepth:.7});
 trackState.drums.events=[{type:'lowpass',severity:20}];
 startBassRepair();
}
function clickPeg(index){handleBassTuner({target:{closest:()=>({dataset:{bassPeg:String(index)}})}});}
`);
function tick(time){c.now=time;run('updateBassRepair()');}
for(let song=0;song<4;song++){
 c.now=0;run(`setup(${song})`);
 assert.equal(run("bassRepair.slots.filter(s=>s.status==='active').length"),4);
 const repaired=new Set();
 for(let round=0;round<2;round++){
  for(let i=0;i<4;i++){
   const type=run(`bassRepair.slots[${i}].type`);assert.ok(!repaired.has(type));repaired.add(type);
   run(`clickPeg(${i});clickPeg(${i})`); // Double-click cannot repair twice.
  }
  const start=c.now;
  assert.equal(run('trackState.bass.events.length'),8-round*4,'not repaired before turning finishes');
  for(const [delta,frame] of [[0,0],[170,1],[330,2],[500,3]]){
   tick(start+delta);assert.equal(run('bassRepair.slots[0].frame'),frame);
   assert.equal(run(`Object.hasOwn(pegs[0].frames[${frame}].attrs,'hidden')`),false,'current SVG frame is visible');
   assert.equal(run('pegs[0].frames.filter(f=>!Object.hasOwn(f.attrs,"hidden")).length'),1);
  }
  tick(start+600);
  assert.equal(run('trackState.bass.events.length'),4-round*4);
  assert.equal(run('bassRepair.repairedCount'),(round+1)*4);
  assert.equal(run('els.dialog.open'),true,'last success label remains visible before close');
  assert.match(run('pegs[0].querySelector(".bass-hit-label").textContent'),/REPAIRED$/);
  tick(start+1499);assert.equal(run('els.dialog.open'),true);
  tick(start+1500);
 }
 assert.equal(repaired.size,8);assert.equal(run('els.dialog.open'),false);assert.equal(run('bassRepair'),null);
 assert.equal(run('trackState.drums.events.length'),1);assert.equal(run('state.playing'),true);
 for(const [key,value] of Object.entries({detune:0,highpass:20,lowpass:20000,bitDepth:16,phaseDepth:0,warpDepth:0,delayDepth:0,crackleDepth:0}))assert.equal(run(`trackState.bass.${key}`),value);
}
// Cancelling or switching songs prevents a stale turn from repairing anything.
c.now=0;run('setup(0);clickPeg(0);closeTrackDialog()');tick(2000);assert.equal(run('trackState.bass.events.length'),8);
c.now=0;run('setup(0);clickPeg(0);state.songGeneration++');tick(2000);assert.equal(run('trackState.bass.events.length'),8);
// Newly arriving effects use available pegs; a clean panel can wait for decay.
c.now=0;run('setup(0);trackState.bass.events=[];startBassRepair()');
assert.equal(run('els.dialog.open'),true);assert.equal(run("bassRepair.slots.every(s=>s.status==='idle')"),true);
run("trackState.bass.events.push({type:'warp'});updateBassRepair();clickPeg(0)");
tick(600);assert.equal(run('trackState.bass.events.length'),0);
run("trackState.bass.events.push({type:'delay'});updateBassRepair()");
assert.equal(run("bassRepair.slots.some(s=>s.status==='active'&&s.type==='delay')"),true);
tick(1600);assert.equal(run('els.dialog.open'),true,'new decay prevents premature close');
console.log('PASS: Bass tuning in all four songs, four pegs, eight queued effects, four image frames, audio resets, feedback-before-close, duplicate clicks, new decay and stale-session cancellation');
