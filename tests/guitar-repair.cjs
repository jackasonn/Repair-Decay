// Run with node tests/guitar-repair.cjs; deterministic clock, no dependencies.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const elements=new Map();
const document={addEventListener(){},getElementById(id){
  if(!elements.has(id))elements.set(id,{textContent:'',innerHTML:'',hidden:false});
  return elements.get(id);
}};
let now=0;
const c=vm.createContext({document,console,Math,Date,Set,Map,WeakMap,Float32Array,performance:{now:()=>now}});
vm.runInContext(fs.readFileSync('script.js','utf8'),c);
const run=s=>vm.runInContext(s,c);
run(`
updateUI=()=>{};updateDialog=()=>{};updateTrackAudioVisuals=()=>{};addLog=()=>{};
playUISound=()=>{};startSources=()=>{};
els.guitarTargets={innerHTML:'',contains:button=>button.inside!==false};
els.dialog={open:false,showModal(){this.open=true;},close(){this.open=false;}};
let testPosition=10;currentMasterOffset=()=>testPosition;
function clickDot(i,inside=true){
 const button={dataset:{guitarTarget:String(i)},inside};
 handleGuitarTarget({target:{closest:()=>button}});
}
`);
for(let song=0;song<4;song++){
  now=0;
  run(`currentSongIndex=${song};TRACKS=SONGS[currentSongIndex].tracks;
  trackState=songTrackStates[SONGS[currentSongIndex].id];state.sources={};state.audio=null;
  state.buffers=Object.fromEntries(TRACKS.map(t=>[t.id,{duration:300}]));
  state.playing=true;
  trackState.guitars.events=[{type:'lowpass',severity:30},{type:'delay',severity:15}];
  trackState.guitars.lowpass=500;trackState.guitars.delayDepth=.7;
  trackState.bass.events=[{type:'crackle',severity:15}];
  openTrackDialog('guitars');`);
  assert.equal(run('guitarRepair.visible'),1,'game starts immediately when damaged Guitar opened');
  assert.equal(run('guitarRepair.targets.length'),8);
  assert.equal(run('new Set(guitarRepair.targets.slice(0,6).map(t=>t.string)).size'),6,'all six strings used');
  const times=Array.from(run('guitarRepair.targets.map(t=>t.at)'));
  for(let i=1;i<8;i++)assert.ok(times[i]-times[i-1]>=2000&&times[i]-times[i-1]<=3000);
  assert.ok(times[7]<=18000);
  run('clickDot(7);clickDot(0,false);');
  assert.equal(run('guitarRepair.targets.filter(t=>t.hit).length'),0,'hidden/outside targets rejected');
  run('clickDot(0);clickDot(0);');
  assert.equal(run('guitarRepair.targets.filter(t=>t.hit).length'),1,'duplicate click cannot score twice');
  assert.match(run('els.guitarTargets.innerHTML'),/is-repaired/,'hit turns dot green');
  for(let i=1;i<7;i++) {now=times[i];run(`updateGuitarRepair();clickDot(${i});`);}
  now=18000;run('updateGuitarRepair()');
  assert.equal(run('guitarRepair.visible'),8,'all targets appear by round end');
  assert.equal(run('els.dialog.open'),true,'remaining red target cannot timeout into success');
  assert.equal(run('trackState.guitars.events.length'),2);
  assert.match(elements.get('guitar-feedback').textContent,/REMAINING RED DOTS/);
  now=22000;run('clickDot(7)');
  assert.equal(run('trackState.guitars.events.length'),0,'all targets repair all Guitar events');
  assert.equal(run('trackState.guitars.lowpass'),20000);
  assert.equal(run('trackState.guitars.delayDepth'),0);
  assert.equal(run('trackState.bass.events.length'),1,'other instrument decay preserved');
  assert.equal(run('state.playing'),true);
  assert.equal(run('els.dialog.open'),false,'success auto closes');
  assert.equal(run('guitarRepair'),null,'closed game is disposed');
}
// All green before 18 seconds must wait until the whole round has elapsed.
now=0;run("trackState.guitars.events=[{type:'lowpass',severity:20}];openTrackDialog('guitars');");
const times=Array.from(run('guitarRepair.targets.map(t=>t.at)'));
for(let i=0;i<8;i++){now=times[i];run(`updateGuitarRepair();clickDot(${i});`);}
assert.equal(run('els.dialog.open'),true);
assert.equal(run('trackState.guitars.events.length'),1);
now=18000;run('updateGuitarRepair()');
assert.equal(run('els.dialog.open'),false);
// Closing early, changing song generation or switching instruments rejects stale input.
now=0;run("trackState.guitars.events=[{type:'lowpass',severity:20}];openTrackDialog('guitars');closeTrackDialog();");
now=25000;run('updateGuitarRepair();clickDot(0)');
assert.equal(run('trackState.guitars.events.length'),1);
now=0;run("openTrackDialog('guitars');state.songGeneration++;clickDot(0)");
assert.equal(run('guitarRepair.targets[0].hit'),false);
run("guitarRepair.generation=state.songGeneration;state.selectedTrack='bass';clickDot(0)");
assert.equal(run('guitarRepair.targets[0].hit'),false);
run("closeTrackDialog();trackState.guitars.events=[];openTrackDialog('guitars')");
assert.equal(run('guitarRepair'),null,'healthy Guitar has no repair game');
assert.equal(run('els.dialog.open'),true,'healthy diagnostics remain available');
console.log('PASS: all four Guitar games, six strings, 2–3s spacing, 18s minimum, persistent misses, green dots, complete repair, close/cancel and song isolation');
