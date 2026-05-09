---
layout: default
---

# MusicWorkflowV5

```mermaid
flowchart LR
    Start([Start]) --> Input[/MusicScore/]
    Input --> Empty{Notes empty?}
    Empty -->|Yes| Complete([End])
    Empty -->|No| Wait[/WaitForExternalEvent
    'approve'/]
    Wait --> Approved{Approved?}
    Approved -->|Yes| Activity[SendNoteActivity
    first note]
    Approved -->|No| Skip[Skip note]
    Activity --> ContinueAsNew[/ContinueAsNew
    remaining notes/]
    Skip --> ContinueAsNew
    ContinueAsNew --> Input

    style Start fill:#28a745,color:#ffffff
    style Complete fill:#dc3545,color:#ffffff
    style Empty fill:#ffc107,color:#000000
    style Approved fill:#ffc107,color:#000000
```
