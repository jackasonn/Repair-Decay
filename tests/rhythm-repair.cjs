// Run with node tests/rhythm-repair.cjs; no packages required.
const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');

const elements = new Map();
const document = {
  addEventListener(){},
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, { textContent:'', value:0, hidden:false });
    return elements.get(id);
  }
};
const context = vm.createContext({document,console,Date,Math,Set,Float32Array,performance:{now:()=>0}});
vm.runInContext(fs.readFileSync('script.js','utf8'),context);
vm.runInContext(`
let testPosition = 5;
currentMasterOffset = () => testPosition;
drawRepairSignal = () => {};
updateDialog = () => {};
state.playing = true;
state.selectedTrack = 'drums';
els.dialog = {open:true};
function testSession(stability=50) {
  rhythm = {beats:[5,6,7,8],judged:new Set(),hits:0,stability,active:true,finished:false};
}
function press(repeat=false) {
  handleRepairKey({code:'KeyF',repeat,target:{tagName:'BODY'},preventDefault(){}});
}
`,context);
const value=code=>vm.runInContext(code,context);

// The calibration game must not inject fake decay into the drum track.
value(`
trackState.drums.events = [];
trackState.drums.lowpass = 20000;
testSession();
testPosition = 2.5;
updateRhythmRepair();
`);
assert.equal(value('trackState.drums.events.length'),0);
assert.equal(value('trackState.drums.lowpass'),20000);

// F only counts while the drums popup is open and the song is playing.
value('testPosition=5; press()');
assert.equal(value('rhythm.hits'),1);
value('press(true)');
assert.equal(value('rhythm.hits'),1);
value('press()');
assert.equal(value('rhythm.hits'),1);
assert.equal(value('rhythm.stability'),48);
value('state.playing=false; testPosition=6; press()');
assert.equal(value('rhythm.hits'),1);
value('state.playing=true; els.dialog.open=false; press()');
assert.equal(value('rhythm.hits'),1);
value('els.dialog.open=true; state.selectedTrack="bass"; press()');
assert.equal(value('rhythm.hits'),1);
value('state.selectedTrack="drums"; press()');
assert.equal(value('rhythm.hits'),2);

// Ending below 100% must not repair or clear the drum track.
value(`
let repairCalls = 0;
repairTrack = () => { repairCalls++; };
addLog = () => {};
trackState.drums.events = [{type:'lowpass',severity:20}];
testSession(70);
finishRhythmRepair();
`);
assert.equal(value('repairCalls'),0);
assert.equal(value('trackState.drums.events.length'),1);
assert.match(elements.get('repair-feedback').textContent,/REACH 100%/);

// Reaching 100% by successful hits ends calibration and unlocks switches,
// but it still does not mutate decay state.
value(`
trackState.drums.events = [{type:'lowpass',severity:20}];
testSession(100);
finishRhythmRepair();
`);
assert.equal(value('trackState.drums.events.length'),1);
assert.match(elements.get('repair-feedback').textContent,/100% STABILITY/);

// Timing window remains inclusive at 140 ms and rejects a late hit.
value('testSession(); testPosition=5.139; press()');
assert.equal(value('rhythm.hits'),1);
value('testSession(); testPosition=5.141; press()');
assert.equal(value('rhythm.hits'),0);

console.log('PASS: popup-only F input, timing, pause, stability gate, and decay isolation');
