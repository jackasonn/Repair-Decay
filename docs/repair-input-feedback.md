# Repair input and feedback

Successful repairs play `assets/audio/ui/success.mp3`, alongside the existing switch-off sound. Failed and empty actions play the error sound without clearing decay. Bass's idle peg and Drum's empty input show a short floating notice.

Drum Space is handled in the capture phase even if a native dialog button has focus. The handler cancels button activation during the game, filters repeated holds and preserves normal text input behavior. Global switches are accessible independently of the decay percentage. All five instrument games show a large glowing green tick and `FULLY REPAIRED` overlay after the last active decay event is repaired, then the popup closes automatically after two seconds. Manual closure, song navigation or newly arriving decay cancels pending completion. Opening a clean game does not trigger the celebration. Global decay switches retain their immediate-close behaviour.

Source: `js/app.js`. Tests: `tests/repair-input.cjs`, `tests/repair-dialogs.cjs`.
