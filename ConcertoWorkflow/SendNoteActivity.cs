using System;
using System.Diagnostics;
using Microsoft.Extensions.Logging;
using Dapr.Workflow;

public sealed partial class SendNoteActivity(ILogger<SendNoteActivity> logger, HttpClient httpClient) : WorkflowActivity<Note, bool>
{
    public override async Task<bool> RunAsync(WorkflowActivityContext context, Note note)
    {
        LogNoteSend(logger, note.NoteName);
        await Task.Delay(note.WaitMs);
        var response = await httpClient.PostAsJsonAsync("/sendnote", note);
        var result = response.IsSuccessStatusCode;

        return result;
    }

    [LoggerMessage(LogLevel.Information, "SendNoteActivity: {NoteName}")]
    partial void LogNoteSend(ILogger logger, string NoteName);
}
