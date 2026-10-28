// Input regressions: native button focus, Space release after repair, empty pegs/canvas.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function element(){return {textContent:'',className:'',dataset:{},children:[],style:{setProperty(){}},attrs:{},appendChild(e){this.children.push(e);},addEventListener(){},setAttribute(k,v){this.attrs[k]=v;},toggleAttribute(k,v){if(v)this.attrs[k]='';else delete this.attrs[k];}};}
const elements=new Map();
const document={addEventListener(){},createElement:element,getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);}};
const c=vm.createContext({document,console,Date,Math,Set,Map,WeakMap,Float32Array,performance:{now:()=>c.now}});c.now=0;
vm.runInContext(fs.readFileSync('js/app.js','utf8'),c);const run=s=>vm.runInContext(s,c);
run(`
updateUI=()=>{};updateDialog=()=>{};updateTrackAudioVisuals=()=>{};addLog=()=>{};playSwitchSound=()=>{};playUISound=()=>{};
drawRepairSignal=()=>{};
els.rhythmCanvas={getBoundingClientRect:()=>({left:0,top:0,width:400,height:230})};
els.rhythmTargetLabels=document.createElement('div');els.rhythmPanel={};
els.dialog={open:true,close(){this.open=false;}};
function setupDrum(){
 state.selectedTrack='drums';state.overallDialog=false;state.playing=false;state.sources={};state.audio=null;
 els.dialog.open=true;trackState.drums.events=[];drumSpaceHeld=false;startRhythmRepair(false);
}
function key(tag='BUTTON',repeat=false,code='Space'){
 return {code,repeat,target:{tagName:tag},prevented:false,stopped:false,
 preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;}};
}
`);
for(var song=0;song<4;song++){
 run(`currentSongIndex=${song};TRACKS=SONGS[${song}].tracks;trackState=songTrackStates[SONGS[${song}].id];setupDrum()`);
 run("var press=key();handleRepairKey(press)");
 assert.equal(run('press.prevented&&press.stopped'),true,'Space cancels native Close/Solo button activation');
 assert.equal(run('els.dialog.open'),true,'empty Space never closes');
 const labels=run('els.rhythmTargetLabels.children');
 assert.equal(labels.at(-1).textContent,'NO DECAY EVENT TO FIX');assert.match(labels.at(-1).className,/repair-empty-notice/);
 const count=labels.length;run('var repeat=key("BUTTON",true);handleRepairKey(repeat)');
 assert.equal(run('repeat.prevented&&repeat.stopped'),true);assert.equal(labels.length,count,'held key gives no extra hits or notices');
 run('var release=key();handleRepairKeyUp(release)');assert.equal(run('release.prevented&&release.stopped'),true);
 // One on-time hit clears one effect and leaves the other effect and panel intact.
 run(`trackState.drums.events=[{type:'lowpass'},{type:'delay'}];
 rhythm.targets=[{type:'lowpass',name:'LOW PASS FILTER',status:'active',at:0}];
 var good=key();handleRepairKey(good);handleRepairKeyUp(key());`);
 assert.equal(run('trackState.drums.events.length'),1);assert.equal(run('els.dialog.open'),true);
 // The completed game remains open; releasing Space must not activate another focused control.
 run(`rhythm.targets=[{type:'delay',name:'DELAY',status:'active',at:0}];
 var final=key();handleRepairKey(final);var after=key('A',true);handleRepairKey(after);
 var up=key('A');handleRepairKeyUp(up);`);
 assert.equal(run('els.dialog.open'),true,'completed Drum mini-game stays open');assert.equal(run('trackState.drums.events.length'),0);
 assert.equal(run('after.prevented&&after.stopped&&up.prevented&&up.stopped'),true);
 // Completed minigames remain open for visual feedback: Space is still captured until Close.
 run('closeTrackDialog()');
 run('var outside=key();handleRepairKey(outside)');assert.equal(run('outside.prevented'),false,'normal page shortcuts stay intact');
 run('setupDrum();var typing=key("INPUT");handleRepairKey(typing)');assert.equal(run('typing.prevented'),false);
 run('var other=key("BUTTON",false,"Enter");handleRepairKey(other)');assert.equal(run('other.prevented'),false,'Enter still operates normal controls');
}
// Idle pegs are enabled, unlabelled visually, and report no decay without changing state.
run(`
state.selectedTrack='bass';trackState.bass.events=[];els.dialog.open=true;
var pegs=Array.from({length:4},()=>{
 const peg=document.createElement('div'),button=document.createElement('button'),name=document.createElement('span'),hit=document.createElement('span');
 button.querySelectorAll=()=>[];
 peg.querySelector=s=>s==='button'?button:s==='.bass-effect-name'?name:hit;
 peg.button=button;peg.name=name;return peg;
});
els.bassTuners={innerHTML:'',contains:()=>true,querySelectorAll:()=>pegs};startBassRepair();
`);
for(var i=0;i<4;i++){
 assert.equal(run(`pegs[${i}].button.disabled`),false);assert.equal(run(`pegs[${i}].name.textContent`),'');
 run(`handleBassTuner({target:{closest:()=>({dataset:{bassPeg:'${i}'}})}})`);
 assert.equal(run(`pegs[${i}].children.at(-1).textContent`),'NO DECAY EVENT TO FIX');
 assert.match(run(`pegs[${i}].children.at(-1).className`),/repair-empty-notice/);
}
assert.equal(run('bassRepair.repairedCount'),0);assert.equal(run('trackState.bass.events.length'),0);assert.equal(run('els.dialog.open'),true);
console.log('PASS: Drum Space on focused buttons, repeats and keyup after completion; manual close remains available; normal typing/other controls; four clickable empty Bass pegs and shared no-decay notices');
