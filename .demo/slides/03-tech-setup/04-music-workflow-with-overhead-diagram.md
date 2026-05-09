---
layout: default
---

# MusicWorkflow with CalculateOverhead

```mermaid
flowchart LR
    Start([Start]) --> Input[/MusicScore/]
    Input --> CalcLoop{For 5 samples}
    CalcLoop -->|Next sample| Measure[MeasureLatencyActivity]
    Measure -->|Timestamp| CalcLoop
    CalcLoop -->|Done| Avg[Average deltas
    overheadMs]
    Avg --> NoteLoop{For each note
    in MusicScore}
    NoteLoop -->|Next note| Send[SendNoteActivity]
    Send -->|Note sent| NoteLoop
    NoteLoop -->|All notes sent| Complete([End])

    style Start fill:#28a745,color:#ffffff
    style Complete fill:#dc3545,color:#ffffff
    style CalcLoop fill:#ffc107,color:#000000
    style NoteLoop fill:#ffc107,color:#000000
```
