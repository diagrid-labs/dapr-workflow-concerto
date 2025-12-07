using System.Threading.Channels;
using System.Text.Json;
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
var noteChannel = Channel.CreateUnbounded<Note>();
builder.Services.AddSingleton<ChannelWriter<Note>>(_ => noteChannel.Writer);
builder.Services.AddSingleton<ChannelReader<Note>>(_ => noteChannel.Reader);
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenLocalhost(5051);
});

var app = builder.Build();
// Configure the HTTP request pipeline
app.UseCors();
app.UseDefaultFiles();
app.UseStaticFiles();


app.MapPost("/sendnote", async (
    [FromServices]ChannelWriter<Note> writer,
    [FromBody]Note note) => {
    Console.WriteLine($"{note.NoteName}: received by NoteSendApp.");

    await writer.WriteAsync(note);
    writer.Complete();

    return Results.Ok(new SendNoteResult(note.Id, note.NoteName, true));
});

app.MapGet("/sse", async (
    HttpContext context,
    [FromServices]ChannelReader<Note> reader,
    [FromServices]EventBroadcaster broadcaster) =>
{
    var note = await reader.ReadAsync();

    context.Response.Headers.Append("Content-Type", "text/event-stream");
    context.Response.Headers.Append("Cache-Control", "no-cache");
    context.Response.Headers.Append("Connection", "keep-alive");

    var writer = new StreamWriter(context.Response.Body);
    broadcaster.AddClient(writer);

    try
    {
        // Send initial connection message
        var noteJson = JsonSerializer.Serialize(note);
        await writer.WriteAsync(noteJson);
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

public record Note(string Id, string NoteName, string Type, int DurationMs);
public record SendNoteResult(string Id, string NoteName, bool IsSuccess);