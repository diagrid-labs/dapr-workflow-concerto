using System.Text.Json;
using System.Threading.Channels;

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
app.MapPost("/sendnote", async (Note note, NoteQueueService queue) =>
{
    await queue.EnqueueAsync(note);
    return Results.Accepted();
});

// GET endpoint for SSE stream
app.MapGet("/sse", async (HttpContext context, NoteQueueService queue) =>
{
    context.Response.Headers.Append("Content-Type", "text/event-stream");
    context.Response.Headers.Append("Cache-Control", "no-cache");
    context.Response.Headers.Append("Connection", "keep-alive");
    
    await foreach (var note in queue.DequeueAllAsync(context.RequestAborted))
    {
        var json = JsonSerializer.Serialize(note);
        await context.Response.WriteAsync($"data: {json}\n\n");
        await context.Response.Body.FlushAsync();
    }
});

app.Run();

// Data model
public record Note(string Id, string NoteName, string Type, int DurationMs, int WaitMs);

// Queue service
public class NoteQueueService
{
    private readonly Channel<Note> _channel;
    
    public NoteQueueService()
    {
        _channel = Channel.CreateUnbounded<Note>();
    }
    
    public async Task EnqueueAsync(Note note)
    {
        await _channel.Writer.WriteAsync(note);
    }
    
    public IAsyncEnumerable<Note> DequeueAllAsync(CancellationToken cancellationToken)
    {
        return _channel.Reader.ReadAllAsync(cancellationToken);
    }
}
