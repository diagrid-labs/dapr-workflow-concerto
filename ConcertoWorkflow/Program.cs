using Dapr.Workflow;
using Dapr.Client;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<HttpClient>(DaprClient.CreateInvokeHttpClient(appId: "note-stream-app"));
builder.Services.AddDaprWorkflow(options =>
{
    options.RegisterWorkflow<MusicWorkflow>();
    options.RegisterActivity<SendNoteActivity>();
    options.RegisterActivity<SendInstanceIdActivity>();
});
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();
app.UseCors();

app.MapPost("startmusic", async (
    [FromBody] MusicScore musicScore,
    [FromServices] DaprWorkflowClient workflowClient) =>
{
    var instanceId = await workflowClient.ScheduleNewWorkflowAsync(
        name: nameof(MusicWorkflow),
        input: musicScore
    );

    return Results.Ok(new { instanceId });
});

app.MapPost("play", async (
    [FromQuery] string instanceId,
    [FromServices] DaprWorkflowClient workflowClient) =>
{
    await workflowClient.RaiseEventAsync(
        instanceId: instanceId,
        eventName: "play",
        eventPayload: true 
    );

    return Results.Accepted();
});

app.MapPost("pause/{instanceId}", async (
    [FromRoute] string instanceId,
    [FromServices] DaprWorkflowClient workflowClient) =>
{
    Console.WriteLine($"PAUSE {instanceId}");
    await workflowClient.SuspendWorkflowAsync(instanceId);
    return Results.Accepted();
});

app.MapPost("resume/{instanceId}", async (
    [FromRoute] string instanceId,
    [FromServices] DaprWorkflowClient workflowClient) =>
{
    Console.WriteLine($"RESUME {instanceId}");

    await workflowClient.ResumeWorkflowAsync(instanceId);
    return Results.Accepted();
});

app.MapGet("musicstatus/{instanceId}", async (
    [FromRoute] string instanceId,
    [FromServices] DaprWorkflowClient workflowClient) =>
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

public record MusicScore(string Title, bool Looping, Note[] Notes);
public record Note(string Id, string NoteName, string Type, int DurationMs, int WaitMs);