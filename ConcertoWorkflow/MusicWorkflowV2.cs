using System;
using Dapr.Workflow;

/// <summary>
/// Repeat the notes! 🎶
/// </summary>
public class MusicWorkflowV2 : Workflow<MusicScore, object>
{
    public override async Task<object> RunAsync(WorkflowContext context, MusicScore musicScore)
    {
        Console.WriteLine($"Starting music workflow for score: {musicScore.Title}, note count: {musicScore.Notes.Length}");

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
}