using System.Text.Json;
using System.Threading.Channels;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<NoteQueueService>();
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
app.UseDefaultFiles();
app.UseStaticFiles();

// POST endpoint to enqueue notes
app.MapPost("/sendnote", async (
    [FromBody] Note note,
    [FromServices] NoteQueueService queue) =>
{
    Console.WriteLine(note);
    await queue.EnqueueAsync(new SseEvent("note", note));
    return Results.Accepted();
});

// POST endpoint to enqueue instanceId
app.MapPost("/sendinstanceid", async (
    [FromBody] string instanceId,
    [FromServices] NoteQueueService queue) =>
{
    Console.WriteLine($"Received instanceId: {instanceId}");
    await queue.EnqueueAsync(new SseEvent("instanceId", instanceId));
    return Results.Accepted();
});

// GET endpoint for SSE stream
app.MapGet("/sse", async (
    HttpContext context, 
    [FromServices] NoteQueueService queue) =>
{
    context.Response.Headers.Append("Content-Type", "text/event-stream");
    context.Response.Headers.Append("Cache-Control", "no-cache");
    context.Response.Headers.Append("Connection", "keep-alive");
    await context.Response.Body.FlushAsync(context.RequestAborted);

    await foreach (var sseEvent in queue.DequeueAllAsync(context.RequestAborted))
    {
        var json = JsonSerializer.Serialize(sseEvent.Data);
        await context.Response.WriteAsync($"event: {sseEvent.EventType}\ndata: {json}\n\n");
        await context.Response.Body.FlushAsync(context.RequestAborted);
    }
});

app.Run();

// Data model
public record Note(string Id, string NoteName, string Type, int DurationMs, int WaitMs);
public record SseEvent(string EventType, object Data);

// Queue service
public class NoteQueueService
{
    private readonly Channel<SseEvent> _channel;

    public NoteQueueService()
    {
        _channel = Channel.CreateUnbounded<SseEvent>();
    }

    public async Task EnqueueAsync(SseEvent sseEvent)
    {
        await _channel.Writer.WriteAsync(sseEvent);
    }

    public IAsyncEnumerable<SseEvent> DequeueAllAsync(CancellationToken cancellationToken)
    {
        return _channel.Reader.ReadAllAsync(cancellationToken);
    }
}
