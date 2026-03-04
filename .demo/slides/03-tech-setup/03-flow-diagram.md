---
layout: default
---

# Data Flow

```mermaid
flowchart LR
    FE[Front-end] --HTTP--> CWA[ConcertoWorkflowApp]
    CWA --HTTP--> NSA[NoteStreamApp]
    NSA --SSE--> FE
    FE --WebMIDI--> HI[Audio/MIDI
    Interface]
    HI --MIDI--> HS[Synthesizer]
```
