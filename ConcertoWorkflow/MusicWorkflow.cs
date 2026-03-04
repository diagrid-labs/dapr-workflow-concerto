using System;
using Dapr.Workflow;

public class MusicWorkflow : Workflow<MusicScore, object>
{
    public override async Task<object> RunAsync(WorkflowContext context, MusicScore musicScore)
    {
        Console.WriteLine($"Starting music workflow for score: {musicScore.Title}, note count: {musicScore.Notes.Length}");

        await context.CallActivityAsync<bool>(nameof(SendInstanceIdActivity), context.InstanceId);

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