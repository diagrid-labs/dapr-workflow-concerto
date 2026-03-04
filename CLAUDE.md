# Dapr Workflow Concerto

A Dapr Workflow demo that orchestrates music playback with real-time P5.js visualization. Two .NET 10 services communicate via Dapr service invocation and SSE.

## Architecture

- **ConcertoWorkflow** (`music-app`, port 5500) — Dapr Workflow orchestration with activities that send notes to NoteStreamApp via Dapr service invocation.
- **NoteStreamApp** (`note-stream-app`, port 5051) — Receives notes, queues them as SSE events, serves the P5.js frontend from `wwwroot/`.
- **Communication flow**: Frontend → HTTP POST → ConcertoWorkflow → Dapr HTTP → NoteStreamApp → SSE → Frontend.

## How to run

Prerequisites: Dapr CLI, Docker, .NET 10 SDK. Start with `dapr run -f dapr.yaml`. Open `http://localhost:5051` for the frontend.

## Back-end rules

- C# .NET 10, ASP.NET Core Minimal API style. Dapr.Workflow SDK v1.17.0.
- Keep code small and modular. Do not introduce unnecessary new classes or files.
- Workflow pattern: `MusicWorkflow` calls `SendInstanceIdActivity` then loops through notes via `SendNoteActivity`, with `ContinueAsNew` for repeats.
- For each HTTP endpoint in Program.cs, add a corresponding entry in `local.http` for the VS Code REST Client.

## Front-end rules

- Vanilla JS, P5.js (v1.7.0) for canvas visualization, Web Audio API + Web MIDI API for playback.
- Keep front-end code simple and lightweight. No frameworks (React, Angular, Vue) unless explicitly requested.
- SSE via `EventSource` at `/sse` for real-time note and instanceId events.

## Key files

- `dapr.yaml` — Dapr multi-app run config
- `ConcertoWorkflow/Program.cs` — Workflow service endpoints (startmusic, pause, resume, approve, musicstatus)
- `ConcertoWorkflow/MusicWorkflow.cs` — Workflow orchestration logic
- `ConcertoWorkflow/SendNoteActivity.cs` — Activity: sends notes to NoteStreamApp
- `NoteStreamApp/Program.cs` — SSE endpoint, sendnote/sendinstanceid handlers, NoteQueueService
- `NoteStreamApp/wwwroot/sketch.js` — P5.js visualization, MIDI/audio playback, SSE client, music scores
- `NoteStreamApp/wwwroot/index.html` — Frontend HTML
- `local.http` — REST Client test requests

## Skills

- **create-slide** — Creates DemoTime markdown slides
