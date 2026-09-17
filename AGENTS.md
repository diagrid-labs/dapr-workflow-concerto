# Dapr Workflow Concerto

A Dapr Workflow demo that orchestrates music playback with real-time P5.js visualization. Two .NET 10 services, their Dapr sidecars and a Valkey state store run together under .NET Aspire.

## Architecture

- **ConcertoWorkflow.AppHost** — .NET Aspire host. Wires up Valkey (`cache`, port 16379), both service projects and their Dapr sidecars. Dapr components live in `ConcertoWorkflow.AppHost/Resources/`.
- **ConcertoWorkflow.ServiceDefaults** — Shared Aspire defaults (OpenTelemetry, health checks, resilience, service discovery). Referenced by both service projects.
- **ConcertoWorkflow.App** (`music-app`, port 5500) — Dapr Workflow orchestration with activities that send notes to NoteStreamApp via Dapr service invocation.
- **NoteStreamApp** (`note-stream-app`, port 5051) — Receives notes, queues them as SSE events, serves the P5.js frontend from `wwwroot/`.
- **Communication flow**: Frontend → HTTP POST → ConcertoWorkflow.App → Dapr HTTP → NoteStreamApp → SSE → Frontend.

## How to run

Prerequisites: .NET 10 SDK, Aspire CLI, Dapr CLI, Docker (or Podman).

```bash
cd ConcertoWorkflowSolution
aspire run
```

Open `http://localhost:5051` for the frontend.

To inspect workflow instances, run the [Diagrid Dapr Dev Dashboard](https://docs.diagrid.io/develop/local-development/dev-dashboard/) separately — it is a local binary, not part of `aspire run`:

```bash
diagrid-dev-dashboard
```

It listens on `http://localhost:9090` and auto-discovers the state store from the running apps' Dapr resource paths.

## Back-end rules

- C# .NET 10, ASP.NET Core Minimal API style. Dapr.Workflow + Dapr.Client SDK v1.18.4, Aspire 13.4.6, CommunityToolkit.Aspire.Hosting.Dapr v13.0.0.
- Keep code small and modular. Do not introduce unnecessary new classes or files.
- Workflow pattern: `MusicWorkflow` calibrates per-activity overhead with `MeasureLatencyActivity`, then loops through the score's notes via `SendNoteActivity`.
- Alternative workflow versions used during the live demo live next to it as `MusicWorkflowV2..V7.cs.temp` (V2/V5/V7 repeat with `ContinueAsNew`, V3 single-note `ContinueAsNew`, V4 fan-out/fan-in, V6 `WaitForExternalEventAsync("approve")`). The `.cs.temp` extension keeps them out of the build; they are swapped in by renaming.
- For each HTTP endpoint in `ConcertoWorkflow.App/Program.cs`, add a corresponding entry in `ConcertoWorkflow.App/ConcertoWorkflow.App.http` for the VS Code REST Client.

## Front-end rules

- Vanilla JS, P5.js (v1.7.0 + p5.sound) for canvas visualization, Web Audio API + Web MIDI API for playback.
- Keep front-end code simple and lightweight. No frameworks (React, Angular, Vue) unless explicitly requested.
- SSE via `EventSource` at `http://localhost:5051/sse` for real-time note and instanceId events; workflow control calls go to `http://localhost:5500` (hard-coded URLs in `sketch.js`).
- Music scores are defined in `musicscores.js` and registered in the `MUSIC_SCORES` map.

## Key files

- `ConcertoWorkflowSolution/aspire.config.json` — Points the Aspire CLI at the AppHost project
- `ConcertoWorkflowSolution/ConcertoWorkflow.AppHost/AppHost.cs` — Aspire resource graph (Valkey, projects, Dapr sidecars)
- `ConcertoWorkflowSolution/ConcertoWorkflow.AppHost/Resources/statestore.yaml` — Dapr `workflow-store` state store component (Redis-compatible, backed by Valkey)
- `ConcertoWorkflowSolution/ConcertoWorkflow.App/Program.cs` — Workflow service endpoints (startmusic, approve, pause, resume, terminate, musicstatus) and the `MusicScore`/`ScoreNote`/`PlaybackNote`/`SendNoteInput` records
- `ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflow.cs` — Workflow orchestration logic
- `ConcertoWorkflowSolution/ConcertoWorkflow.App/SendNoteActivity.cs` — Activity: converts note lengths to timings and sends notes to NoteStreamApp
- `ConcertoWorkflowSolution/ConcertoWorkflow.App/MeasureLatencyActivity.cs` — Activity: returns a timestamp, used to calibrate activity overhead
- `ConcertoWorkflowSolution/ConcertoWorkflow.App/FractionParser.cs` — Parses musical fractions ("1/4", "1/2.") into note values
- `ConcertoWorkflowSolution/ConcertoWorkflow.App/ConcertoWorkflow.App.http` — REST Client test requests
- `ConcertoWorkflowSolution/NoteStreamApp/Program.cs` — SSE endpoint, sendnote/sendinstanceid handlers, NoteQueueService
- `ConcertoWorkflowSolution/NoteStreamApp/wwwroot/sketch.js` — P5.js visualization, MIDI/audio playback, SSE client, workflow control buttons
- `ConcertoWorkflowSolution/NoteStreamApp/wwwroot/musicscores.js` — Music scores
- `ConcertoWorkflowSolution/NoteStreamApp/wwwroot/index.html` — Frontend HTML

## Skills

- **create-slide** — Creates DemoTime markdown slides
- **create-demotime-scene** - Creates DemoTime scene and moves
