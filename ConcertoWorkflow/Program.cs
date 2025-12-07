using Dapr.Workflow;
using Dapr.Client;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<HttpClient>(DaprClient.CreateInvokeHttpClient(appId: "note-send-app"));
builder.Services.AddDaprWorkflow(options =>
{
    options.RegisterWorkflow<MusicWorkflow>();
    options.RegisterActivity<SendNoteActivity>();
});

var app = builder.Build();

app.MapPost("startmusic", async (
    MusicScore musicScore,
    DaprWorkflowClient workflowClient) =>
{
    var instanceId = await workflowClient.ScheduleNewWorkflowAsync(
        name: nameof(MusicWorkflow),
        input: musicScore
    );

    return Results.Ok(new { instanceId });
});

app.MapGet("musicstatus/{instanceId}", async (
    string instanceId,
    DaprWorkflowClient workflowClient) =>
{
    var status = await workflowClient.GetWorkflowStateAsync(instanceId);
    Console.WriteLine($"Workflow status for {instanceId}: {status?.RuntimeStatus}");
    if (status == null)
    {
        return Results.NotFound();
    }
    return Results.Ok(status);
});

app.Run();

public record MusicScore(string Title, Note[] Notes);
public record Note(string Id, string NoteName, string Type, int DurationMs, int WaitMs);