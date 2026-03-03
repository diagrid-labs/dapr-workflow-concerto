using System;
using Dapr.Workflow;

public class MusicWorkflowV3 : Workflow<MusicScore, object>
{
    public override async Task<object> RunAsync(WorkflowContext context, MusicScore musicScore)
    {
        Console.WriteLine($"Starting music workflow for score: {musicScore.Title}, note count: {musicScore.Notes.Length}");

        await context.CallActivityAsync<bool>(nameof(SendInstanceIdActivity), context.InstanceId);

        var tasks = new List<Task<bool>>();
        foreach (var note in musicScore.Notes)
        {
            tasks.Add(context.CallActivityAsync<bool>(nameof(SendNoteActivity), note));
        }

        await Task.WhenAll(tasks);

        return $"{musicScore.Title} Completed!";
    }
}