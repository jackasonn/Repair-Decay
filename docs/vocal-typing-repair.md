# Vocal single-word typing repair

Only **On Time** and **There Is Love** use this game. Each timed lyric specifies exactly **one** chosen keyword in `js/lyrics/on-time.js` or `js/lyrics/there-is-love.js`. The entire lyric appears, but only the chosen word is underlined and displayed as the typing target.

Typing that word correctly repairs **one currently active Vocal decay event**. Capitalisation, spaces and punctuation are ignored. Correct letters light up as you type and mistakes can be corrected with Backspace. Input still follows the lyric time window, resets when the next lyric begins and is disabled during pauses or when no Vocal decay event is active. A lyric can only repair an event once per game session. A song change or dialog close cancels stale input.

This removes the former two-to-three-word requirement without changing the musical timing or repair rules. Check lyric alignment against the actual audio during exhibition setup.

Source: `js/repair/vocals.js`. Regression tests: `tests/vocal-repair.cjs`.
