# Repair input and feedback

Successful repairs play `assets/audio/ui/success.mp3`, alongside the existing switch-off sound. Failed and empty actions play the error sound without clearing decay. Bass's idle peg and Drum's empty input show a short floating notice.

Drum Space is handled in the capture phase even if a native dialog button has focus. The handler cancels button activation during the game, filters repeated holds and preserves normal text input behavior. Global switches are accessible independently of the decay percentage. All five instrument games keep the panel uncovered for 850 ms after the final repair, allowing explosions and pop animations to finish. Then a large glowing green tick and `FULLY REPAIRED` overlay appears for 1.3 seconds before the popup closes automatically. Manual closure, song navigation or newly arriving decay cancels pending completion. Opening a clean game does not trigger the celebration. Global decay switches retain their immediate-close behaviour.

Source: `js/app.js`. Tests: `tests/repair-input.cjs`, `tests/repair-dialogs.cjs`.
