// Run with node tests/vocal-repair.cjs; no dependencies.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const elements=new Map();
function element(){return {textContent:'',value:'',hidden:false,disabled:false,children:[],attrs:{},setAttribute(k,v){this.attrs[k]=v;},focus(){},replaceChildren(){this.children=[];},appendChild(child){this.children.push(child);}};}
const document={addEventListener(){},createElement:element,getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);}};
const c=vm.createContext({document,console,Date,Math,Set,Map,WeakMap,Float32Array,performance:{now:()=>0}});
for(const file of ['there-is-love-lyrics.js','on-time-lyrics.js','script.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
const run=s=>vm.runInContext(s,c);
run(`
let testPosition=0;audibleSongPosition=()=>testPosition;currentMasterOffset=()=>testPosition;
updateUI=()=>{};updateDialog=()=>{};updateTrackAudioVisuals=()=>{};addLog=()=>{};playUISound=()=>{};startSources=()=>{};
els.dialog={open:false,showModal(){this.open=true;},close(){this.open=false;}};
els.vocalInput=document.getElementById('vocal-input');els.vocalPlay=document.getElementById('vocal-play');
function type(text){els.vocalInput.value=text;handleVocalInput({isComposing:false});}
function setupSong(index){
 currentSongIndex=index;TRACKS=SONGS[index].tracks;trackState=songTrackStates[SONGS[index].id];
 state.playing=true;state.sources={};state.audio=null;
 state.buffers=Object.fromEntries(TRACKS.map(t=>[t.id,{duration:240}]));
 trackState.vocals.events=[{type:'lowpass',severity:40},{type:'delay',severity:20}];
 trackState.vocals.lowpass=400;trackState.vocals.delayDepth=.7;
 trackState.bass.events=[{type:'crackle',severity:20}];testPosition=0;openTrackDialog('vocals');
}
`);
for(const song of [0,3]){
 run(`setupSong(${song})`);
 assert.equal(run('vocalRepair.line'),-1);
 assert.equal(run('els.vocalInput.disabled'),true);
 run('testPosition=vocalLyricsForSong()[0].start+.1;updateVocalRepair();type(vocalChallenge(vocalLyricsForSong()[0]).words[0][0]);');
 assert.equal(run('vocalRepair.correct'),1);
 assert.equal(elements.get('vocal-lyric').children.filter(e=>e.className.includes('is-typed')).length,1);
 run('type(vocalChallenge(vocalLyricsForSong()[0]).words[0][0]+"z")');
 assert.equal(run('vocalRepair.correct'),1);
 assert.equal(run('els.vocalInput.attrs["aria-invalid"]'),'true');
 run('type(vocalChallenge(vocalLyricsForSong()[0]).words[0].slice(0,2))');
 assert.equal(run('vocalRepair.correct'),2);
 run('state.playing=false;type(vocalChallenge(vocalLyricsForSong()[0]).expected)');
 assert.equal(run('vocalRepair.completed.size'),0);
 run('state.playing=true;updateVocalRepair();type(vocalChallenge(vocalLyricsForSong()[0]).words.join(" ").toUpperCase())');
 assert.equal(run('vocalRepair.completed.size'),1,'keywords alone complete the line');
 assert.equal(run('els.vocalInput.disabled'),true,'completed lyric cannot score twice');
 assert.equal(run('trackState.vocals.events.length'),1,'one lyric repairs exactly one decay event');
 assert.equal(run('trackState.vocals.lowpass'),20000,'the repaired event effect resets');
 run('testPosition=vocalLyricsForSong()[1].start+.1;updateVocalRepair()');
 assert.equal(run('els.vocalInput.value'),'');
 run('type(vocalChallenge(vocalLyricsForSong()[1]).expected)');
 assert.equal(run('trackState.vocals.events.length'),0,'the next lyric repairs one more event');
 assert.equal(run('trackState.vocals.lowpass'),20000);
 assert.equal(run('trackState.vocals.delayDepth'),0);
 assert.equal(run('trackState.bass.events.length'),1);
 assert.equal(run('els.dialog.open'),true,'Vocal mini-game remains open so feedback can be seen');
 assert.notEqual(run('vocalRepair'),null);
 assert.equal(run('els.vocalInput.disabled'),true);
 const lines=Array.from(run('vocalLyricsForSong()'));
 assert.equal(lines.length,song===0?19:25);
 for(let i=0;i<lines.length;i++){
  const line=lines[i];assert.ok(line.start>=0&&line.start<line.end&&line.end<=(song===0?107.05:228.9));
  if(i)assert.ok(lines[i-1].end<=line.start);
  c.testLine=line;const challenge=run('vocalChallenge(testLine)');
  assert.ok(challenge.words.length>=2&&challenge.words.length<=3,'only 2–3 words per line');
  assert.ok(challenge.expected.length<=run('vocalLetters(testLine.text).length'));
  if(line.text.split(/\s+/).length>3)assert.ok(challenge.expected.length<run('vocalLetters(testLine.text).length'),'long lines require only a subset');
  assert.equal(new Set(challenge.letters).size,challenge.letters.length);
  for(let j=1;j<challenge.letters.length;j++)assert.ok(challenge.letters[j]>challenge.letters[j-1]);
 }
}
// Requested example: selected letters jump over unneeded words in the full lyric.
run('setupSong(3);testPosition=THERE_IS_LOVE_LYRICS[12].start+.1;updateVocalRepair()');
assert.deepEqual(Array.from(run('vocalChallenge(THERE_IS_LOVE_LYRICS[12]).words')),['Look','find','love']);
run('type("Look f")');assert.equal(run('vocalRepair.correct'),5);
const chars=elements.get('vocal-lyric').children;
assert.equal(chars.filter(e=>e.className.includes('is-typed')).length,5);
assert.ok(!chars[5].className.includes('is-typed'),'around stays grey');
assert.ok(chars[25].className.includes('is-typed'),'f in find lights up');
run('type("Look find love")');assert.equal(run('vocalRepair.completed.size'),1);
// Mid-song position and boundary protection stay intact.
run('testPosition=THERE_IS_LOVE_LYRICS[13].start+.1;updateVocalRepair();els.vocalInput.value=vocalChallenge(THERE_IS_LOVE_LYRICS[13]).expected;testPosition=THERE_IS_LOVE_LYRICS[14].start+.1;handleVocalInput({})');
assert.equal(run('vocalRepair.completed.size'),1,'stale text cannot score new line');
run('state.songGeneration++;type(vocalChallenge(THERE_IS_LOVE_LYRICS[14]).expected)');
assert.equal(run('vocalRepair.completed.size'),1);
run('closeTrackDialog()');assert.equal(run('vocalRepair'),null);
for(const song of [1,2])assert.equal(run(`currentSongIndex=${song};vocalTypingAvailable()`),false);
run('currentSongIndex=0');assert.equal(run('vocalLyricAt(45)'),-1);
run('currentSongIndex=3');assert.equal(run('vocalLyricAt(120)'),-1);
console.log('PASS: On Time and There Is Love keyword-only repair, 2–3 words per line, exact selected-letter highlighting, mistakes/backspace, pause, two-set completion, current-song timing and cancellation');
