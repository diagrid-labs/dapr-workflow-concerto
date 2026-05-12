---
layout: default
---

# Data Flow

```mermaid
flowchart LR
    FE(Front-end) --1.HTTP--> CWA(ConcertoWorkflow.App)
    CWA<--2.gRPC-->DAPR(Dapr
    Workflow
    Engine)
    CWA --3.HTTP--> NSA(NoteStreamApp)
    NSA --4.SSE--> FE
    FE --5.MIDI--> HS(Synthesizer)

    classDef default stroke:#41bd9b,stroke-width:2px
    linkStyle default stroke:#41bd9b,stroke-width:1px
```
