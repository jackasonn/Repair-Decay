# Empty repair feedback and Drum keyboard ownership

Bass idle pegs have no permanent label and remain enabled. Clicking one displays
`NO DECAY EVENT TO FIX` at the peg, without changing decay or repair progress.
Drum provides the same notice on an empty canvas click or Space press. Bass,
Drum, Guitar and Keys share the gold bordered floating/shaking empty notice.
Reduced-motion mode retains a gentle float without the horizontal shake.

Opening the Drum dialog focuses Close by default. Previously the Space handler
skipped buttons, so the browser activated Close. The game now handles Space in
the capture phase, cancels native button activation on both press and release,
and judges once per fresh press. Held repeats are consumed even if the final
successful hit has already closed the panel and returned focus to the track
card. Text inputs, other keys and Space outside Drum retain normal behavior.
Window blur clears the held-key latch. Successful final repair still auto-closes.

Regression coverage: `node tests/repair-input.cjs` covers all four songs, focused
buttons, repeat/release ownership, partial versus final repairs, input controls,
and all four clickable empty Bass pegs. Existing Bass, dialog and Vocal repair
tests remain passing. Browser verification checks empty Bass clicks and Space
while the native Close button has focus.
