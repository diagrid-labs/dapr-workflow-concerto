# BPM + Note-Fraction Timing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Note from user:** Do NOT run `git add` or `git commit` during planning or implementation. Verification is end-to-end via `dapr run`, not via commits.

**Goal:** Replace the millisecond-based note timing in the workflow input with musical notation (BPM + note fractions). `SendNoteActivity` converts to milliseconds, calibrated by a measured per-activity overhead, before posting to NoteStreamApp. The NoteStreamApp / front-end playback contract stays in milliseconds.

**Architecture:** Two new types separate the workflow input (`ScoreNote` with fractions) from the playback payload (`PlaybackNote` with ms). A new `MeasureLatencyActivity` is invoked twice in sequence at the start of the workflow; the elapsed time captures one full Dapr Workflow round-trip and is passed into every `SendNoteActivity` call so it can subtract that overhead from each computed `WaitMs`. A small static `FractionParser` converts strings like `"1/8."` into doubles.

**Tech Stack:** C# / .NET 10, Dapr.Workflow 1.17.2, ASP.NET Core Minimal API, vanilla JS.

**Spec:** `docs/superpowers/specs/2026-05-04-bpm-fractions-design.md`

---

## File map

**Create:**
- `ConcertoWorkflow/FractionParser.cs` — static helper, `ParseToValue(string) -> double`.
- `ConcertoWorkflow/MeasureLatencyActivity.cs` — workflow activity returning `DateTimeOffset.UtcNow`.

**Modify:**
- `ConcertoWorkflow/Program.cs` — replace `Note` and `MusicScore` records, add `ScoreNote`, `PlaybackNote`, `SendNoteInput`; register `MeasureLatencyActivity`.
- `ConcertoWorkflow/MusicWorkflow.cs` — change input type to new `MusicScore`, call `MeasureLatencyActivity` twice, pass `SendNoteInput` to `SendNoteActivity`.
- `ConcertoWorkflow/SendNoteActivity.cs` — change input type to `SendNoteInput`, convert fractions + BPM + overhead → ms, POST `PlaybackNote`.
- `NoteStreamApp/wwwroot/musicscores.js` — rewrite all 8 scores with `Bpm` + `NoteLength` + `Interval`.
- `local.http` — update sample request bodies to BPM + fraction format.

**Unchanged:**
- `NoteStreamApp/Program.cs`, `NoteStreamApp/wwwroot/sketch.js`, `NoteStreamApp/wwwroot/index.html`, the existing `Note` record on the receiving side, the `/sendnote` payload contract.

---

## Task 1: Add FractionParser

**Files:**
- Create: `ConcertoWorkflow/FractionParser.cs`

- [ ] **Step 1: Create the file**

Create `ConcertoWorkflow/FractionParser.cs` with this exact content:

```csharp
using System;

public static class FractionParser
{
    /// <summary>
    /// Parses musical fraction strings into a value where 1.0 = whole note.
    /// Supported forms: "0", "N/D", "N/D." (trailing dot multiplies by 1.5).
    /// </summary>
    public static double ParseToValue(string fraction)
    {
        if (string.IsNullOrWhiteSpace(fraction))
        {
            throw new FormatException("Fraction is null or empty.");
        }

        if (fraction == "0")
        {
            return 0d;
        }

        var dotted = fraction.EndsWith(".", StringComparison.Ordinal);
        var core = dotted ? fraction[..^1] : fraction;

        var slash = core.IndexOf('/');
        if (slash <= 0 || slash == core.Length - 1)
        {
            throw new FormatException($"Invalid fraction: '{fraction}'.");
        }

        if (!int.TryParse(core[..slash], out var num) ||
            !int.TryParse(core[(slash + 1)..], out var den) ||
            den == 0)
        {
            throw new FormatException($"Invalid fraction: '{fraction}'.");
        }

        var value = (double)num / den;
        return dotted ? value * 1.5 : value;
    }
}
```

- [ ] **Step 2: Verify compile**

Run from repo root:
```
dotnet build ConcertoWorkflow/ConcertoWorkflow.csproj
```
Expected: build succeeds with 0 errors.

- [ ] **Step 3: Quick sanity check (no unit test framework in repo)**

Open a temporary REPL or write a one-shot console line in `Program.cs` (revert immediately after) to confirm:
- `FractionParser.ParseToValue("1/4")` returns `0.25`
- `FractionParser.ParseToValue("1/8.")` returns `0.1875`
- `FractionParser.ParseToValue("0")` returns `0`
- `FractionParser.ParseToValue("abc")` throws `FormatException`

If you'd rather skip this, the parser is small enough to eyeball; verification will happen end-to-end in Task 9.

---

## Task 2: Add MeasureLatencyActivity

**Files:**
- Create: `ConcertoWorkflow/MeasureLatencyActivity.cs`

- [ ] **Step 1: Create the file**

Create `ConcertoWorkflow/MeasureLatencyActivity.cs` with this exact content:

```csharp
using System;
using Microsoft.Extensions.Logging;
using Dapr.Workflow;

public sealed partial class MeasureLatencyActivity(ILogger<MeasureLatencyActivity> logger)
    : WorkflowActivity<object?, DateTimeOffset>
{
    public override Task<DateTimeOffset> RunAsync(WorkflowActivityContext context, object? _)
    {
        var now = DateTimeOffset.UtcNow;
        LogTick(logger, now);
        return Task.FromResult(now);
    }

    [LoggerMessage(LogLevel.Information, "MeasureLatencyActivity tick: {Now:o}")]
    partial void LogTick(ILogger logger, DateTimeOffset Now);
}
```

