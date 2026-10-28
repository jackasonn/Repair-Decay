# Drum repair — current event-linked version

The live Drum minigame is **not** the older eight-beat/F-key challenge. Each active decay effect appears as a moving repair line. Click it near the centre or press **Space** in the ±260 ms timing window to clear that effect. An early or missed cue reappears; an empty click/press yields a notice but does not alter the audio. Cue progression pauses when the music is paused.

The game protects native dialog buttons from Space presses, keeps partial-repair feedback visible and only clears the actual targeted effect type. Source: `js/app.js` (`startRhythmRepair`, `judgeDrumPress`, `completeDrumTarget`). Tests: `tests/repair-input.cjs`, `tests/repair-dialogs.cjs`. The stale legacy timing test that called removed functions was deleted.
