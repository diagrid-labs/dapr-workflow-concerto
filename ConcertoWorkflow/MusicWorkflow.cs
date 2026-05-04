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
        var t1 = await context.CallActivityAsync<DateTimeOffset>(nameof(MeasureLatencyActivity), "");
        var t2 = await context.CallActivityAsync<DateTimeOffset>(nameof(MeasureLatencyActivity), "");
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
