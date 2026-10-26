# Drum rhythm repair

This change is based on `shiya-rhythm-repair-mvp`, which contains the existing
instrument dialog, rhythm lane and 4–7 second decay scheduler. The PR targets
that feature branch so it does not revert unrelated work or audio assets on main.

Open a decaying Drum track and select **START RHYTHM REPAIR**. Press F as a
moving marker crosses the centre. Three successful hits immediately call
`repairTrack('drums')`: all Drum events and effect parameters reset, sources
rebuild at one shared song position, diagnostics refresh, and the panel displays
**RHYTHM REPAIR COMPLETE — DRUM SIGNAL RESTORED**. Drum switches are hidden.
Other instruments retain their existing switches. Misses never remove hits.
The inclusive input window is ±240 ms; held/repeated F and modified or editable
field input are ignored. Closing the dialog ends the attempt without repairing.
Starting another attempt uses upcoming cues without rewinding playback. If fewer
than three cues remain, the panel requests replay rather than starting an
unwinnable attempt. A later Drum decay enables another repair.

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
`git diff --check`. Tests cover 3-hit completion, inclusive timing boundaries,
miss recovery, duplicate/held input, pause/dialog/track gates, late starts,
stereo-only transients, worklet latency, effect resets, shared offset rebuilding,
other-instrument state and unchanged 4000–7000 ms decay constants.

The actual feature-branch On Time MP3 was decoded to stereo 44.1 kHz float PCM
with FFmpeg. Optional `DRUM_PCM=/path/to/drums.f32 node tests/rhythm-repair.cjs`
checks each selected cue against its actual leading energy rise. This file is
local test input and is not committed. Analysis found 155 cues across 118.89 s;
the first five are approximately 0.636, 1.308, 2.621, 3.267 and 3.939 seconds.
Browser decoding can differ slightly in MP3 priming; production always analyses
its own decoded buffer, so cues share the actual source's sample origin.

Browser verification observed On Time playing with natural random Drum decay,
the Drum repair panel without switches, and the completed state with 3/3 hits,
0 active Drum events, 0% decay, STABLE, and the restoration message. The completed
panel was captured locally. This confirms browser state/feedback; an audible
speaker/listening comparison on the intended exhibition device remains manual.
