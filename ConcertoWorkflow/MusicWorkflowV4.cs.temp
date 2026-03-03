using System;
using System.Security.Cryptography.X509Certificates;
using Dapr.Workflow;

public class MusicWorkflowV4 : Workflow<MusicScore, object>
{
    public override async Task<object> RunAsync(WorkflowContext context, MusicScore musicScore)
    {
        Console.WriteLine($"Starting music workflow for score: {musicScore.Title}, note count: {musicScore.Notes.Length}");

        await context.CallActivityAsync<bool>(nameof(SendInstanceIdActivity), context.InstanceId);

        if (musicScore.Notes.Length == 0)
        {
            return $"{musicScore.Title} Completed!";
        }

        var isApproved = await context.WaitForExternalEventAsync<bool>("approve");
        if (isApproved)
        {
            await context.CallActivityAsync<bool>(nameof(SendNoteActivity), musicScore.Notes[0]);
        }

        var updatedMusicScore = musicScore with { Notes = musicScore.Notes[1..] };
        context.ContinueAsNew(updatedMusicScore);

        return $"{musicScore.Title} In progress...";
    }
}