using System.Collections.Concurrent;
using System.Text.Json;
using System.Threading.Channels;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

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
app.MapPost("/sendnote", (
    [FromBody] Note note,
    [FromServices] NoteQueueService queue) =>
{
    Console.WriteLine(note);
    queue.Publish(new SseEvent("note", note));
    return Results.Accepted();
});

// POST endpoint to enqueue instanceId
app.MapPost("/sendinstanceid", (
    [FromBody] string instanceId,
    [FromServices] NoteQueueService queue) =>
{
    Console.WriteLine($"Received instanceId: {instanceId}");
    queue.Publish(new SseEvent("instanceId", instanceId));
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

    var (subscriberId, reader) = queue.Subscribe();
    try
    {
        await foreach (var sseEvent in reader.ReadAllAsync(context.RequestAborted))
        {
            var json = JsonSerializer.Serialize(sseEvent.Data);
            await context.Response.WriteAsync($"event: {sseEvent.EventType}\ndata: {json}\n\n");
            await context.Response.Body.FlushAsync(context.RequestAborted);
        }
    }
    catch (OperationCanceledException)
    {
        // Client disconnected — expected, not an error.
    }
    finally
    {
        queue.Unsubscribe(subscriberId);
    }
});

app.MapDefaultEndpoints();

app.Run();

// Data model
public record Note(string Id, string NoteName, string Type, int DurationMs, int WaitMs);
public record SseEvent(string EventType, object Data);

// Broadcasts each event to every connected SSE client
public class NoteQueueService
{
    private readonly ConcurrentDictionary<Guid, Channel<SseEvent>> _subscribers = new();

    public (Guid Id, ChannelReader<SseEvent> Reader) Subscribe()
    {
        // Bounded + DropOldest: a stalled client can never block a publisher,
        // and notes do not pile up for a client that is not there.
        var channel = Channel.CreateBounded<SseEvent>(new BoundedChannelOptions(256)
        {
            FullMode = BoundedChannelFullMode.DropOldest,
            SingleReader = true,
            SingleWriter = false
        });

        var id = Guid.NewGuid();
        _subscribers[id] = channel;
        return (id, channel.Reader);
    }

    public void Unsubscribe(Guid id)
    {
        if (_subscribers.TryRemove(id, out var channel))
        {
            channel.Writer.TryComplete();
        }
    }

    public void Publish(SseEvent sseEvent)
    {
        foreach (var channel in _subscribers.Values)
        {
            channel.Writer.TryWrite(sseEvent);
        }
    }
}
