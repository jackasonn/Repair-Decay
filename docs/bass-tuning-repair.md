# Bass tuning repair

All four songs use the same Bass panel. The left instrument illustration stays
unchanged. The right panel uses the five original transparent PNGs supplied by
the team: one headstock and four tuner angles (0°, 30°, 70°, 90°). SVG viewBoxes
remove transparent margins at display time and align each shaft to one of the
four painted string posts; original image files are not edited.

Each red glowing peg represents one distinct active decay type, using the same
eight effect names as the former switches. Clicking starts a 600 ms four-frame
turn. At its end, `repairTrackEventType('bass', type)` removes that effect's
active events and resets the corresponding Web Audio parameters. A green
`<EFFECT> REPAIRED` label appears above that peg for 900 ms, in the style of the
other repair games. The peg is disabled while turning or showing feedback.

Up to four distinct effects appear together. Additional effects wait for a
free peg; new decay also joins this queue. All eight types can be repaired.
The dialog closes automatically after every active Bass effect has cleared
and the final success label has finished. A healthy panel can remain open
waiting for decay. Closing or switching songs cancels unfinished turns.
Playback, the decay scheduler and other instruments are unchanged.

Checks: `node tests/bass-repair.cjs`, `node tests/repair-dialogs.cjs`,
`node tests/vocal-repair.cjs`, and `node --check script.js`.