- [ ] **Step 2: Verify compile**

Run:
```
dotnet build ConcertoWorkflow/ConcertoWorkflow.csproj
```
Expected: build succeeds. (The activity is not yet registered; that happens in Task 3.)

---

## Task 3: Replace records and register the new activity in Program.cs

**Files:**
- Modify: `ConcertoWorkflow/Program.cs`

- [ ] **Step 1: Replace the record declarations at the bottom**

Find the last two lines of `ConcertoWorkflow/Program.cs`:

```csharp
public record MusicScore(string Title, int Repeats, Note[] Notes);
public record Note(string Id, string NoteName, string Type, int DurationMs, int WaitMs);
```

Replace them with:

```csharp
public record MusicScore(string Title, int Bpm, int Repeats, ScoreNote[] Notes);
public record ScoreNote(string Id, string NoteName, string Type, string NoteLength, string Interval);
public record PlaybackNote(string Id, string NoteName, string Type, int DurationMs, int WaitMs);
public record SendNoteInput(ScoreNote Note, int Bpm, int OverheadMs);
```

- [ ] **Step 2: Register MeasureLatencyActivity in the workflow options**

Find this block in `ConcertoWorkflow/Program.cs`:

```csharp
builder.Services.AddDaprWorkflow(options =>
{
    options.RegisterActivity<SendNoteActivity>();
    options.RegisterActivity<SendInstanceIdActivity>();
});
```

Replace with:

```csharp
builder.Services.AddDaprWorkflow(options =>
{
    options.RegisterActivity<SendNoteActivity>();
    options.RegisterActivity<SendInstanceIdActivity>();
    options.RegisterActivity<MeasureLatencyActivity>();
});
```

- [ ] **Step 3: Build to surface broken references**

Run:
```
dotnet build ConcertoWorkflow/ConcertoWorkflow.csproj
```
Expected: build FAILS with errors in `MusicWorkflow.cs` and `SendNoteActivity.cs` referring to the old `Note` record / missing `DurationMs` / `WaitMs`. These are fixed in Tasks 4 and 5.

---

## Task 4: Update MusicWorkflow with latency calibration

**Files:**
- Modify: `ConcertoWorkflow/MusicWorkflow.cs`

- [ ] **Step 1: Replace the entire file contents**

Open `ConcertoWorkflow/MusicWorkflow.cs` and replace its full contents with:

```csharp
using System;
using Microsoft.Extensions.Logging;
using Dapr.Workflow;

public sealed partial class MusicWorkflow : Workflow<MusicScore, object>
{
    public override async Task<object> RunAsync(WorkflowContext context, MusicScore musicScore)
    {
        var logger = context.CreateReplaySafeLogger<MusicWorkflow>();
        LogStart(logger, musicScore.Title, musicScore.Bpm);

        // Calibrate per-activity overhead by running two no-op activities back-to-back.
        // The elapsed time captures one full activity round-trip (queue + execute + persist + replay).
        var t1 = await context.CallActivityAsync<DateTimeOffset>(nameof(MeasureLatencyActivity), null!);
        var t2 = await context.CallActivityAsync<DateTimeOffset>(nameof(MeasureLatencyActivity), null!);
        var overheadMs = Math.Max(0, (int)(t2 - t1).TotalMilliseconds);
        LogOverhead(logger, overheadMs);

        foreach (var note in musicScore.Notes)
        {
            await context.CallActivityAsync<bool>(
                nameof(SendNoteActivity),
                new SendNoteInput(note, musicScore.Bpm, overheadMs));
        }

        return $"{musicScore.Title} Completed!";
    }

    [LoggerMessage(LogLevel.Information, "Starting music workflow: {Title} @ {Bpm} bpm")]
    partial void LogStart(ILogger logger, string Title, int Bpm);

    [LoggerMessage(LogLevel.Information, "Measured per-activity overhead: {OverheadMs} ms")]
    partial void LogOverhead(ILogger logger, int OverheadMs);
}
```

- [ ] **Step 2: Build (will still fail on SendNoteActivity)**

Run:
```
dotnet build ConcertoWorkflow/ConcertoWorkflow.csproj
```
Expected: build FAILS with errors only in `SendNoteActivity.cs`. Fixed in Task 5.

---

## Task 5: Update SendNoteActivity to convert fractions to ms

**Files:**
- Modify: `ConcertoWorkflow/SendNoteActivity.cs`

- [ ] **Step 1: Replace the entire file contents**

Open `ConcertoWorkflow/SendNoteActivity.cs` and replace its full contents with:

```csharp
using System;
using Microsoft.Extensions.Logging;
using Dapr.Workflow;

public sealed partial class SendNoteActivity(ILogger<SendNoteActivity> logger, HttpClient httpClient)
    : WorkflowActivity<SendNoteInput, bool>
{
    public override async Task<bool> RunAsync(WorkflowActivityContext context, SendNoteInput input)
    {
        if (input.Bpm <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(input.Bpm), "BPM must be positive.");
        }

        var note = input.Note;
        var wholeMs = (60000d / input.Bpm) * 4d;

        var noteLengthValue = FractionParser.ParseToValue(note.NoteLength);
        var intervalValue = FractionParser.ParseToValue(note.Interval);

        var idealDurationMs = (int)(wholeMs * noteLengthValue);
        var idealWaitMs = (int)(wholeMs * intervalValue);
        var actualWaitMs = Math.Max(0, idealWaitMs - input.OverheadMs);

        LogNoteSend(logger, note.NoteName, idealDurationMs, actualWaitMs);

        await Task.Delay(actualWaitMs);

        var playback = new PlaybackNote(
            note.Id,
            note.NoteName,
            note.Type,
            idealDurationMs,
            actualWaitMs);

        var response = await httpClient.PostAsJsonAsync("/sendnote", playback);
        return response.IsSuccessStatusCode;
    }

    [LoggerMessage(LogLevel.Information, "SendNoteActivity: {NoteName} (duration={DurationMs}ms, wait={WaitMs}ms)")]
    partial void LogNoteSend(ILogger logger, string NoteName, int DurationMs, int WaitMs);
}
```

