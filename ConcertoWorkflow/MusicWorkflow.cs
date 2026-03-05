using System;
using Dapr.Workflow;

public class MusicWorkflow : Workflow<MusicScore, object>
{
    public override async Task<object> RunAsync(WorkflowContext context, MusicScore musicScore)
    {
        Console.WriteLine($"Starting music workflow for score: {musicScore.Title}, note count: {musicScore.Notes.Length}");

        foreach (var note in musicScore.Notes)
        {
            await context.CallActivityAsync<bool>(nameof(SendNoteActivity), note);
        }

        return $"{musicScore.Title} Completed!";
    }
}