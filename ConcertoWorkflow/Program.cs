using SseWorkflow.Models;
using SseWorkflow.Services;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// Configure JSON serialization to use camelCase
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
});

// Add services to the container
builder.Services.AddSingleton<EventBroadcaster>();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Configure Kestrel to listen on port 5000 and 5500
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenLocalhost(5000);
    options.ListenLocalhost(5500);
});

var app = builder.Build();

// Configure the HTTP request pipeline
app.UseCors();
app.UseDefaultFiles();
app.UseStaticFiles();

// POST /start endpoint - receives events and broadcasts them
app.MapPost("/start", async (EventInput eventInput, EventBroadcaster broadcaster) =>
{
    if (string.IsNullOrWhiteSpace(eventInput.Id) ||
        string.IsNullOrWhiteSpace(eventInput.Type) ||
        string.IsNullOrWhiteSpace(eventInput.Message))
    {
        return Results.BadRequest("All fields are required");
    }

    // Broadcast the event to all connected SSE clients
    await broadcaster.BroadcastAsync(eventInput);
    Console.WriteLine($"Event received: {eventInput.Id}, {eventInput.Type}, {eventInput.Message}");

    return Results.Ok(new { success = true, message = "Event broadcasted successfully" });
});

// GET /sse endpoint - Server-Sent Events endpoint
app.MapGet("/sse", async (HttpContext context, EventBroadcaster broadcaster) =>
{
    context.Response.Headers.Append("Content-Type", "text/event-stream");
    context.Response.Headers.Append("Cache-Control", "no-cache");
    context.Response.Headers.Append("Connection", "keep-alive");

    var writer = new StreamWriter(context.Response.Body);
    broadcaster.AddClient(writer);

    try
    {
        // Send initial connection message
        await writer.WriteAsync("data: {\"type\":\"connected\",\"message\":\"Connected to SSE stream\"}\n\n");
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
