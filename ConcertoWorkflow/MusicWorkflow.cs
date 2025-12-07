using System;
using Dapr.Workflow;

public class MusicWorkflow : Workflow<MusicScore, string>
{
    public override async Task<string> RunAsync(WorkflowContext context, MusicScore musicScore)
    {
        Console.WriteLine($"Starting music workflow for score: {musicScore.Title}");

        try
        {
            foreach (var note in musicScore.Notes)
            {
                await context.CreateTimer(TimeSpan.FromMilliseconds(note.WaitMs));
                await context.CallActivityAsync<SendNoteResult>(nameof(SendNoteActivity), note);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in MusicWorkflow: {ex.Message}");
            throw;
        }

        var completionText = $"Completed playing score: {musicScore.Title}";
        Console.WriteLine(completionText);
        return completionText;
    }
}