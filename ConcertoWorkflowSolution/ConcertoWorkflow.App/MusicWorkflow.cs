using System;
using Microsoft.Extensions.Logging;
using Dapr.Workflow;

public sealed partial class MusicWorkflow : Workflow<MusicScore, object>
{
    public override async Task<object> RunAsync(WorkflowContext context, MusicScore musicScore)
    {
        var logger = context.CreateReplaySafeLogger<MusicWorkflow>();
        LogStart(logger, musicScore.Title, musicScore.Bpm);

        int overheadMs = await CalculateOverhead(context);

        // Dapr Workflow replays the workflow code from the start after every activity completion.
        // With 3 notes, there are 9 foreach iteration steps in total:
        // 1: Execute SendNote 1, replay
        // 2: Restart foreach - Get SendNote 1 result
        // 3: Next - Execute SendNote 2, replay
        // 4: Restart foreach - Get SendNote 1 result
        // 5: Next - Get SendNote 2 result
        // 6: Next - Execute SendNote 3, replay
        // 7: Restart foreach - Get SendNote 1
        // 8: Next - Get SendNote 2
        // 9: Next - Get SendNote 3
        foreach (var note in musicScore.Notes)
        {
            await context.CallActivityAsync<bool>(
                nameof(SendNoteActivity),
                new SendNoteInput(note, musicScore.Bpm, overheadMs));
        }

        return $"{musicScore.Title} Completed!";
    }

    private static async Task<int> CalculateOverhead(WorkflowContext context)
    {
        // Calibrate per-activity overhead by running no-op activities back-to-back and
        // averaging the deltas to smooth out transient spikes during calibration.
        const int sampleCount = 5;
        var timestamps = new DateTimeOffset[sampleCount];
        for (var i = 0; i < sampleCount; i++)
        {
            timestamps[i] = await context.CallActivityAsync<DateTimeOffset>(nameof(MeasureLatencyActivity), "");
        }
        var avgDeltaMs = (timestamps[^1] - timestamps[0]).TotalMilliseconds / (sampleCount - 1);
        var overheadMs = Math.Max(0, (int)avgDeltaMs);
        context.SetCustomStatus(new { activityOverhead = overheadMs });
        return overheadMs;
    }

    [LoggerMessage(LogLevel.Information, "Starting music workflow: {Title} @ {Bpm} bpm")]
    static partial void LogStart(ILogger logger, string Title, int Bpm);
}
