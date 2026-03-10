---
layout: default
---

# Data Flow

```mermaid
flowchart LR
    FE[Front-end] --1.HTTP--> CWA[ConcertoWorkflowApp]
    CWA<--2.gRPC-->DAPR[Dapr
    Workflow
    Engine]
    CWA --3.HTTP--> NSA[NoteStreamApp]
    NSA --4.SSE--> FE
    FE --5.MIDI--> HS[Synthesizer]
```
