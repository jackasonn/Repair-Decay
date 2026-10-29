// Automatic decay pacing; protects slow interval and playback/pause behavior.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let now=1000,randomValue=0, nextTimer=0, timers=new Map(), cancelled=[];
const fakeMath=Object.create(Math);
fakeMath.random=()=>randomValue;
const context=vm.createContext({
  console,Date,Math:fakeMath,Set,Map,WeakMap,Float32Array,
  document:{addEventListener(){}},
  performance:{now:()=>now},
  setTimeout(callback,delay) {const id=++nextTimer;timers.set(id,{callback,delay});return id;},
  clearTimeout(id) {cancelled.push(id);timers.delete(id);}
});
vm.runInContext(fs.readFileSync('js/app.js','utf8'),context);
const run=x=>vm.runInContext(x,context);
assert.equal(run('DECAY_INTERVAL_MIN_MS'),20000);
assert.equal(run('DECAY_INTERVAL_MAX_MS'),35000);
run('state.playing=true;scheduleNextEvent()');
assert.equal(timers.size,1);
assert.equal([...timers.values()][0].delay,20000,'minimum event spacing should be 20 seconds');
assert.equal(run('state.nextEventAt'),now+20000);
const initialTimer=run('state.decayTimer');
randomValue=0.999999;now=2000;
run('scheduleNextEvent()');
assert.ok(cancelled.includes(initialTimer),'rescheduling must cancel the previous timer');
assert.equal(timers.size,1);
let scheduled=[...timers.values()][0];
assert.ok(scheduled.delay>=34999&&scheduled.delay<=35000,'maximum event spacing should be about 35 seconds');
assert.ok(run('state.nextEventAt')>=now+34999);
const active=run('state.decayTimer');
run('state.playing=false;scheduleNextEvent()');
assert.ok(cancelled.includes(active),'pausing must cancel the decay timer');
assert.equal(timers.size,0,'no decay may be scheduled while paused');
assert.equal(run('state.nextEventAt'),0);
randomValue=0.5;now=5000;
run('state.playing=true;scheduleNextEvent()');
assert.equal(timers.size,1);
scheduled=[...timers.values()][0];
assert.equal(scheduled.delay,27500,'intermediate random draw uses the new full interval');
let events=0;context.recordDecay=()=>events++;
run('applyEvent=()=>{recordDecay();scheduleNextEvent();}');
const due=run('state.decayTimer');
timers.delete(due);
scheduled.callback();
assert.equal(events,1,'one scheduled timer produces one event');
assert.equal(timers.size,1,'decay reschedules after a successful event');
assert.equal([...timers.values()][0].delay,27500,'subsequent events still respect slower pacing');
run('state.playing=false;scheduleNextEvent()');
assert.equal(timers.size,0);
console.log('PASS: 20–35 second decay intervals, timer rescheduling and pause behavior');