- [ ] **Step 2: Build the whole project**

Run:
```
dotnet build ConcertoWorkflow/ConcertoWorkflow.csproj
```
Expected: build succeeds with 0 errors and 0 warnings.

---

## Task 6: Rewrite musicscores.js

**Files:**
- Modify: `NoteStreamApp/wwwroot/musicscores.js`

The eight existing scores must be rewritten to use `Bpm` at the score level and `NoteLength` + `Interval` (string fractions) at the note level. `DurationMs` and `WaitMs` are removed.

The following BPM picks are derived from each score's existing ms grid (closest clean musical reading):

| Score | Existing grid | BPM | Notes |
|-------|---------------|-----|-------|
| Intro | 1600 / 2400 / 200 ms | 75 | quarter ≈ 800ms; 200ms = 1/16, 1600ms = half, 2400ms = dotted half |
| Happy | 150–500 / 1000 ms | 120 | quarter = 500ms, eighth = 250ms, dotted = 750ms |
| Rhythm | 200 / 220 ms | 136 | quarter ≈ 441ms, sixteenth ≈ 110ms, eighth ≈ 220ms |
| Strange | 200 / 200 ms | 150 | eighth = 200ms |
| X (XFiles) | 500 / 1500 / 1000 / 400 ms | 60 | quarter = 1000ms |
| BB (Blues Brothers) | 150 / 200 ms | 150 | eighth ≈ 200ms |
| Never (Rick) | 200–600 / 700 / 400 / 500 ms | 100 | quarter = 600ms |
| Final | 100 / 800 / 1000 ms | 75 | quarter = 800ms |

- [ ] **Step 1: Replace the full contents of `NoteStreamApp/wwwroot/musicscores.js`**

Replace the entire file with:

