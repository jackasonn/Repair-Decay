# Vocal keyword typing repair

Only **On Time** and **There Is Love** use the lyric keyword typing game. Full lyric text and selected 2–3 keywords per phrase are defined in the timestamped files `js/lyrics/on-time.js` and `js/lyrics/there-is-love.js`.

Input follows the song clock. Matching ignores case, punctuation and whitespace. Completing the selected keywords for the current line repairs **one real active Vocal decay event**; stale, duplicate or eventless input cannot clear another. Pausing disables the input; song/dialog changes cancel the current game. Timing was originally machine aligned and should still be checked against the audio by listening.

Source: `js/app.js` (`vocalChallenge`, `updateVocalRepair`, `handleVocalInput`). Test: `tests/vocal-repair.cjs`.
