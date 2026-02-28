# Plan: Pause & Resume Workflow Button

## Overview

Add a Pause/Resume toggle button to the NoteStreamApp front-end (sketch.js) that suspends and resumes the running `MusicWorkflow` via new `/pause` and `/resume` endpoints on ConcertoWorkflow.

## Architecture

```
Browser (sketch.js)                              ConcertoWorkflow (port 5500)
        |                                                |
  1. User clicks "Pause"                                 |
        |                                                |
  2. POST /pause?instanceId=xxx -----------------------> |
        |                                          3. DaprWorkflowClient.SuspendWorkflowAsync(instanceId)
        |                                                |
  4. Button text changes to "Resume"                     |
        |                                                |
  5. User clicks "Resume"                                |
        |                                                |
  6. POST /resume?instanceId=xxx ----------------------> |
        |                                          7. DaprWorkflowClient.ResumeWorkflowAsync(instanceId)
        |                                                |
  8. Button text changes to "Pause"                      |
```

## Changes

### Step 1: Add `/pause` and `/resume` endpoints to ConcertoWorkflow

**File:** `ConcertoWorkflow/Program.cs`

Add two new endpoints next to the existing `/play` endpoint. Both accept `instanceId` as a query parameter and use the already-registered `DaprWorkflowClient`:

```csharp
app.MapPost("pause", async (
    string instanceId,
    [FromServices] DaprWorkflowClient workflowClient) =>
{
    await workflowClient.SuspendWorkflowAsync(instanceId);
    return Results.Accepted();
});

app.MapPost("resume", async (
    string instanceId,
    [FromServices] DaprWorkflowClient workflowClient) =>
{
    await workflowClient.ResumeWorkflowAsync(instanceId);
    return Results.Accepted();
});
```

### Step 2: Add a Pause/Resume toggle button to sketch.js

**File:** `NoteStreamApp/wwwroot/sketch.js`

- Add a global variable: `let pauseResumeButton;`
- Add a global state variable: `let isPaused = false;`

Add a `createPauseResumeButton()` function called from `setup()` (after `createPlayButton()`):

```javascript
function createPauseResumeButton() {
    pauseResumeButton = createButton('Pause');
    pauseResumeButton.position(100, 100);
    pauseResumeButton.class('pause-resume-button');
    pauseResumeButton.attribute('disabled', '');
    pauseResumeButton.mousePressed(onPauseResumePressed);
}
```

The button starts disabled. It becomes enabled when the Play button is pressed (i.e. the workflow is actively playing notes). Update `onPlayButtonPressed` to enable the pause/resume button on success:

```javascript
// Inside the .then() block of onPlayButtonPressed, after the existing logic:
if (pauseResumeButton) {
    pauseResumeButton.removeAttribute('disabled');
}
```

Add the click handler that toggles between pause and resume:

```javascript
function onPauseResumePressed() {
    if (!workflowInstanceId) {
        console.error('No workflow instanceId available');
        return;
    }

    const action = isPaused ? 'resume' : 'pause';
    const url = `http://localhost:5500/${action}?instanceId=${encodeURIComponent(workflowInstanceId)}`;

    fetch(url, { method: 'POST' })
        .then(response => {
            if (response.ok) {
                isPaused = !isPaused;
                pauseResumeButton.html(isPaused ? 'Resume' : 'Pause');
                console.log(`Workflow ${action}d for instanceId:`, workflowInstanceId);
            } else {
                console.error(`Failed to ${action} workflow:`, response.status);
            }
        })
        .catch(error => {
            console.error(`Error ${action}ing workflow:`, error);
        });
}
```

### Step 3: Add CSS for the Pause/Resume button

**File:** `NoteStreamApp/wwwroot/style.css`

Add styling consistent with the existing Play button, using an amber/yellow color to distinguish it:

```css
.pause-resume-button {
    position: absolute;
    padding: 10px 24px;
    background-color: rgba(200, 150, 0, 0.8);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 5px;
    font-size: 16px;
    z-index: 1000;
    cursor: pointer;
    pointer-events: auto;
}

.pause-resume-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background-color: rgba(0, 0, 0, 0.8);
}
```

### Step 4: Update local.http test entries

**File:** `NoteStreamApp/local.http`

No changes needed here since the endpoints are on ConcertoWorkflow, not NoteStreamApp.

However, since ConcertoWorkflow doesn't have a local.http file, this step is skipped. The endpoints can be tested via curl or the front-end button.

## File Summary

| File | Action |
|------|--------|
| `ConcertoWorkflow/Program.cs` | **Edit** - Add `/pause` and `/resume` endpoints |
| `NoteStreamApp/wwwroot/sketch.js` | **Edit** - Add `pauseResumeButton`, `isPaused` state, `createPauseResumeButton()`, `onPauseResumePressed()`, enable button on play |
| `NoteStreamApp/wwwroot/style.css` | **Edit** - Add `.pause-resume-button` styling |
