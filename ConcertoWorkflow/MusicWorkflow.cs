using System;
using Dapr.Workflow;

public class MusicWorkflow : Workflow<MusicScore, object>
{
    public override async Task<object> RunAsync(WorkflowContext context, MusicScore musicScore)
    {
        Console.WriteLine($"Starting music workflow for score: {musicScore.Title}");
        Console.WriteLine($"Note count: {musicScore.Notes.Length}");

        await context.CallActivityAsync<bool>(nameof(SendInstanceIdActivity), context.InstanceId);

        bool start = false;
        try
        {
            start = await context.WaitForExternalEventAsync<bool>(
                eventName: "play",
                timeout: TimeSpan.FromSeconds(30));
        }
        catch (TaskCanceledException)
        {
            Console.WriteLine("Timeout");
            start = true;
        }

        if (start)
        {
            foreach (var note in musicScore.Notes)
            {
                await context.CallActivityAsync<bool>(nameof(SendNoteActivity), note);
            }

            if (musicScore.Looping)
            {
                context.ContinueAsNew(musicScore);
            }
        }

        return $"{musicScore.Title} Completed!";
    }
}