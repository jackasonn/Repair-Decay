# Drum rhythm repair

Merged into `main` at the user's request. Conflicts were resolved using the
latest main as the starting point, preserving its audio assets, global repair
controls, UI sounds, delay effects, playback safeguards and dialog layout.
Future changes for this project are requested directly on main.

Open a decaying Drum track and select **START RHYTHM REPAIR**. Each round
contains exactly 8 upcoming real drum transients. Press F for every cue. Only
after the final cue's timing window ends, and all 8 cues have been hit, does
`repairTrack('drums')` clear the events and reset the audio effects. Missing a
cue leaves the Drum damaged; finish the round, then select **RETRY RHYTHM
REPAIR** to start a fresh round at the current song position. Extra or repeated
presses cannot count the same cue twice. The inclusive window remains ±240 ms.
Fewer than 8 upcoming cues cannot start a round; the panel requests replay.

After any repair action, a shared check closes the dialog only when the selected
instrument has no active decay events. Partial repairs keep the dialog open.
The global repair dialog closes only when every instrument has no events.
Closing restores normal solo gains and leaves playback running. No delayed
close callback can accidentally dismiss another instrument's newly opened panel.

## Timing

The decoded drum AudioBuffer is analysed once and cached by buffer identity.
Stereo mean-square energy is measured in rounded 5 ms windows. A cue requires a
leading rise at least three times the preceding 100 ms mean, a 1.4x rise over the
previous window, and an absolute/relative noise floor. Real transients are spaced
at least 600 ms apart for readability; no BPM grid or fabricated fallback cues
are used. Timestamps use the actual hop/sampleRate, not an assumed 10 ms index.
The whole song is scanned, and each attempt starts with at least 1.2 seconds of
visual lead-in from the current playback position.

Drawing and F judgement both use `repairSongPosition()`, based on the same source
start time and shared offsets as playback. `getOutputTimestamp()` maps the Web
Audio output clock to the current performance clock. Output/base latency is the
fallback. The existing neutral pitch worklet adds 2944 samples (about 66.8 ms at
44.1 kHz); an impulse through its actual process method verifies this delay.
This delay is subtracted only when that worklet is present. The lane equation is
`x = centre + (cueTime - audibleSongPosition) * scale`; at the cue time the marker
is exactly centred. Hardware display latency and Bluetooth latency still need
an exhibition-device listening check; automated analysis is not a listening test.

## Verification

Run `node --check script.js`, `node tests/rhythm-repair.cjs`, and
`git diff --check`. Tests cover full 8-cue completion and dialog auto-close, inclusive timing boundaries,
missed-round retry, duplicate/held input, pause/dialog/track gates, late starts,
stereo-only transients, worklet latency, effect resets, shared offset rebuilding,
other-instrument state and unchanged 4000–7000 ms decay constants.

The actual main-branch On Time MP3 was decoded to stereo 44.1 kHz float PCM
with FFmpeg. Optional `DRUM_PCM=/path/to/drums.f32 node tests/rhythm-repair.cjs`
checks each selected cue against its actual leading energy rise. This file is
local test input and is not committed. Analysis found 154 cues across 118.15 s;
the first five are approximately 0.651, 1.303, 2.621, 3.267 and 3.929 seconds.
Browser decoding can differ slightly in MP3 priming; production always analyses
its own decoded buffer, so cues share the actual source's sample origin.

Automated regression checks verify full-round completion, no early repair,
missed-round retry, and automatic dialog closing after the final repair only.
Exhibition-device listening alignment remains a manual check.
