// Run with node tests/vocal-repair.cjs; no dependencies.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const elements=new Map();
function element(){return {textContent:'',value:'',hidden:false,disabled:false,children:[],attrs:{},setAttribute(k,v){this.attrs[k]=v;},focus(){},replaceChildren(){this.children=[];},appendChild(child){this.children.push(child);}};}
const document={addEventListener(){},createElement:element,getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);}};
const c=vm.createContext({document,console,Date,Math,Set,Map,WeakMap,Float32Array,performance:{now:()=>0}});
vm.runInContext(fs.readFileSync('there-is-love-lyrics.js','utf8'),c);
vm.runInContext(fs.readFileSync('script.js','utf8'),c);
const run=s=>vm.runInContext(s,c);
run(`
let testPosition=0;audibleSongPosition=()=>testPosition;currentMasterOffset=()=>testPosition;
updateUI=()=>{};updateDialog=()=>{};updateTrackAudioVisuals=()=>{};addLog=()=>{};playUISound=()=>{};startSources=()=>{};
els.dialog={open:false,showModal(){this.open=true;},close(){this.open=false;}};
els.vocalInput=document.getElementById('vocal-input');els.vocalPlay=document.getElementById('vocal-play');
currentSongIndex=3;TRACKS=SONGS[3].tracks;trackState=songTrackStates[SONGS[3].id];
state.playing=true;state.sources={};state.audio=null;
state.buffers=Object.fromEntries(TRACKS.map(t=>[t.id,{duration:240}]));
trackState.vocals.events=[{type:'lowpass',severity:40},{type:'delay',severity:20}];
trackState.vocals.lowpass=400;trackState.vocals.delayDepth=.7;
trackState.bass.events=[{type:'crackle',severity:20}];
function type(text){els.vocalInput.value=text;handleVocalInput({isComposing:false});}
openTrackDialog('vocals');
`);
assert.equal(run('vocalRepair.line'),-1,'intro has no invented lyric');
assert.equal(run('els.vocalInput.disabled'),true);
run('testPosition=THERE_IS_LOVE_LYRICS[0].start+.1;updateVocalRepair();type("T");');
assert.equal(run('vocalRepair.correct'),1);
assert.equal(elements.get('vocal-lyric').children.filter(e=>e.className.includes('is-typed')).length,1,'one correct letter lights one letter');
run('type("Tx")');
assert.equal(run('vocalRepair.correct'),1,'wrong letter cannot advance');
assert.equal(run('els.vocalInput.attrs["aria-invalid"]'),'true');
run('type("Th")');assert.equal(run('vocalRepair.correct'),2,'backspace/correction recovers');
run('state.playing=false;type(THERE_IS_LOVE_LYRICS[0].text)');
assert.equal(run('vocalRepair.completed.size'),0,'paused input cannot repair');
run('state.playing=true;updateVocalRepair();type(THERE_IS_LOVE_LYRICS[0].text.toUpperCase())');
assert.equal(run('vocalRepair.completed.size'),1);
assert.equal(run('els.vocalInput.disabled'),true,'completed line cannot be farmed twice');
assert.equal(run('trackState.vocals.events.length'),2);
run('testPosition=THERE_IS_LOVE_LYRICS[1].start+.1;updateVocalRepair()');
assert.equal(run('vocalRepair.line'),1);
assert.equal(run('els.vocalInput.value'),'','new sung line starts a fresh input');
run('type(vocalLetters(THERE_IS_LOVE_LYRICS[1].text))');
assert.equal(run('trackState.vocals.events.length'),0);
assert.equal(run('trackState.vocals.lowpass'),20000);
assert.equal(run('trackState.vocals.delayDepth'),0);
assert.equal(run('trackState.bass.events.length'),1);
assert.equal(run('els.dialog.open'),false);
assert.equal(run('vocalRepair'),null);
// Mid-song opening selects current verse, not Verse 1; boundaries cannot score stale text.
run(`trackState.vocals.events=[{type:'lowpass',severity:20}];testPosition=THERE_IS_LOVE_LYRICS[12].start+.1;openTrackDialog('vocals');`);
assert.equal(run('vocalRepair.line'),12);
run('els.vocalInput.value=THERE_IS_LOVE_LYRICS[12].text;testPosition=THERE_IS_LOVE_LYRICS[13].start+.1;handleVocalInput({});');
assert.equal(run('vocalRepair.completed.size'),0,'old lyric cannot be submitted after playback advances');
run('state.songGeneration++;type(THERE_IS_LOVE_LYRICS[13].text)');
assert.equal(run('vocalRepair.completed.size'),0);
run('closeTrackDialog()');assert.equal(run('vocalRepair'),null);
for(let song=0;song<3;song++)assert.equal(run(`currentSongIndex=${song};vocalTypingAvailable()`),false,'pilot is There Is Love only');
const lines=Array.from(run('THERE_IS_LOVE_LYRICS'));
assert.equal(lines.length,25);
for(let i=0;i<lines.length;i++){
 assert.ok(lines[i].start>=0&&lines[i].start<lines[i].end&&lines[i].end<=228.9);
 if(i)assert.ok(lines[i-1].end<=lines[i].start,'timings are sorted and nonoverlapping');
 assert.ok(lines[i].text.length>0);
}
assert.equal(run('vocalLyricAt(120)'),-1,'instrumental break waits for actual vocals');
console.log('PASS: timestamped current lyrics, letter highlights, mistakes/backspace, pause/resume, 2-line repair, mid-song/boundary behavior, cancellation and There Is Love-only scope');
