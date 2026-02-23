using System;
using Dapr.Workflow;

public class MusicWorkflow : Workflow<MusicScore, object>
{
    public override async Task<object> RunAsync(WorkflowContext context, MusicScore musicScore)
    {
        Console.WriteLine($"Starting music workflow for score: {musicScore.Title}");
        Console.WriteLine($"Note count: {musicScore.Notes.Length}");

        try
        {
            foreach (var note in musicScore.Notes)
            {
                await context.CallActivityAsync<bool>(nameof(SendNoteActivity), note);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in MusicWorkflow: {ex.Message}");
            throw;
        }

        //context.ContinueAsNew(musicScore);
        
        return $"{musicScore.Title} Completed!";
    }
}