# Plan: Add Web Audio Sine Wave Oscillator to sketch.js

## Goal

Add Web Audio API playback (sine wave oscillator) driven by the `type` property of the incoming SSE event. When `type` is `"audio"`, play via Web Audio. When `type` is `"midi"`, play via the selected MIDI device. No UI selector is needed.

---

## Changes to `NoteStreamApp/wwwroot/sketch.js`

### 1. Add Web Audio globals

At the top of the file, alongside the existing MIDI globals, add:

```js
let audioCtx = null;
let activeOscillators = {}; // keyed by midiNumber
```

Remove `playbackModeSelector` — it is no longer needed.

### 2. Add `initAudioContext()`

Initialize the `AudioContext` lazily (browsers require a user gesture before creating it):

```js
function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}
```

Call `initAudioContext()` from `mousePressed()` (already a user gesture) so the context is primed before any SSE events arrive.

### 3. Add `midiToFrequency(midiNumber)`

Convert a MIDI note number to Hz:

```js
function midiToFrequency(midiNumber) {
  return 440 * Math.pow(2, (midiNumber - 69) / 12);
}
```

### 4. Add `playNoteWebAudio(midiNumber)` and `stopNoteWebAudio(midiNumber)`

```js
function playNoteWebAudio(midiNumber) {
  initAudioContext();
  if (activeOscillators[midiNumber]) return; // already playing

  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(midiToFrequency(midiNumber), audioCtx.currentTime);
  gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);

  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  osc.start();

  activeOscillators[midiNumber] = { osc, gainNode };
}

function stopNoteWebAudio(midiNumber) {
  const entry = activeOscillators[midiNumber];
  if (!entry) return;

  const { osc, gainNode } = entry;
  // Short fade-out to avoid clicks
  gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.02);
  osc.stop(audioCtx.currentTime + 0.1);
  delete activeOscillators[midiNumber];
}
```

### 5. Modify `handleSSENote(data)` to branch on `data.Type`

The SSE payload now includes a `Type` property (`"audio"` or `"midi"`). Update `handleSSENote` to:

- Guard on `data.Type` in addition to `data.NoteName` and `data.DurationMs`
- Route to Web Audio or MIDI accordingly
- Fix the existing bug where `data.duration` is used instead of `data.DurationMs` on the `setTimeout` call

```js
function handleSSENote(data) {
  if (!data.NoteName || !data.DurationMs || !data.Type) {
    console.error('Invalid SSE data, missing NoteName, DurationMs, or Type:', data);
    return;
  }

  const midiNumber = noteNameToMidiNumber(data.NoteName);
  if (midiNumber === null) return;

  console.log(`Playing SSE note: ${data.NoteName} (MIDI ${midiNumber}) for ${data.DurationMs}ms via ${data.Type}`);

  if (data.Type === 'audio') {
    playNoteWebAudio(midiNumber);
    createNoteAnimation(data.NoteName, midiNumber);

    setTimeout(() => {
      stopNoteWebAudio(midiNumber);

      for (let anim of noteAnimations) {
        if (anim.midiNumber === midiNumber && anim.isActive) {
          anim.release();
          break;
        }
      }
    }, data.DurationMs);

  } else if (data.Type === 'midi') {
    sendNoteOn(midiNumber);

    setTimeout(() => {
      sendNoteOff(midiNumber);

      for (let anim of noteAnimations) {
        if (anim.midiNumber === midiNumber && anim.isActive) {
          anim.release();
          break;
        }
      }
    }, data.DurationMs);
  }
}
```

Note: for the `"audio"` branch, `createNoteAnimation` is called directly rather than via `sendNoteOn`, because `sendNoteOn` is for MIDI and sets `currentNote` (a concept tied to mouse interaction).

### 6. Keep `sendNoteOn` / `sendNoteOff` MIDI-only

These functions are used for mouse-triggered MIDI playback and should remain unchanged (MIDI only). No routing logic is needed in them.

---

## Order of implementation

1. Add globals (`audioCtx`, `activeOscillators`)
2. Add `initAudioContext()`, `midiToFrequency()`, `playNoteWebAudio()`, `stopNoteWebAudio()`
3. Call `initAudioContext()` from `mousePressed()`
4. Rewrite `handleSSENote` to branch on `data.Type` and fix the `data.duration` bug
