# Plan: Update Play button to call `startmusic` endpoint

## Context

The Play button in `sketch.js` currently calls the `/play` endpoint (which raises a "play" event on an existing workflow). It needs to instead call the `/startmusic` endpoint to schedule a new workflow with a predefined "Happy Birthday" music score. The button should be renamed from "Play" to "Start".

## File to modify

- `NoteStreamApp/wwwroot/sketch.js`

## Changes

### 1. Add `getHappyMusicScore()` function (new function, after the constants ~line 46)

Create a function that returns the MusicScore object with all 25 notes, `"midi"` as the Type for every note, `Looping: false`, and `Title: "Happy"`. This keeps the score isolated in one function for easy replacement later.

### 2. Rename the Play button to "Start" (line 317)

In `createPlayButton()`, change the button text from `'Play'` to `'Start'`.

### 3. Enable the Start button immediately (line 320 + lines 410-412)

- Remove `playButton.attribute('disabled', '');` from `createPlayButton()` so the button is enabled on page load.
- Remove the `playButton.removeAttribute('disabled')` call inside the SSE `instanceId` event listener (lines 410-412), since the button no longer depends on receiving an instanceId first.

### 4. Update `onPlayButtonPressed()` (lines 356-380)

Replace the entire function body:
- Remove the `workflowInstanceId` guard check at the top (lines 357-360) since we're creating a new workflow, not referencing an existing one.
- Keep `initAudioContext()`.
- Change the URL from `/play?instanceId=...` to `/startmusic` (port 5500).
- Send a POST with `Content-Type: application/json` and `JSON.stringify(getHappyMusicScore())` as the body.
- On success, parse the JSON response to extract `instanceId` and store it in `workflowInstanceId`.
- Disable the Start button after a successful start (to prevent duplicate workflows).
- Enable the pause/resume button on success (keep existing behavior).

## Verification

1. Run both the ConcertoWorkflow and NoteStreamApp services.
2. Open the browser app — the Start button should be enabled immediately.
3. Click Start — it should POST to `/startmusic` with the music score JSON.
4. Verify the workflow starts and notes play via SSE.
5. Verify pause/resume still works using the stored `workflowInstanceId`.
