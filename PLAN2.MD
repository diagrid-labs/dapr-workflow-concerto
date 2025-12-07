# PLAN2: Minimal .NET Web API with In-Memory Queue and SSE

## Overview

Build a minimal .NET web API in named NoteStreamApp that accepts Note records via POST, queues them in memory, and streams them to a single client via Server-Sent Events (SSE).

## Architecture

```
Client (POST) --> /sendnote --> In-Memory Queue
                                      |
                                      v
Client (SSE)  <-- /sse <----------  Dequeue
```

## Data Model

```csharp
public record Note(string Id, string NoteName, string Type, int DurationMs);
```

## Requirements

### 1. In-Memory Queue
- Use `System.Threading.Channels` for thread-safe, async queue operations
- `Channel<Note>` provides efficient producer-consumer pattern
- Unbounded channel to handle bursts of incoming notes

### 2. POST `/sendnote` Endpoint
- Accepts `Note` record in request body
- Validates the incoming data
- Writes note to the channel (enqueue)
- Returns 202 Accepted status
- Thread-safe for concurrent requests

### 3. GET `/sse` Endpoint
- Returns `text/event-stream` content type
- Connects a single client (SSE protocol)
- Continuously reads from channel (dequeue)
- Formats data as SSE: `data: {json}\n\n`
- Handles client disconnection gracefully
- Supports cancellation via request abort

### 4 Application Port
The http port the application listens on is 5051.

## Implementation Steps

### Step 1: Create Project Structure
```bash
dotnet new web -n NoteStreamApp
cd NoteStreamApp
```

### Step 2: Define the Note Record
```csharp
public record Note(string Id, string NoteName, string Type, int DurationMs);
```

### Step 3: Create Channel Service
```csharp
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
```

### Step 4: Register Service
```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<NoteQueueService>();
var app = builder.Build();
```

### Step 5: Implement POST `/sendnote`
```csharp
app.MapPost("/sendnote", async (Note note, NoteQueueService queue) =>
{
    await queue.EnqueueAsync(note);
    return Results.Accepted();
});
```

### Step 6: Implement GET `/sse`
```csharp
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
```

### Step 7: Configure CORS (if needed)
```csharp
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

app.UseCors();
```

## Complete Program.cs Example

```csharp
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
public record Note(string Id, string NoteName, string Type, int DurationMs);

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
```

## Testing

### 1. Start the API
```bash
dotnet run
```

### 2. Connect SSE Client (Terminal 1)
```bash
curl -N http://localhost:5000/sse
```

### 3. Send Notes (Terminal 2)
```bash
curl -X POST http://localhost:5000/sendnote \
  -H "Content-Type: application/json" \
  -d '{"Id":"1","NoteName":"C4","Type":"quarter","DurationMs":500}'

curl -X POST http://localhost:5000/sendnote \
  -H "Content-Type: application/json" \
  -d '{"Id":"2","NoteName":"E4","Type":"quarter","DurationMs":500}'
```

### 4. Using local.http (VS Code REST Client)
```http
### Connect to SSE stream
GET http://localhost:5000/sse

### Send a note
POST http://localhost:5000/sendnote
Content-Type: application/json

{
  "Id": "1",
  "NoteName": "C4",
  "Type": "quarter",
  "DurationMs": 500
}
```

## Key Design Decisions

### Why System.Threading.Channels?
- **Thread-safe**: Built-in synchronization for concurrent access
- **Async-first**: Native async/await support
- **Efficient**: Lock-free implementation for high throughput
- **Backpressure**: Can configure bounded channels if needed
- **Standard library**: No external dependencies

### Why Singleton Service?
- Single in-memory queue shared across all requests
- Maintains state for the lifetime of the application
- Single point of coordination between POST and GET endpoints

### SSE Protocol Details
- `Content-Type: text/event-stream` - Required for SSE
- `Cache-Control: no-cache` - Prevent caching of event stream
- `Connection: keep-alive` - Keep connection open
- Format: `data: {payload}\n\n` - Each event ends with double newline
- Client auto-reconnects on disconnect (browser behavior)

### Single Client Assumption
- The `/sse` endpoint design supports one client at a time
- Multiple clients would each consume different notes (competing consumers)
- For multiple clients receiving same notes, use pub/sub pattern instead

## Enhancements (Optional)

### 1. Add Logging
```csharp
app.MapPost("/sendnote", async (Note note, NoteQueueService queue, ILogger<Program> logger) =>
{
    logger.LogInformation("Received note: {Id} - {NoteName}", note.Id, note.NoteName);
    await queue.EnqueueAsync(note);
    return Results.Accepted();
});
```

### 2. Add Validation
```csharp
app.MapPost("/sendnote", async (Note note, NoteQueueService queue) =>
{
    if (string.IsNullOrEmpty(note.Id) || note.DurationMs <= 0)
    {
        return Results.BadRequest("Invalid note data");
    }
    
    await queue.EnqueueAsync(note);
    return Results.Accepted();
});
```

### 3. Add Health Check
```csharp
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));
```

### 4. Add Metrics Endpoint
```csharp
public class NoteQueueService
{
    private int _totalEnqueued = 0;
    private int _totalDequeued = 0;
    
    public (int Enqueued, int Dequeued) GetMetrics() => (_totalEnqueued, _totalDequeued);
}

app.MapGet("/metrics", (NoteQueueService queue) => 
{
    var (enqueued, dequeued) = queue.GetMetrics();
    return Results.Ok(new { enqueued, dequeued, pending = enqueued - dequeued });
});
```

## Deployment Considerations

1. **Container**: Package as Docker container for easy deployment
2. **Environment Variables**: Use for port configuration
3. **Graceful Shutdown**: Channel completes on app shutdown
4. **Memory**: Unbounded channel can grow - consider bounded with limits
5. **Monitoring**: Add structured logging and metrics

## Limitations

1. **In-memory only**: Notes lost on restart
2. **Single instance**: Doesn't scale horizontally
3. **No persistence**: No durability guarantees
4. **Single consumer**: One SSE client at a time
5. **No authentication**: Add if needed for production

## Next Steps

For production use, consider:
- Redis for distributed queue
- SignalR for multiple clients
- Message broker (RabbitMQ, Kafka) for durability
- Database persistence for note history
- Authentication and authorization
