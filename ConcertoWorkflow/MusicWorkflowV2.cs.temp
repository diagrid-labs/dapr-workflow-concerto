using System;
using Microsoft.Extensions.Logging;
using Dapr.Workflow;

/// <summary>
/// Repeat the notes! 🎶
/// </summary>
public sealed partial class MusicWorkflowV2 : Workflow<MusicScore, object>
{
    public override async Task<object> RunAsync(WorkflowContext context, MusicScore musicScore)
    {
        var logger = context.CreateReplaySafeLogger<MusicWorkflowV2>();
        LogStart(logger, musicScore.Title);

        foreach (var note in musicScore.Notes)
        {
            await context.CallActivityAsync<bool>(nameof(SendNoteActivity), note);
        }

        if (musicScore.Repeats > 1)
        {
            var remaining = musicScore with { Repeats = musicScore.Repeats - 1 };
            context.ContinueAsNew(remaining);
        }

        return $"{musicScore.Title} Completed!";
    }

    [LoggerMessage(LogLevel.Information, "Starting music workflow for score: {Title}")]
    partial void LogStart(ILogger logger, string Title);
}