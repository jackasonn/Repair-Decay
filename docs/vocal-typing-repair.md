# There Is Love Vocal typing pilot

Only There Is Love replaces its Vocal repair switches with typing. On Time is
reserved for a later lyric/timing submission; Rainy Night's Vocal switches and
all other instrument games remain unchanged. The existing left Vocal artwork,
particles and diagnostics remain. Global repair controls remain available.

## Playback synchronization

`there-is-love-lyrics.js` contains 25 timed phrase occurrences in the recording's
actual order, including repeated chorus/bridge lines. Text comes from the user.
It is loaded before script.js; no network transcription runs in the site.
The supplied song arrangement has a first short chorus and later repeated
chorus/bridge phrases; the table follows the recording rather than repeating
the printed verse/chorus headings mechanically.

The table was produced locally using faster-whisper 1.2.1 / base.en, a first
word-timestamp pass, short-chunk checks and forced alignment of the supplied
lyrics. Silence gaps in the isolated Vocal stem were used to refine phrase
pickups; starts have a small lead-in and tails up to 0.4 s. Ambiguous bridge
pickups were adjusted against the aligned neighbouring words. This is a
machine-aligned first pass, not a listening-certified transcription; sung
pickups and long notes may need further listening adjustment. Start/end values
are intentionally editable separately from the game.

Source: assets/there-is-love-vocals.mp3, decoded length about 228.83 s.
SHA-256: a7fa2f34b71d7287511e8a9e6a3525d161e932b24dbad276dc30a5b11716c536.
The speech model and decoded intermediates are temporary local tooling, not
runtime dependencies, and the audio was not uploaded for transcription.

`audibleSongPosition('vocals')` uses the existing shared Web Audio source clock,
output timestamp/device latency and the actual Vocal pitch-worklet delay. The
Drum timing function delegates to the same helper with its own track ID.
Lyrics select their actual [start,end) interval at each frame. Pausing freezes
the lyric position and disables input; the panel can resume music. Opening in
the middle of the song selects that phrase immediately. Intros, gaps and the
outro show a waiting/replay prompt instead of an out-of-date lyric.

## Typing and completion

Untyped characters are grey. Each matching letter in the typed prefix lights
up in cream; spaces, punctuation and case are optional. Mistakes do not advance
and can be corrected with Backspace. Editing recomputes the prefix so deleted
letters turn grey again. At a lyric boundary the input resets to the newly
sung phrase; old text cannot be submitted for the new line.

Complete two distinct phrase occurrences to restore the Vocal. A completed
line is disabled until playback reaches the next phrase, preventing double
credit. Progress persists across line changes within the attempt. Success uses
repairTrack('vocals') to clear all Vocal events/effects and close the dialog.
Closing or changing songs cancels the attempt without falsely repairing.

## Checks

node --check script.js
node --check there-is-love-lyrics.js
node tests/vocal-repair.cjs
node tests/rhythm-repair.cjs
node tests/guitar-repair.cjs
node tests/keys-repair.cjs
git diff --check

Tests cover current-phrase selection, sorted/nonoverlapping timing intervals,
character highlighting, case/punctuation tolerance, wrong letters/correction,
pause, old-line boundary submissions, repeated-line credit, two-line completion,
audio reset, auto-close, mid-song opening and There Is Love-only scope.

Browser inspection confirmed the original Vocal image on the left, the typing
panel on the right, an instrumental waiting state followed by the current
bridge lyrics, automatic line changes, and wrong-letter feedback. Automated
character-level tests cover matching-letter illumination and repair completion.
