# Vocal keyword typing repair

On Time and There Is Love now share the same keyword typing game. The full
current lyric remains visible, but only 2–3 selected words need typing, in
order. Selected words are underlined in the lyric and repeated in a short
TYPE ONLY word list. Each correct letter illuminates its corresponding letter
in the full lyric, skipping unneeded words. For example, the bridge line
“Look around and you will find love in everything” requires “Look find love”.

Lyrics are selected from the current song's own table. There Is Love retains
its existing 25 phrase timestamps; On Time adds 19 occurrences, including the
repeated ending heard in the recording. Text comes from the user's lyrics.
`keywords` contains zero-based word indices, ordered within each phrase.
Only On Time and There Is Love enable typing; other Vocal controls retain
current behavior. No other instrument game is modified by this update.

Input is case-insensitive; spaces and punctuation are optional. Wrong letters
do not advance and can be corrected with Backspace. Line changes clear the
input and select a new short challenge. Complete two distinct keyword sets to
restore all current Vocal decay effects. As in current main, completed panels
remain open; input disables and restoration feedback appears. Pausing freezes
the displayed phrase and disables input, with a resume button in the panel.
Closing or switching songs cancels stale input. Intro/interlude/outro gaps do
not invent lyrics or repeat an old phrase.

## Timing sources

Both tables use `audibleSongPosition('vocals')`, the existing shared playback
clock with output and Vocal-worklet latency compensation. No separate song
clock, stem replacement or runtime transcription is introduced.

There Is Love: existing automatic word/forced alignment and silence refinement,
about 228.83 s. Vocal SHA-256:
a7fa2f34b71d7287511e8a9e6a3525d161e932b24dbad276dc30a5b11716c536.

On Time: local faster-whisper 1.2.1 / base.en word timestamps against the actual
Vocal MP3. Repeated phrases are included in the recording's order. Line windows
use detected word/phrase boundaries with up to 0.4 s of tail, clamped to the
next phrase; the first compound segment is split at detected word boundaries.
The first sung phrase starts at about 21 s; the ending repeat runs about
83–105 s. Vocal SHA-256:
331b012c83f8b02a1aa57480d802ac9621d50438f5891add8a12b0428980f408.
The model and analysis outputs are local temporary tools; audio is not uploaded.
Timing remains a machine-aligned first pass; weak pickups and long notes can
benefit from a later listening pass. Tables are separately editable.

## Validation

Run node --check script.js; node --check on-time-lyrics.js;
node --check there-is-love-lyrics.js; node tests/vocal-repair.cjs;
git diff --check. Vocal tests cover both songs, every line's 2–3 ordered words,
exact selected-letter positions including skipped words, grey unneeded letters,
mistakes/backspace, punctuation/case, paused input, two-set restoration,
current-song timing, repeated occurrences, boundary submissions and cancellation.

Existing unrelated game test harnesses predate subsequent main changes to Drum,
Guitar and Keys rules. Their legacy failures are not changed by this Vocal-only
update; current instrument implementations are preserved from latest main.
