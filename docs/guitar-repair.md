# Guitar string repair

All four songs use the same Guitar repair game. Opening a decaying Guitar
starts a fresh round immediately. The existing left-hand instrument artwork,
particles and diagnostics remain. The right-hand manual switches are replaced
with a CSS sound hole, bridge, six horizontal strings and clickable targets.
No image asset or external dependency is added.

A round contains 8 targets. The first 6 cover all six strings in shuffled order;
the final 2 choose random strings. Positions vary along each string, with spacing
to avoid targets overlapping. A red target appears immediately, then subsequent
targets appear 2.2–2.5 seconds apart. Clicking a target briefly changes it to green with a
check mark, then removes it after 220 ms. Its repair credit remains in the round
state, so it cannot reappear or be counted twice. Unclicked red targets do not expire. The round lasts at least 18 seconds; all eight
targets must be green before Guitar decay is cleared. If any remain red at 18
seconds, visitors may finish them without a time penalty. Success uses the same
repairTrack('guitars') audio reset and automatic dialog close as other repairs.

Scheduling uses the UI animation clock, separate from song rhythm: this is a
pointer game, so it also works while music is paused. Closing the dialog cancels
the round; reopening a decaying Guitar starts fresh. Song/generation and dialog
checks reject stale input. Native dialog close events cancel the round too.
No new timers run after a dialog closes. Global repair controls remain available.
Drum rhythm repair and Bass, Keys and Vocal switches retain their current rules.

Run `node --check script.js`, `node tests/guitar-repair.cjs`,
`node tests/rhythm-repair.cjs` and `git diff --check`. The Guitar tests exercise
all four songs, coverage of all six strings, target spacing, duplicate and
hidden-target input, no premature completion, persistent unclicked targets,
normal audio restoration, automatic close, cancellation and song isolation.

Browser verification observed the soundboard beside the existing Guitar image,
red and green targets, the 18-second schedule, a remaining red target at 7/8,
and subsequent automatic dialog close with GUITARS NORMAL / NO ACTIVE EVENTS
and a repair entry in the maintenance log. A local preview screenshot was saved.
