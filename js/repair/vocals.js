// Single-word typing repair for On Time and There Is Love. Lyrics follow the shared audible song position;
// each correctly completed lyric repairs exactly one active vocal decay event.
let vocalRepair = null;
function vocalLyricsForSong() {
  const id = SONGS[currentSongIndex].id;
  if (id === 'there-is-love') return THERE_IS_LOVE_LYRICS;
  if (id === 'on-time') return ON_TIME_LYRICS;
  return [];
}
function vocalTypingAvailable() { return ['there-is-love', 'on-time'].includes(SONGS[currentSongIndex].id); }
function vocalChallenge(line) {
  const words = Array.from(line.text.matchAll(/[A-Za-z0-9]+(?:['’][A-Za-z]+)*/g), match => ({text:match[0], start:match.index}));
  // Always require only one highlighted word, even with older lyric data.
  const selected = line.keywords.slice(0, 1).map(index => words[index]);
  const letters = [];
  selected.forEach(word => {
    for (let i = 0; i < word.text.length; i++) if (/[a-z]/i.test(word.text[i])) letters.push(word.start + i);
  });
  return {words:selected.map(word => word.text), letters, expected:selected.map(word => vocalLetters(word.text)).join('')};
}
function vocalLetters(text) { return text.toLowerCase().replace(/[^a-z]/g, ''); }
function vocalLyricAt(position) {
  return vocalLyricsForSong().findIndex(line => position >= line.start && position < line.end);
}
function currentVocalRepair() {
  return vocalRepair && !vocalRepair.finished && els.dialog?.open && !state.overallDialog &&
    state.selectedTrack === 'vocals' && vocalTypingAvailable() &&
    vocalRepair.generation === state.songGeneration && vocalRepair.song === currentSongIndex;
}
function startVocalRepair() {
  vocalRepair = null;
  els.vocalPlay.hidden = state.playing;
  els.vocalInput.value = '';
  vocalRepair = {song:currentSongIndex, generation:state.songGeneration, line:-2,
    completed:new Set(), correct:0, finished:false};
  updateVocalRepair();
  els.vocalInput.focus({preventScroll:true});
}
function renderVocalLetters(line, correct) {
  const display = document.getElementById('vocal-lyric');
  display.replaceChildren();
  const challenge = vocalChallenge(line);
  const keywordLetters = new Set(challenge.letters);
  const litLetters = new Set(challenge.letters.slice(0, correct));
  let position = 0;
  for (const char of line.text) {
    const span = document.createElement('span');
    const selected = keywordLetters.has(position);
    const lit = litLetters.has(position++);
    span.className = 'vocal-letter' + (selected ? ' is-keyword' : '') + (lit ? ' is-typed' : '');
    span.textContent = char;
    display.appendChild(span);
  }
}
function updateVocalRepair() {
  if (!currentVocalRepair()) return;
  const game = vocalRepair;
  const position = audibleSongPosition('vocals');
  const index = vocalLyricAt(position);
  const changed = game.line !== index;
  if (changed) {
    game.line = index;
    game.correct = 0;
    els.vocalInput.value = '';
    els.vocalInput.setAttribute('aria-invalid', 'false');
    if (index >= 0) {
      renderVocalLetters(vocalLyricsForSong()[index], 0);
      document.getElementById('vocal-words').textContent = vocalChallenge(vocalLyricsForSong()[index]).words.join(' · ');
      document.getElementById('vocal-section').textContent = vocalLyricsForSong()[index].section;
    } else {
      document.getElementById('vocal-words').textContent = 'WAITING FOR THE NEXT LYRIC';
      document.getElementById('vocal-lyric').textContent = 'LISTEN FOR THE NEXT VOCAL LINE…';
      document.getElementById('vocal-section').textContent = 'INSTRUMENTAL / BETWEEN LINES';
    }
  }
  const done = game.completed.has(index);
  const activeEvents = trackState.vocals?.events.length || 0;
  const wasDisabled = els.vocalInput.disabled;
  els.vocalPlay.hidden = state.playing;
  els.vocalInput.disabled = !state.playing || index < 0 || done || activeEvents === 0;
  if ((changed || wasDisabled) && !els.vocalInput.disabled) els.vocalInput.focus({preventScroll:true});
  document.getElementById('vocal-progress').textContent = game.completed.size + ' DECAY EVENT' + (game.completed.size === 1 ? '' : 'S') + ' REPAIRED';
  if (!state.playing) document.getElementById('vocal-feedback').textContent = 'RESUME THE SONG TO FOLLOW THE LYRICS';
  else if (index < 0) document.getElementById('vocal-feedback').textContent = position >= vocalLyricsForSong()[vocalLyricsForSong().length-1].end
    ? 'VOCALS FINISHED — REPLAY THE SONG TO CONTINUE REPAIR' : 'WAITING FOR THE NEXT SUNG LINE';
  else if (!activeEvents) document.getElementById('vocal-feedback').textContent = 'NO DECAY EVENT TO FIX — WAIT FOR AN ACTIVE EVENT';
  else if (done) document.getElementById('vocal-feedback').textContent = 'LYRIC RESTORED — WAIT FOR THE NEXT LYRIC';
  else if (changed) document.getElementById('vocal-feedback').textContent = 'TYPE THE UNDERLINED WORD WHILE THIS LYRIC IS SUNG';
}
function handleVocalInput(event) {
  if (event?.isComposing || !currentVocalRepair()) return;
  const previousLine = vocalRepair.line;
  updateVocalRepair();
  if (!currentVocalRepair() || previousLine !== vocalRepair.line || els.vocalInput.disabled) return;
  const game = vocalRepair;
  const line = vocalLyricsForSong()[game.line];
  const expected = vocalChallenge(line).expected, typed = vocalLetters(els.vocalInput.value);
  let correct = 0;
  while (correct < expected.length && correct < typed.length && expected[correct] === typed[correct]) correct++;
  game.correct = correct;
  renderVocalLetters(line, correct);
  const wrong = correct < typed.length;
  document.getElementById('vocal-feedback').textContent = wrong
    ? 'CHECK THE NEXT LETTER — BACKSPACE TO CORRECT IT' : 'KEEP TYPING — FOLLOW THE HIGHLIGHTED LETTERS';
  els.vocalInput.setAttribute('aria-invalid', wrong ? 'true' : 'false');
  if (correct === expected.length && !wrong) {
    const nextEvent = trackState.vocals?.events[0];
    if (!nextEvent) {
      document.getElementById('vocal-feedback').textContent = 'NO DECAY EVENT TO FIX — WAIT FOR AN ACTIVE EVENT';
      updateVocalRepair();
      return;
    }
    const repairedEvent = repairSingleTrackEvent('vocals', nextEvent);
    if (!repairedEvent) {
      updateVocalRepair();
      return;
    }
    game.completed.add(game.line);
    game.correct = 0;
    els.vocalInput.value = '';
    playSwitchSound('off');
    playRepairSuccess();
    addLog('VOCALS repaired: ' + repairedEvent.name + '.', 'repair');
    document.getElementById('vocal-feedback').textContent =
      repairedEvent.name + ' REPAIRED — ONE VOCAL DECAY EVENT RESTORED';
    updateUI();
    updateTrackAudioVisuals();
    updateDialog();
    updateVocalRepair();
    closeRepairedDialog('vocals');
  }
}
