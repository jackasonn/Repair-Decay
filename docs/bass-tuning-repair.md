# Bass tuning repair

The current Bass game has four animated tuning pegs, one per active decay effect type up to four at once. Further active effect types wait in a queue. A repair turn lasts 600 ms, with images animating from decayed frame 90° to clean frame 0°. Once completed, the underlying Bass event of that type is cleared; the current audio processing is reset for that effect. Success plays the switch-off and success sounds and displays a temporary confirmation label. A peg with no active event shows an error notice instead.

Closing the dialog or changing songs cancels stale turn actions. Source: `js/app.js` (`startBassRepair`, `updateBassRepair`, `handleBassTuner`). Tests: `tests/bass-repair.cjs` and `tests/repair-input.cjs`.
