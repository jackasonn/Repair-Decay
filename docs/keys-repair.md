# Keys arrow repair

All four songs share an 18-second, four-lane arrow repair in the Keys dialog.
The left instrument artwork is preserved. Right-side manual switches are hidden;
fixed left/down/up/right receptors sit above incoming arrows. Opening a damaged
Keys track starts a round; a healthy Keys track displays its normal status.

Each round has eight notes, two of each direction in shuffled order. They reach
the receptors at 2.5, 4.5, …, 16.5 seconds. Notes take 1.8 seconds to rise from
the bottom to the fixed receptor, leaving an opening visual lead-in. Arrow-key
input is accepted within ±280 ms, once per note. Held/repeated, modified, wrong
track and editable-field input are ignored. Timing follows the game's visual
clock, like Guitar repair; this version does not detect musical Keys onsets.
No stem, playback speed or existing audio processing is changed.

Correct hits remove the incoming note, light and shake the matching receptor
for 260 ms, and emit 12 fading light particles over 500 ms. The UI counts hits
and confirms when the six-hit target is reached. At least six of eight notes
must be hit, but repair waits until the full 18 seconds finish. Success calls
repairTrack('keys'), resets all Keys effects/events and closes the dialog.
Fewer than six hits leave decay intact and show RETRY KEYS REPAIR.

The animation loop handles note motion, misses, bursts and completion. There
are no delayed callbacks to close a different dialog accidentally. Closing the
dialog or changing songs invalidates the session. The game also runs with music
paused, matching the Guitar mini-game's visual-clock behavior. Global repair
switches, Drum, Guitar, Bass and Vocal behavior remain unchanged.

Validation: node --check script.js; node tests/keys-repair.cjs;
node tests/guitar-repair.cjs; node tests/rhythm-repair.cjs; git diff --check.
Keys tests cover all four songs, directions and timing boundaries, repeats and
modifiers, six-hit delayed success, five-hit failure/retry, cancellation,
separate instrument decay, exact note/receptor alignment, shake and 12 particles.

Browser inspection confirmed the existing Keys artwork on the left, four fixed
receptors and coloured rising arrows on the right, countdown/progress text,
and absence of manual Keys switches. A local preview screenshot was saved.
