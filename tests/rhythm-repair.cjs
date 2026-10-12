// Run with node tests/rhythm-repair.cjs; no packages required.
const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const elements = new Map();
const document = { addEventListener(){}, getElementById(id){if(!elements.has(id)) elements.set(id,{});return elements.get(id);} };
const context = vm.createContext({document,console,Date,Math,Set,Float32Array});
vm.runInContext(fs.readFileSync('script.js','utf8'),context);
vm.runInContext(`
let testPosition = 5;
currentMasterOffset = () => testPosition;
updateRhythmRepair = () => {};
els.dialog = {open:false};
state.playing = true;
function testSession() { rhythm = {beats:[5,6,7,8],judged:new Set(),hits:0,stability:50,active:true,finished:false}; }
function press(repeat=false) {handleRepairKey({code:'KeyF',repeat,target:{tagName:'BODY'},preventDefault(){}});}
testSession(); press();
`,context);
const value=code=>vm.runInContext(code,context);
assert.equal(value('rhythm.hits'),1);
value('press(true)'); assert.equal(value('rhythm.hits'),1);
value('press()'); assert.equal(value('rhythm.hits'),1); assert.equal(value('rhythm.stability'),48);
value('state.playing=false; testPosition=6; press()'); assert.equal(value('rhythm.hits'),1);
value('state.playing=true; els.dialog.open=true; press()'); assert.equal(value('rhythm.hits'),1);
value('els.dialog.open=false; press()'); assert.equal(value('rhythm.hits'),2);
value('let repaired=false; repairTrack=()=>{repaired=true}; addLog=()=>{}; testSession(); finishRhythmRepair()');
assert.equal(value('repaired'),false); assert.match(elements.get('repair-feedback').textContent,/FAILED/);
value('testSession(); rhythm.hits=3; rhythm.stability=70; finishRhythmRepair()');
assert.equal(value('repaired'),true); assert.equal(elements.get('repair-feedback').textContent,'DRUMS RESTORED');
value('testSession(); testPosition=5.139; press()'); assert.equal(value('rhythm.hits'),1);
value('testSession(); testPosition=5.141; press()'); assert.equal(value('rhythm.hits'),0);
console.log('PASS: timing boundaries, repeated/duplicate input, pause, dialog, success and failure');