```js
function getIntroMusicScore() {
  return {
    Title: "Intro",
    Bpm: 75,
    Repeats: 1,
    Notes: [
      { Id: "1", NoteName: "F#2", Type: playbackType, NoteLength: "1/2",  Interval: "0"     },
      { Id: "2", NoteName: "B2",  Type: playbackType, NoteLength: "1/2",  Interval: "1/2"   },
      { Id: "3", NoteName: "D2",  Type: playbackType, NoteLength: "1/2.", Interval: "1/2"   },
      { Id: "4", NoteName: "F#2", Type: playbackType, NoteLength: "1/2",  Interval: "1/2."  },
      { Id: "5", NoteName: "D2",  Type: playbackType, NoteLength: "1/2",  Interval: "1/2"   },
      { Id: "6", NoteName: "G2",  Type: playbackType, NoteLength: "1/2.", Interval: "1/2"   },
      { Id: "7", NoteName: "F#2", Type: playbackType, NoteLength: "1/2",  Interval: "1/2."  },
      { Id: "8", NoteName: "B2",  Type: playbackType, NoteLength: "1/2",  Interval: "1/2"   },
      { Id: "9", NoteName: "D2",  Type: playbackType, NoteLength: "1/2.", Interval: "1/2"   },
      { Id: "10", NoteName: "F#2", Type: playbackType, NoteLength: "1/2", Interval: "1/2."  },
      { Id: "11", NoteName: "D2",  Type: playbackType, NoteLength: "1/2", Interval: "1/2"   },
      { Id: "12", NoteName: "G2",  Type: playbackType, NoteLength: "1/2.", Interval: "1/2"  },

      ...buildAlternatingPattern(13, ["F#2","F#3"], 8, "1/2."),
      ...buildAlternatingPattern(21, ["B2","B3"], 8),
      ...buildAlternatingPattern(29, ["D2","D3"], 12),

      ...buildAlternatingPattern(41, ["F#2","F#3"], 8),
      ...buildAlternatingPattern(49, ["D2","D3"], 8),
      ...buildAlternatingPattern(57, ["G2","G3"], 12),

      ...buildAlternatingPattern(69, ["F#2","F#3"], 8),
      ...buildAlternatingPattern(77, ["B2","B3"], 8),
      ...buildAlternatingPattern(85, ["D2","D3"], 12),

      ...buildAlternatingPattern(97, ["F#2","F#3"], 8),
      ...buildAlternatingPattern(105, ["D2","D3"], 8),
      ...buildAlternatingPattern(113, ["G2","G3"], 12),
    ]
  };
}

// Helper: builds an alternating two-note 1/16 pattern of `count` notes,
// starting at id `startId`. First note gets `firstInterval` (defaults to "1/16").
function buildAlternatingPattern(startId, [low, high], count, firstInterval = "1/16") {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({
      Id: String(startId + i),
      NoteName: i % 2 === 0 ? low : high,
      Type: playbackType,
      NoteLength: "1/16",
      Interval: i === 0 ? firstInterval : "1/16",
    });
  }
  return out;
}

function getHappyMusicScore() {
  return {
    Title: "Happy",
    Bpm: 120,
    Repeats: 1,
    Notes: [
      { Id: "1",  NoteName: "G3", Type: playbackType, NoteLength: "1/16", Interval: "0"    },
      { Id: "2",  NoteName: "G3", Type: playbackType, NoteLength: "1/8",  Interval: "1/8"  },
      { Id: "3",  NoteName: "A3", Type: playbackType, NoteLength: "1/8",  Interval: "1/8"  },
      { Id: "4",  NoteName: "G3", Type: playbackType, NoteLength: "1/4",  Interval: "1/4"  },
      { Id: "5",  NoteName: "C4", Type: playbackType, NoteLength: "1/4",  Interval: "1/4"  },
      { Id: "6",  NoteName: "B3", Type: playbackType, NoteLength: "1/4",  Interval: "1/4"  },
      { Id: "7",  NoteName: "G3", Type: playbackType, NoteLength: "1/16", Interval: "1/2"  },
      { Id: "8",  NoteName: "G3", Type: playbackType, NoteLength: "1/8",  Interval: "1/8"  },
      { Id: "9",  NoteName: "A3", Type: playbackType, NoteLength: "1/8",  Interval: "1/8"  },
      { Id: "10", NoteName: "G3", Type: playbackType, NoteLength: "1/4",  Interval: "1/4"  },
      { Id: "11", NoteName: "D4", Type: playbackType, NoteLength: "1/4",  Interval: "1/4"  },
      { Id: "12", NoteName: "C4", Type: playbackType, NoteLength: "1/4",  Interval: "1/4"  },
      { Id: "13", NoteName: "G3", Type: playbackType, NoteLength: "1/16", Interval: "1/2"  },
      { Id: "14", NoteName: "G3", Type: playbackType, NoteLength: "1/8",  Interval: "1/8"  },
      { Id: "15", NoteName: "G4", Type: playbackType, NoteLength: "1/8",  Interval: "1/8"  },
      { Id: "16", NoteName: "E4", Type: playbackType, NoteLength: "1/4",  Interval: "1/4"  },
      { Id: "17", NoteName: "C4", Type: playbackType, NoteLength: "1/4",  Interval: "1/4"  },
      { Id: "18", NoteName: "B3", Type: playbackType, NoteLength: "1/4",  Interval: "1/4"  },
      { Id: "19", NoteName: "A3", Type: playbackType, NoteLength: "1/4",  Interval: "1/4"  },
      { Id: "20", NoteName: "F4", Type: playbackType, NoteLength: "1/16", Interval: "1/2"  },
      { Id: "21", NoteName: "F4", Type: playbackType, NoteLength: "1/8",  Interval: "1/8"  },
      { Id: "22", NoteName: "E4", Type: playbackType, NoteLength: "1/8",  Interval: "1/8"  },
      { Id: "23", NoteName: "C4", Type: playbackType, NoteLength: "1/4",  Interval: "1/4"  },
      { Id: "24", NoteName: "D4", Type: playbackType, NoteLength: "1/4",  Interval: "1/4"  },
      { Id: "25", NoteName: "C4", Type: playbackType, NoteLength: "1/4",  Interval: "1/4"  }
    ]
  };
}

function getRhythmMusicScore() {
  return {
    Title: "Rhythm",
    Bpm: 136,
    Repeats: 4,
    Notes: [
      { Id: "1",  NoteName: "A4",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "2",  NoteName: "F4",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "3",  NoteName: "G4",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "4",  NoteName: "F4",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "5",  NoteName: "A#3", Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "6",  NoteName: "A#3", Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "7",  NoteName: "D4",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "8",  NoteName: "A#3", Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "9",  NoteName: "C4",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "10", NoteName: "C4",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "11", NoteName: "E4",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "12", NoteName: "C4",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "13", NoteName: "D4",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "14", NoteName: "D4",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "15", NoteName: "F4",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "16", NoteName: "D4",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" }
    ]
  };
}

function getBluesBrotherMusicScore() {
  return {
    Title: "BB",
    Bpm: 150,
    Repeats: 16,
    Notes: [
      { Id: "1", NoteName: "F3",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "2", NoteName: "F3",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "3", NoteName: "G3",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "4", NoteName: "F3",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "5", NoteName: "G#3", Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "6", NoteName: "F3",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "7", NoteName: "A#3", Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "8", NoteName: "G#3", Type: playbackType, NoteLength: "1/16", Interval: "1/8" }
    ]
  };
}

function getXFilesMusicScore() {
  return {
    Title: "XFiles",
    Bpm: 60,
    Repeats: 4,
    Notes: [
      { Id: "1",  NoteName: "F4",  Type: playbackType, NoteLength: "1/2",  Interval: "1/2." },
      { Id: "2",  NoteName: "C5",  Type: playbackType, NoteLength: "1/2",  Interval: "1/2"  },
      { Id: "3",  NoteName: "A#4", Type: playbackType, NoteLength: "1/2",  Interval: "1/2"  },
      { Id: "4",  NoteName: "C5",  Type: playbackType, NoteLength: "1/2",  Interval: "1/2"  },
      { Id: "5",  NoteName: "D#5", Type: playbackType, NoteLength: "1/2",  Interval: "1/2"  },
      { Id: "6",  NoteName: "C5",  Type: playbackType, NoteLength: "1/4.", Interval: "1/2"  },
      { Id: "7",  NoteName: "C5",  Type: playbackType, NoteLength: "1/1",  Interval: "1/2"  },

      { Id: "8",  NoteName: "F4",  Type: playbackType, NoteLength: "1/2",  Interval: "1/2." },
      { Id: "9",  NoteName: "C5",  Type: playbackType, NoteLength: "1/2",  Interval: "1/2"  },
      { Id: "10", NoteName: "A#4", Type: playbackType, NoteLength: "1/2",  Interval: "1/2"  },
      { Id: "11", NoteName: "C5",  Type: playbackType, NoteLength: "1/2",  Interval: "1/2"  },
      { Id: "12", NoteName: "F5",  Type: playbackType, NoteLength: "1/2",  Interval: "1/2"  },
      { Id: "13", NoteName: "C5",  Type: playbackType, NoteLength: "1/4.", Interval: "1/2"  },
      { Id: "14", NoteName: "C5",  Type: playbackType, NoteLength: "1/1",  Interval: "1/2"  },

      { Id: "15", NoteName: "G#5", Type: playbackType, NoteLength: "1/2",  Interval: "1/2." },
      { Id: "16", NoteName: "G5",  Type: playbackType, NoteLength: "1/2",  Interval: "1/2"  },
      { Id: "17", NoteName: "F5",  Type: playbackType, NoteLength: "1/2",  Interval: "1/2"  },
      { Id: "18", NoteName: "D#5", Type: playbackType, NoteLength: "1/2",  Interval: "1/2"  },
      { Id: "19", NoteName: "F5",  Type: playbackType, NoteLength: "1/2",  Interval: "1/2"  },
      { Id: "20", NoteName: "C5",  Type: playbackType, NoteLength: "1/4.", Interval: "1/2"  },
      { Id: "21", NoteName: "C5",  Type: playbackType, NoteLength: "1/1",  Interval: "1/2"  }
    ]
  };
}

function getRickMusicScore() {
  return {
    Title: "Rick",
    Bpm: 100,
    Repeats: 2,
    Notes: [
      { Id: "1",  NoteName: "G3", Type: playbackType, NoteLength: "1/8",  Interval: "1/4."  },
      { Id: "2",  NoteName: "A3", Type: playbackType, NoteLength: "1/8",  Interval: "1/8"   },
      { Id: "3",  NoteName: "C4", Type: playbackType, NoteLength: "1/8",  Interval: "1/8"   },
      { Id: "4",  NoteName: "A3", Type: playbackType, NoteLength: "1/8",  Interval: "1/8"   },
      { Id: "5",  NoteName: "E4", Type: playbackType, NoteLength: "1/4",  Interval: "1/8"   },
      { Id: "6",  NoteName: "E4", Type: playbackType, NoteLength: "1/8",  Interval: "1/4"   },
      { Id: "7",  NoteName: "D4", Type: playbackType, NoteLength: "1/4.", Interval: "1/4"   },

      { Id: "8",  NoteName: "G3", Type: playbackType, NoteLength: "1/8",  Interval: "1/4."  },
      { Id: "9",  NoteName: "A3", Type: playbackType, NoteLength: "1/8",  Interval: "1/8"   },
      { Id: "10", NoteName: "C4", Type: playbackType, NoteLength: "1/8",  Interval: "1/8"   },
      { Id: "11", NoteName: "A3", Type: playbackType, NoteLength: "1/8",  Interval: "1/8"   },
      { Id: "12", NoteName: "D4", Type: playbackType, NoteLength: "1/4",  Interval: "1/8"   },
      { Id: "13", NoteName: "D4", Type: playbackType, NoteLength: "1/8",  Interval: "1/4"   },
      { Id: "14", NoteName: "C4", Type: playbackType, NoteLength: "1/8",  Interval: "1/4"   },
      { Id: "15", NoteName: "B3", Type: playbackType, NoteLength: "1/8",  Interval: "1/4"   },
      { Id: "16", NoteName: "A3", Type: playbackType, NoteLength: "1/4",  Interval: "1/8"   },

      { Id: "17", NoteName: "G3", Type: playbackType, NoteLength: "1/8",  Interval: "1/4"   },
      { Id: "18", NoteName: "A3", Type: playbackType, NoteLength: "1/8",  Interval: "1/8"   },
      { Id: "19", NoteName: "C4", Type: playbackType, NoteLength: "1/8",  Interval: "1/8"   },
      { Id: "20", NoteName: "A3", Type: playbackType, NoteLength: "1/8",  Interval: "1/8"   },
      { Id: "21", NoteName: "C4", Type: playbackType, NoteLength: "1/4",  Interval: "1/8"   },
      { Id: "22", NoteName: "D4", Type: playbackType, NoteLength: "1/8",  Interval: "1/4"   },
      { Id: "23", NoteName: "B3", Type: playbackType, NoteLength: "1/8",  Interval: "1/4"   },
      { Id: "24", NoteName: "A3", Type: playbackType, NoteLength: "1/8",  Interval: "1/4"   },
      { Id: "25", NoteName: "G3", Type: playbackType, NoteLength: "1/4",  Interval: "1/8"   },
      { Id: "26", NoteName: "G3", Type: playbackType, NoteLength: "1/8",  Interval: "1/4"   },
      { Id: "27", NoteName: "D4", Type: playbackType, NoteLength: "1/4",  Interval: "1/4"   },
      { Id: "28", NoteName: "C4", Type: playbackType, NoteLength: "1/4",  Interval: "1/4"   },

      { Id: "29", NoteName: "G3", Type: playbackType, NoteLength: "1/8",  Interval: "1/4."  },
      { Id: "30", NoteName: "A3", Type: playbackType, NoteLength: "1/8",  Interval: "1/8"   },
      { Id: "31", NoteName: "C4", Type: playbackType, NoteLength: "1/8",  Interval: "1/8"   },
      { Id: "32", NoteName: "A3", Type: playbackType, NoteLength: "1/8",  Interval: "1/8"   },
      { Id: "33", NoteName: "E4", Type: playbackType, NoteLength: "1/4",  Interval: "1/8"   },
      { Id: "34", NoteName: "E4", Type: playbackType, NoteLength: "1/8",  Interval: "1/4"   },
      { Id: "35", NoteName: "D4", Type: playbackType, NoteLength: "1/4.", Interval: "1/4"   },

      { Id: "36", NoteName: "G3", Type: playbackType, NoteLength: "1/8",  Interval: "1/4."  },
      { Id: "37", NoteName: "A3", Type: playbackType, NoteLength: "1/8",  Interval: "1/8"   },
      { Id: "38", NoteName: "C4", Type: playbackType, NoteLength: "1/8",  Interval: "1/8"   },
      { Id: "39", NoteName: "A3", Type: playbackType, NoteLength: "1/8",  Interval: "1/8"   },
      { Id: "40", NoteName: "G4", Type: playbackType, NoteLength: "1/4",  Interval: "1/8"   },
      { Id: "41", NoteName: "B3", Type: playbackType, NoteLength: "1/8",  Interval: "1/4"   },
      { Id: "42", NoteName: "C4", Type: playbackType, NoteLength: "1/8",  Interval: "1/4"   },
      { Id: "43", NoteName: "B3", Type: playbackType, NoteLength: "1/8",  Interval: "1/4"   },
      { Id: "44", NoteName: "A3", Type: playbackType, NoteLength: "1/4",  Interval: "1/8"   },

      { Id: "45", NoteName: "G3", Type: playbackType, NoteLength: "1/8",  Interval: "1/4"   },
      { Id: "46", NoteName: "A3", Type: playbackType, NoteLength: "1/8",  Interval: "1/8"   },
      { Id: "47", NoteName: "C4", Type: playbackType, NoteLength: "1/8",  Interval: "1/8"   },
      { Id: "48", NoteName: "A3", Type: playbackType, NoteLength: "1/8",  Interval: "1/8"   },
      { Id: "49", NoteName: "C4", Type: playbackType, NoteLength: "1/4",  Interval: "1/8"   },
      { Id: "50", NoteName: "D4", Type: playbackType, NoteLength: "1/8",  Interval: "1/4"   },
      { Id: "51", NoteName: "B3", Type: playbackType, NoteLength: "1/8",  Interval: "1/4"   },
      { Id: "52", NoteName: "A3", Type: playbackType, NoteLength: "1/8",  Interval: "1/4"   },
      { Id: "53", NoteName: "G3", Type: playbackType, NoteLength: "1/4",  Interval: "1/8"   },
      { Id: "54", NoteName: "G3", Type: playbackType, NoteLength: "1/8",  Interval: "1/4"   },
      { Id: "55", NoteName: "D4", Type: playbackType, NoteLength: "1/4",  Interval: "1/4"   },
      { Id: "56", NoteName: "C4", Type: playbackType, NoteLength: "1/4",  Interval: "1/4"   }
    ]
  };
}

function getFinalScore() {
  return {
    Title: "Final",
    Bpm: 75,
    Repeats: 4,
    Notes: [
      { Id: "1",  NoteName: "C#5", Type: playbackType, NoteLength: "1/16", Interval: "1/1"  },
      { Id: "2",  NoteName: "B4",  Type: playbackType, NoteLength: "1/16", Interval: "1/16" },
      { Id: "3",  NoteName: "C#5", Type: playbackType, NoteLength: "1/4",  Interval: "1/16" },
      { Id: "4",  NoteName: "F#4", Type: playbackType, NoteLength: "1/1",  Interval: "1/2"  },

      { Id: "5",  NoteName: "D5",  Type: playbackType, NoteLength: "1/16", Interval: "1/1." },
      { Id: "6",  NoteName: "C#5", Type: playbackType, NoteLength: "1/16", Interval: "1/16" },
      { Id: "7",  NoteName: "D5",  Type: playbackType, NoteLength: "1/16", Interval: "1/16" },
      { Id: "8",  NoteName: "C#5", Type: playbackType, NoteLength: "1/16", Interval: "1/8"  },
      { Id: "9",  NoteName: "B4",  Type: playbackType, NoteLength: "1/1",  Interval: "1/4"  },

      { Id: "10", NoteName: "D5",  Type: playbackType, NoteLength: "1/16", Interval: "1/1." },
      { Id: "11", NoteName: "C#5", Type: playbackType, NoteLength: "1/16", Interval: "1/16" },
      { Id: "12", NoteName: "D5",  Type: playbackType, NoteLength: "1/4",  Interval: "1/16" },
      { Id: "13", NoteName: "F#4", Type: playbackType, NoteLength: "1/2",  Interval: "1/2"  },
      { Id: "14", NoteName: "G#4", Type: playbackType, NoteLength: "1/1",  Interval: "1/2." },

      { Id: "15", NoteName: "B4",  Type: playbackType, NoteLength: "1/16", Interval: "1/1"  },
      { Id: "16", NoteName: "A4",  Type: playbackType, NoteLength: "1/16", Interval: "1/16" },
      { Id: "17", NoteName: "B4",  Type: playbackType, NoteLength: "1/16", Interval: "1/16" },
      { Id: "18", NoteName: "A4",  Type: playbackType, NoteLength: "1/16", Interval: "1/8"  },
      { Id: "19", NoteName: "G#4", Type: playbackType, NoteLength: "1/16", Interval: "1/8"  },
      { Id: "20", NoteName: "B4",  Type: playbackType, NoteLength: "1/16", Interval: "1/8"  },
      { Id: "21", NoteName: "A4",  Type: playbackType, NoteLength: "1/1",  Interval: "1/8"  }
    ]
  };
}

function getStrangerMusicScore() {
  return {
    Title: "Stranger",
    Bpm: 150,
    Repeats: 16,
    Notes: [
      { Id: "1", NoteName: "C3", Type: playbackType, NoteLength: "1/8", Interval: "1/8" },
      { Id: "2", NoteName: "E3", Type: playbackType, NoteLength: "1/8", Interval: "1/8" },
      { Id: "3", NoteName: "G3", Type: playbackType, NoteLength: "1/8", Interval: "1/8" },
      { Id: "4", NoteName: "B3", Type: playbackType, NoteLength: "1/8", Interval: "1/8" },
      { Id: "5", NoteName: "C4", Type: playbackType, NoteLength: "1/8", Interval: "1/8" },
      { Id: "6", NoteName: "B3", Type: playbackType, NoteLength: "1/8", Interval: "1/8" },
      { Id: "7", NoteName: "G3", Type: playbackType, NoteLength: "1/8", Interval: "1/8" },
      { Id: "8", NoteName: "E3", Type: playbackType, NoteLength: "1/8", Interval: "1/8" }
    ]
  };
}

const MUSIC_SCORES = {
  "Intro":  getIntroMusicScore,
  "Happy":  getHappyMusicScore,
  "Rhythm": getRhythmMusicScore,
  "Strange": getStrangerMusicScore,
  "X":      getXFilesMusicScore,
  "BB":     getBluesBrotherMusicScore,
  "Never":  getRickMusicScore,
  "Final":  getFinalScore
};

function getMusicScoreByTitle(title) {
  return MUSIC_SCORES[title]();
}
```

