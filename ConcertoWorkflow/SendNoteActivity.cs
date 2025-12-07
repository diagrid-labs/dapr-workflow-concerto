using System;
using System.Diagnostics;
using Dapr.Workflow;

public class SendNoteActivity : WorkflowActivity<Note, bool>
{
    private readonly HttpClient _httpClient;

    public SendNoteActivity(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }
    public override async Task<bool> RunAsync(WorkflowActivityContext context, Note note)
    {
        Console.WriteLine($"SendNoteActivity: {note.NoteName}");
        Thread.Sleep(note.WaitMs);
        var response = await _httpClient.PostAsJsonAsync("/sendnote", note);
        var result = response.IsSuccessStatusCode;

        return result;
    }
}

public record SendNoteResult(string Id, string NoteName, bool IsSuccess);
