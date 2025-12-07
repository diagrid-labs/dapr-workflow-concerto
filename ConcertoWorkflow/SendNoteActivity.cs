using System;
using System.Diagnostics;
using Dapr.Workflow;

public class SendNoteActivity : WorkflowActivity<Note, SendNoteResult>
{
    private readonly HttpClient _httpClient;

    public SendNoteActivity(HttpClient httpClient, ILoggerFactory loggerFactory)
    {
        _httpClient = httpClient;
    }
    public override async Task<SendNoteResult> RunAsync(WorkflowActivityContext context, Note note)
    {
        Console.WriteLine($"SendNoteActivity: {note.NoteName}");
        var response = await _httpClient.PostAsJsonAsync("/sendnote", note);
        var result = await response.Content.ReadFromJsonAsync<SendNoteResult>();

        return result;
    }
}

public record SendNoteResult(string Id, string NoteName, bool IsSuccess);