- [ ] **Step 2: Sanity check the file in a browser**

Open `http://localhost:5051` after the next build. The score-selector dropdown should still list all 8 titles (Intro, Happy, Rhythm, Strange, X, BB, Never, Final). No console errors. (Audible verification happens in Task 9.)

---

## Task 7: Update local.http sample requests

**Files:**
- Modify: `local.http`

The two `/startmusic` sample bodies (Happy at line ~13 and Rick at line ~50) and the Stranger one (line ~108) currently use `DurationMs` / `WaitMs`. Replace each with the BPM + fraction equivalent.

- [ ] **Step 1: Replace the `Happy` body**

Find the request labeled `### POST /startmusic - HBD` and replace its JSON body (between the `{` after the `Content-Type` header and the closing `}` at line ~43) with:

```json
{
  "Title": "Happy",
  "Bpm": 120,
  "Repeats": 1,
  "Notes": [
    { "Id": "1",  "NoteName": "G3", "Type": "{{type}}", "NoteLength": "1/16", "Interval": "0"   },
    { "Id": "2",  "NoteName": "G3", "Type": "{{type}}", "NoteLength": "1/8",  "Interval": "1/8" },
    { "Id": "3",  "NoteName": "A3", "Type": "{{type}}", "NoteLength": "1/8",  "Interval": "1/8" },
    { "Id": "4",  "NoteName": "G3", "Type": "{{type}}", "NoteLength": "1/4",  "Interval": "1/4" },
    { "Id": "5",  "NoteName": "C4", "Type": "{{type}}", "NoteLength": "1/4",  "Interval": "1/4" },
    { "Id": "6",  "NoteName": "B3", "Type": "{{type}}", "NoteLength": "1/4",  "Interval": "1/4" },
    { "Id": "7",  "NoteName": "G3", "Type": "{{type}}", "NoteLength": "1/16", "Interval": "1/2" },
    { "Id": "8",  "NoteName": "G3", "Type": "{{type}}", "NoteLength": "1/8",  "Interval": "1/8" },
    { "Id": "9",  "NoteName": "A3", "Type": "{{type}}", "NoteLength": "1/8",  "Interval": "1/8" },
    { "Id": "10", "NoteName": "G3", "Type": "{{type}}", "NoteLength": "1/4",  "Interval": "1/4" },
    { "Id": "11", "NoteName": "D4", "Type": "{{type}}", "NoteLength": "1/4",  "Interval": "1/4" },
    { "Id": "12", "NoteName": "C4", "Type": "{{type}}", "NoteLength": "1/4",  "Interval": "1/4" }
  ]
}
```

