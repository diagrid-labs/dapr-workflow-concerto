# Plan: Send Workflow InstanceId to Front-End & Play Button

## Overview

Send the workflow `instanceId` from the `MusicWorkflow` to the NoteStreamApp front-end via SSE, and add a "Play" button that raises the `play` event on the workflow.

## Architecture

```
ConcertoWorkflow (port 5500)          NoteStreamApp (port 5051)          Browser (sketch.js)
        |                                      |                              |
  1. MusicWorkflow starts                      |                              |
        |                                      |                              |
  2. Calls SendInstanceIdActivity ----POST /sendinstanceid----->               |
        |                                      |                              |
        |                               3. Enqueues SSE event ----SSE event: instanceId---->
        |                                      |                              |
  4. WaitForExternalEvent("play")              |                  5. Stores instanceId
        |                                      |                              |
        |                                      |                  6. User clicks "Play"
        |                                      |                              |
        |<---------POST /play?instanceId=xxx--------------------------- 7. POST to ConcertoWorkflow
        |                                      |                              |
  8. Resumes workflow, plays notes             |                              |
```

## Changes

### Step 1: Create `SendInstanceIdActivity` in ConcertoWorkflow

**File:** `ConcertoWorkflow/SendInstanceIdActivity.cs` (new file)

- Create a new `WorkflowActivity<string, bool>` class similar to `SendNoteActivity`.
- Inject `HttpClient` (same Dapr invoke client targeting `note-stream-app`).
- In `RunAsync`, POST the `instanceId` string to `/sendinstanceid`.
- No `Task.Delay` needed (unlike `SendNoteActivity` which uses `WaitMs`).

```csharp
public class SendInstanceIdActivity : WorkflowActivity<string, bool>
{
    private readonly HttpClient _httpClient;

    public SendInstanceIdActivity(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public override async Task<bool> RunAsync(WorkflowActivityContext context, string instanceId)
    {
        var response = await _httpClient.PostAsJsonAsync("/sendinstanceid", instanceId);
        return response.IsSuccessStatusCode;
    }
}
```

### Step 2: Register the activity and call it from `MusicWorkflow`

**File:** `ConcertoWorkflow/Program.cs`

- Register `SendInstanceIdActivity` in the workflow options:
  ```csharp
  options.RegisterActivity<SendInstanceIdActivity>();
  ```

**File:** `ConcertoWorkflow/MusicWorkflow.cs`

- Call `SendInstanceIdActivity` **before** the `WaitForExternalEventAsync("play")` call, passing `context.InstanceId`:
  ```csharp
  await context.CallActivityAsync<bool>(nameof(SendInstanceIdActivity), context.InstanceId);
  ```

### Step 3: Extend NoteStreamApp SSE to support multiple event types

**File:** `NoteStreamApp/Program.cs`

The current SSE uses a `Channel<Note>` with unnamed events. To also send instanceId data, we need to support multiple event types on the SSE stream.

**Approach:** Introduce an `SseEvent` wrapper record and change the channel to `Channel<SseEvent>`:

```csharp
public record SseEvent(string EventType, object Data);
```

- Rename `NoteQueueService` to `SseQueueService` (or keep the name and change the channel type).
- Change `Channel<Note>` to `Channel<SseEvent>`.
- Update the `EnqueueAsync` and `DequeueAllAsync` signatures accordingly.

**Update the `/sendnote` endpoint** to wrap the note in an `SseEvent`:
```csharp
await queue.EnqueueAsync(new SseEvent("note", note));
```

**Add a new `/sendinstanceid` POST endpoint:**
```csharp
app.MapPost("/sendinstanceid", async (
    [FromBody] string instanceId,
    [FromServices] NoteQueueService queue) =>
{
    await queue.EnqueueAsync(new SseEvent("instanceId", instanceId));
    return Results.Accepted();
});
```

**Update the SSE stream** to emit named events:
```csharp
await foreach (var sseEvent in queue.DequeueAllAsync(context.RequestAborted))
{
    var json = JsonSerializer.Serialize(sseEvent.Data);
    await context.Response.WriteAsync($"event: {sseEvent.EventType}\ndata: {json}\n\n");
    await context.Response.Body.FlushAsync(context.RequestAborted);
}
```

