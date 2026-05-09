# BPM + Note-Fraction Timing — Design Spec

Date: 2026-05-04
Status: Approved for implementation planning

## Goal

Replace millisecond-based note timing in the workflow input with musical notation: a tempo (BPM) at the score level, and note fractions (`"1/4"`, `"1/16"`, `"1/8."`) per note. Conversion to milliseconds happens in `SendNoteActivity`, calibrated by a measured workflow-overhead value, before posting to NoteStreamApp. The NoteStreamApp / front-end playback contract stays in milliseconds and is unchanged.

## Motivation

- The current ms-based scores in `NoteStreamApp/wwwroot/musicscores.js` are hard to read, awkward to edit, and don't represent how musicians think about rhythm.
- Dapr Workflow has non-trivial per-activity overhead (state persistence + replay). At fast tempos this drifts the timing audibly. Subtracting a measured overhead per note keeps playback in sync with the intended BPM.

## Non-goals

- No changes to the `/sendnote` payload contract or the front-end audio/MIDI pipeline.
- No support for tempo changes mid-score, time signatures, or rests as a distinct concept (a note with `Interval: "1/4"` and a short `NoteLength` already produces a rest-like gap).
- No graceful handling of malformed fractions — bad input is a bug and surfaces as an activity exception.

## Data model

### Front-end score format (`musicscores.js`)

```js
{
  Title: "Happy",
  Bpm: 120,
  Repeats: 1,
  Notes: [
    { Id: "1", NoteName: "G3", Type: playbackType, NoteLength: "1/8", Interval: "0"   },
    { Id: "2", NoteName: "G3", Type: playbackType, NoteLength: "1/4", Interval: "1/4" },
    { Id: "3", NoteName: "A3", Type: playbackType, NoteLength: "1/4", Interval: "1/8" }
  ]
}
```

Fraction grammar:
- `"N/D"` — plain fraction (`"1/4"`, `"1/16"`).
- `"N/D."` — trailing dot multiplies by 1.5 (dotted note).
- `"0"` — zero, used for `Interval` on the first note or any zero-wait case.

No `DurationMs` or `WaitMs` anywhere in the JSON sent from front-end to workflow.

### ConcertoWorkflow C# types

Replace the current `Note` record. Add a separate playback type for the outbound POST:

```csharp
public record MusicScore(string Title, int Bpm, int Repeats, ScoreNote[] Notes);
public record ScoreNote(string Id, string NoteName, string Type, string NoteLength, string Interval);
public record PlaybackNote(string Id, string NoteName, string Type, int DurationMs, int WaitMs);
public record SendNoteInput(ScoreNote Note, int Bpm, int OverheadMs);
```

`PlaybackNote` matches the shape of NoteStreamApp's existing `Note` record, so the receiving side requires no changes.

### NoteStreamApp

No changes to its `Note` record, `/sendnote` handler, SSE format, or `wwwroot/sketch.js` playback logic. Only `wwwroot/musicscores.js` (the score definitions) is rewritten.

## Workflow flow

```
MusicWorkflow.RunAsync(MusicScore score):
  1. SendInstanceIdActivity (existing)
  2. var t1 = await CallActivity(MeasureLatencyActivity)   // returns DateTimeOffset.UtcNow
  3. var t2 = await CallActivity(MeasureLatencyActivity)
  4. var overheadMs = (int)(t2 - t1).TotalMilliseconds
  5. foreach note in score.Notes:
       await CallActivity(SendNoteActivity, new SendNoteInput(note, score.Bpm, overheadMs))
  6. (existing repeat / ContinueAsNew logic, if any)
```

The two `MeasureLatencyActivity` calls capture exactly one full activity round-trip's worth of overhead (queue → execute → persist → replay). That value is passed into every `SendNoteActivity` invocation for the lifetime of the workflow run.

## Timing math

Performed inside `SendNoteActivity`:

```
quarterMs       = 60000 / Bpm
wholeMs         = quarterMs * 4
noteLengthValue = FractionParser.ParseToValue(note.NoteLength)
intervalValue   = FractionParser.ParseToValue(note.Interval)

idealDurationMs = (int)(wholeMs * noteLengthValue)
idealWaitMs     = (int)(wholeMs * intervalValue)
actualWaitMs    = Math.Max(0, idealWaitMs - overheadMs)
```

- `DurationMs` (note play length) is **not** overhead-adjusted — it's a front-end playback concern.
- `WaitMs` (gap before the note) **is** overhead-adjusted, clamped at zero. Subtraction (not multiplication) is correct because Dapr's per-activity overhead is roughly constant, not proportional to note length.

After conversion, `SendNoteActivity`:
1. `await Task.Delay(actualWaitMs)`
2. POSTs `PlaybackNote(Id, NoteName, Type, idealDurationMs, actualWaitMs)` to NoteStreamApp's `/sendnote`.

## New / changed files

### New
- `ConcertoWorkflow/FractionParser.cs` — static class with `ParseToValue(string fraction) -> double`. Throws `FormatException` on malformed input.
- `ConcertoWorkflow/MeasureLatencyActivity.cs` — returns `DateTimeOffset.UtcNow`.

### Changed
- `ConcertoWorkflow/Program.cs` — replace `Note` record with `ScoreNote`, `PlaybackNote`, `SendNoteInput`; update `MusicScore` to include `Bpm`; register `MeasureLatencyActivity`.
- `ConcertoWorkflow/MusicWorkflow.cs` — add the two `MeasureLatencyActivity` calls and overhead computation; pass `SendNoteInput` to `SendNoteActivity`.
- `ConcertoWorkflow/SendNoteActivity.cs` — change input type to `SendNoteInput`; perform fraction parsing, ms conversion, and overhead subtraction; POST `PlaybackNote`.
- `NoteStreamApp/wwwroot/musicscores.js` — rewrite all 8 scores (`Intro`, `Happy`, `Rhythm`, `Strange`, `X`, `BB`, `Never`, `Final`) using `Bpm` and `NoteLength` / `Interval` fractions.
- `local.http` — update sample request bodies to the new BPM + fraction format.

### Unchanged
- `NoteStreamApp/Program.cs`, `NoteStreamApp/wwwroot/sketch.js`, `NoteStreamApp/wwwroot/index.html`, SSE format, the `Note` record on the receiving side.

## Score migration strategy

Re-author each of the 8 existing scores by hand: pick a sensible BPM per song and express each note in standard fractions. Several scores already sit on clean ms grids (e.g. Intro's `WaitMs: 1600` and `2400` are half / dotted-half at BPM 100). Where the existing ms values are deliberately uneven for groove, the BPM can be tuned so the closest fractions still feel right.

## Error handling

- `FractionParser.ParseToValue` throws `FormatException` on inputs it can't parse (`""`, `"abc"`, `"1/0"`, etc.). The workflow surfaces this as a normal activity failure — no special handling.
- `actualWaitMs` is clamped to `>= 0` so very short notes at fast tempos don't produce negative delays when overhead exceeds the gap.
- If `Bpm <= 0` on input, fail fast in `SendNoteActivity` with `ArgumentOutOfRangeException`.

## Testing approach

This is a small demo, so manual end-to-end verification via the existing front-end is the primary check:
1. `dapr run -f dapr.yaml`, open `http://localhost:5051`, start each of the 8 scores, confirm they sound right.
2. A small unit test for `FractionParser` covering: plain (`"1/4"` → 0.25), dotted (`"1/4."` → 0.375), zero (`"0"` → 0), and a malformed input throws.
3. Spot-check the overhead measurement: log `overheadMs` at workflow start; expect a small but non-zero value (typically tens of ms).
