using System;
using Microsoft.Extensions.Logging;
using Dapr.Workflow;

public sealed partial class MusicWorkflow : Workflow<MusicScore, object>
{
    public override async Task<object> RunAsync(WorkflowContext context, MusicScore musicScore)
    {
        var logger = context.CreateReplaySafeLogger<MusicWorkflow>();
        LogStart(logger, musicScore.Title);

        /// Workflow replays after every activity call.
        /// So for a music score with 3 notes:
        /// (* marks completed activity call)
        /// - SendNoteActivity 1
        /// - replay
        /// - SendNoteActivity 1* 2
        /// - replay
        /// - SendNoteActivity 1* 2* 3
        /// - replay
        /// - SendNoteActivity 1* 2* 3*
        /// => 3 notes result in 9 foreach iterations.
        foreach (var note in musicScore.Notes)
        {
            await context.CallActivityAsync<bool>(nameof(SendNoteActivity), note);
        }

        return $"{musicScore.Title} Completed!";
    }

    [LoggerMessage(LogLevel.Information, "Starting music workflow for score: {Title}")]
    partial void LogStart(ILogger logger, string Title);
}