(The full 25-note `Happy` is in `musicscores.js`; for `local.http` a 12-note slice is sufficient as a smoke test.)

- [ ] **Step 2: Replace the `Rick` body**

Find the request labeled `### POST /startmusic -Rick` and replace its JSON body with:

```json
{
  "Title": "Rick",
  "Bpm": 100,
  "Repeats": 1,
  "Notes": [
    { "Id": "1", "NoteName": "G3", "Type": "{{type}}", "NoteLength": "1/8", "Interval": "1/4." },
    { "Id": "2", "NoteName": "A3", "Type": "{{type}}", "NoteLength": "1/8", "Interval": "1/8"  },
    { "Id": "3", "NoteName": "C4", "Type": "{{type}}", "NoteLength": "1/8", "Interval": "1/8"  },
    { "Id": "4", "NoteName": "A3", "Type": "{{type}}", "NoteLength": "1/8", "Interval": "1/8"  },
    { "Id": "5", "NoteName": "E4", "Type": "{{type}}", "NoteLength": "1/4", "Interval": "1/8"  },
    { "Id": "6", "NoteName": "E4", "Type": "{{type}}", "NoteLength": "1/8", "Interval": "1/4"  },
    { "Id": "7", "NoteName": "D4", "Type": "{{type}}", "NoteLength": "1/4.","Interval": "1/4"  }
  ]
}
```

