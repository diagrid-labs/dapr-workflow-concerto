using System.Text.Json;
using System.Threading.Channels;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});
builder.Services.AddDaprClient();
builder.Services.AddSingleton<EventBroadcaster>();
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenLocalhost(5051);
});

var app = builder.Build();
// Configure the HTTP request pipeline
app.UseCors();
app.UseDefaultFiles();
app.UseStaticFiles();

var noteQueue = new Queue<Note>();

app.MapPost("/sendnote", async (
    [FromBody] Note note) =>
{
    Console.WriteLine($"{note.NoteName}: received by NoteSendApp.");

    noteQueue.Enqueue(note);

    return Results.Ok(new SendNoteResult(note.Id, note.NoteName, true));
});

app.MapGet("/sse", async (
    HttpContext context,
    [FromServices] EventBroadcaster broadcaster) =>
{
    //while (true)
    //{
    noteQueue.TryDequeue(out var dequeuedNote);
    
    context.Response.Headers.Append("Content-Type", "text/event-stream");
    context.Response.Headers.Append("Cache-Control", "no-cache");
    context.Response.Headers.Append("Connection", "keep-alive");

    var writer = new StreamWriter(context.Response.Body);
    broadcaster.AddClient(writer);

        try
        {
            if (dequeuedNote != null)
            {
            // Send initial connection message
            var noteJson = JsonSerializer.Serialize(dequeuedNote);
            await writer.WriteAsync(noteJson);
            }

            await writer.FlushAsync();
            // Keep the connection alive
            while (!context.RequestAborted.IsCancellationRequested)
            {
                await Task.Delay(1000);
            }
        }
        catch (Exception)
        {
            // Client disconnected
        }
        finally
        {
            broadcaster.RemoveClient(writer);
            writer.Dispose();
        }

});

app.Run();

public record Note(string Id, string NoteName, string Type, int DurationMs, int WaitMs);
public record SendNoteResult(string Id, string NoteName, bool IsSuccess);