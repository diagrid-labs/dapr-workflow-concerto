using System;
using Dapr.Workflow;

namespace ConcertoWorkflow;

public class MusicWorkflow : Workflow<MusicScore, string>
{
    public override async Task<string> RunAsync(WorkflowContext context, MusicScore input)
    {
        Console.WriteLine($"Starting music workflow for score: {input.Title}");

        foreach (var note in input.Notes)
        {
            await context.CreateTimer(TimeSpan.FromMilliseconds(note.WaitMs));
            await context.CallActivityAsync("PlayNoteActivity", note);
        }

        var completionText = $"Completed playing score: {input.Title}";
        Console.WriteLine(completionText);
        return completionText;
    }
}