- [ ] **Step 3: Replace the `Stranger` body**

Find the request labeled `### POST /startmusic - ST` and replace its JSON body with:

```json
{
  "Title": "Stranger",
  "Bpm": 150,
  "Repeats": 3,
  "Notes": [
    { "Id": "1", "NoteName": "C3", "Type": "{{type}}", "NoteLength": "1/8", "Interval": "1/8" },
    { "Id": "2", "NoteName": "E3", "Type": "{{type}}", "NoteLength": "1/8", "Interval": "1/8" },
    { "Id": "3", "NoteName": "G3", "Type": "{{type}}", "NoteLength": "1/8", "Interval": "1/8" },
    { "Id": "4", "NoteName": "B3", "Type": "{{type}}", "NoteLength": "1/8", "Interval": "1/8" },
    { "Id": "5", "NoteName": "C4", "Type": "{{type}}", "NoteLength": "1/8", "Interval": "1/8" },
    { "Id": "6", "NoteName": "B3", "Type": "{{type}}", "NoteLength": "1/8", "Interval": "1/8" },
    { "Id": "7", "NoteName": "G3", "Type": "{{type}}", "NoteLength": "1/8", "Interval": "1/8" },
    { "Id": "8", "NoteName": "E3", "Type": "{{type}}", "NoteLength": "1/8", "Interval": "1/8" }
  ]
}
```