### Step 4: Update sketch.js SSE handling for named events

**File:** `NoteStreamApp/wwwroot/sketch.js`

The current `eventSource.onmessage` handler only captures **unnamed** SSE events. Since we're now using **named** events (`event: note` and `event: instanceId`), we need to switch to `addEventListener`:

- Add a global variable: `let workflowInstanceId = null;`
- Add a global variable for the play button: `let playButton;`

**Replace** `eventSource.onmessage` with two named event listeners:

```javascript
eventSource.addEventListener('note', function(event) {
    try {
        const data = JSON.parse(event.data);
        console.log('SSE note received:', data);
        handleSSENote(data);
    } catch (error) {
        console.error('Error parsing SSE note data:', error);
    }
});

eventSource.addEventListener('instanceId', function(event) {
    try {
        workflowInstanceId = JSON.parse(event.data);
        console.log('Received workflow instanceId:', workflowInstanceId);
        if (playButton) {
            playButton.removeAttribute('disabled');
        }
    } catch (error) {
        console.error('Error parsing SSE instanceId data:', error);
    }
});
```

### Step 5: Add a "Play" button to sketch.js

**File:** `NoteStreamApp/wwwroot/sketch.js`

Add a `createPlayButton()` function called from `setup()`:

```javascript
function createPlayButton() {
    playButton = createButton('Play');
    playButton.position(20, 100);
    playButton.class('play-button');
    playButton.attribute('disabled', '');
    playButton.mousePressed(onPlayButtonPressed);
}
```

Add the click handler that POSTs to the ConcertoWorkflow `play` endpoint:

```javascript
function onPlayButtonPressed() {
    if (!workflowInstanceId) {
        console.error('No workflow instanceId available');
        return;
    }

    initAudioContext();

    const playUrl = `http://localhost:5500/play?instanceId=${encodeURIComponent(workflowInstanceId)}`;
    fetch(playUrl, { method: 'POST' })
        .then(response => {
            if (response.ok) {
                console.log('Play event sent for instanceId:', workflowInstanceId);
                playButton.attribute('disabled', '');
            } else {
                console.error('Failed to send play event:', response.status);
            }
        })
        .catch(error => {
            console.error('Error sending play event:', error);
        });
}
```

### Step 6: Add CSS for the Play button

**File:** `NoteStreamApp/wwwroot/style.css`

Add styling for the play button consistent with the existing dark UI theme:

```css
.play-button {
    position: absolute;
    padding: 10px 24px;
    background-color: rgba(0, 150, 0, 0.8);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 5px;
    font-size: 16px;
    z-index: 1000;
    cursor: pointer;
    pointer-events: auto;
}

.play-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background-color: rgba(0, 0, 0, 0.8);
}
```

### Step 7: Update local.http files

**File:** `NoteStreamApp/local.http`

Add a test entry for the new endpoint:

```http
### Send instanceId
POST http://localhost:5051/sendinstanceid
Content-Type: application/json

"test-instance-id-123"
```

### Step 8: Enable CORS on ConcertoWorkflow for the Play button

**File:** `ConcertoWorkflow/Program.cs`

The front-end (served from `localhost:5051`) will POST directly to ConcertoWorkflow (`localhost:5500`). This is a cross-origin request, so CORS must be enabled:

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

// after building:
app.UseCors();
```

## File Summary

| File | Action |
|------|--------|
| `ConcertoWorkflow/SendInstanceIdActivity.cs` | **New** - Activity to POST instanceId to NoteStreamApp |
| `ConcertoWorkflow/MusicWorkflow.cs` | **Edit** - Call `SendInstanceIdActivity` before waiting for play event |
| `ConcertoWorkflow/Program.cs` | **Edit** - Register activity, add CORS |
| `NoteStreamApp/Program.cs` | **Edit** - Add `SseEvent` wrapper, `/sendinstanceid` endpoint, named SSE events |
| `NoteStreamApp/wwwroot/sketch.js` | **Edit** - Named SSE listeners, instanceId variable, Play button |
| `NoteStreamApp/wwwroot/style.css` | **Edit** - Play button styling |
| `NoteStreamApp/local.http` | **Edit** - Add `/sendinstanceid` test entry |
