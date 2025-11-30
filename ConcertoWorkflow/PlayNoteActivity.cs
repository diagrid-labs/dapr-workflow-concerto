using System;
using System.Diagnostics;
using Dapr.Workflow;

namespace ConcertoWorkflow;

public class PlayNoteActivity : WorkflowActivity<Note, bool>
{
    public override async Task<bool> RunAsync(WorkflowActivityContext context, Note input)
    {
        Console.WriteLine($"Playing note: {input.Name} for {input.DurationMs} ms");
        // Simulate playing the note (in a real scenario, this could interface with audio hardware)
        return true;
    }
}