- [ ] **Step 4: Leave the rest of the file alone**

The GET / PAUSE / APPROVE / TERMINATE / `sendnote` requests at the bottom are not affected and stay as-is.

---

## Task 8: Full-project build

**Files:**
- Build: both csproj files

- [ ] **Step 1: Build both apps**

Run from repo root:
```
dotnet build ConcertoWorkflow/ConcertoWorkflow.csproj
dotnet build NoteStreamApp/NoteStreamApp.csproj
```

Expected: both succeed with 0 errors and 0 warnings. If warnings appear about source generators (LoggerMessage), that's normal — only fail on errors.

---

## Task 9: End-to-end manual verification

**Prerequisites:** Dapr CLI installed, Docker running, .NET 10 SDK installed.

- [ ] **Step 1: Start the system**

Run from repo root:
```
dapr run -f dapr.yaml
```

Expected: both `music-app` and `note-stream-app` start. No exceptions in either app's logs.

- [ ] **Step 2: Open the front-end**

In a browser, open `http://localhost:5051`. The score selector should list all 8 scores.

- [ ] **Step 3: Play each score and listen**

For each score (Intro, Happy, Rhythm, Strange, X, BB, Never, Final):
1. Select it in the dropdown.
2. Click Start.
3. Listen for ~5 seconds (or to completion for short scores).
4. Confirm: notes play in the correct rhythm; no obvious drag, rush, or skipped notes.

In the `music-app` log you should see, once per workflow:
```
Starting music workflow: <Title> @ <Bpm> bpm
Measured per-activity overhead: <N> ms
```
where `N` is a small positive integer (typically 5-50 on a local dev machine).

- [ ] **Step 4: Verify a `local.http` request**

In VS Code, open `local.http`, run the `### POST /startmusic - HBD` request via REST Client. Expected: 200 with `{ "instanceId": "..." }`, and the music plays in the browser.

- [ ] **Step 5: Verify error path on bad fraction**

Edit one note in `local.http`'s Happy body to use `"NoteLength": "bogus"`, run the request again. Expected: workflow fails (visible via `GET /musicstatus/{instanceId}` showing a `Failed` runtime status; logs show `FormatException: Invalid fraction: 'bogus'`). Revert the edit afterward.

---

## Self-review (already performed)

- **Spec coverage:** every section of the design doc has at least one task. Data model → Tasks 3, 6. Workflow flow → Task 4. Timing math → Task 5. New files → Tasks 1, 2. Score migration → Task 6. Error handling → Task 5 (clamp + ArgumentOutOfRangeException) and Task 1 (FormatException). Testing approach → Task 9.
- **Type consistency:** `MusicScore`, `ScoreNote`, `PlaybackNote`, `SendNoteInput`, `MeasureLatencyActivity`, `FractionParser.ParseToValue` — all spelled identically in every task that references them. `Bpm` (not `BPM`), `NoteLength`, `Interval`, `OverheadMs` consistent across C# and JS.
- **Placeholder scan:** no TBDs. Every code step shows the actual code. The Intro score uses a small `buildAlternatingPattern` helper to keep the file readable; the helper is defined in the same task that uses it.
- **No git operations:** per user instruction, no `git add` / `git commit` steps anywhere in this plan.
