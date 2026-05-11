# Renumber MusicWorkflow Versions to Introduce V7

## Goal

Shift the workflow demo numbering so that:

- The current `MusicWorkflowV6` (foreach + ContinueAsNew for repeats — the "final version") becomes `MusicWorkflowV7`.
- The current `MusicWorkflowV5` (wait-for-approval per note) becomes `MusicWorkflowV6`.
- A new `MusicWorkflowV5` is introduced as a copy of `MusicWorkflowV2`'s logic (foreach + ContinueAsNew for repeats), to act as the "safe pattern recovery" after the V4 fan-out demonstration breaks timing.

## Narrative After Renumber

| Version | Pattern | Demo role |
|---|---|---|
| V1 (`MusicWorkflow.cs`) | foreach, no repeats | Baseline |
| V2 | foreach + repeats via ContinueAsNew | Intro to ContinueAsNew |
| V3 | One note per instance via ContinueAsNew | Continuation pattern variant |
| V4 | Fan-out via Task.WhenAll | Cautionary example (breaks timing) |
| **V5 (new)** | foreach + repeats (copy of V2) | Recovery: return to the safe pattern after V4 |
| **V6 (was V5)** | Wait for approval per note | Interactive: external events |
| **V7 (was V6)** | foreach + repeats | Final production version for the closing demo |

## Changes

### 1. Workflow files (`ConcertoWorkflowSolution/ConcertoWorkflow.App/`)

| Action | Source | Destination | Class identifier change |
|---|---|---|---|
| Rename | `MusicWorkflowV6.cs.temp` | `MusicWorkflowV7.cs.temp` | `MusicWorkflowV6` → `MusicWorkflowV7` |
| Rename | `MusicWorkflowV5.cs.temp` | `MusicWorkflowV6.cs.temp` | `MusicWorkflowV5` → `MusicWorkflowV6` |
| Create | (copy of `MusicWorkflowV2.cs.temp`) | `MusicWorkflowV5.cs.temp` | `MusicWorkflowV2` → `MusicWorkflowV5` |

Identifier occurrences per file: `public sealed partial class`, `context.CreateReplaySafeLogger<...>`, and the `static partial void` log method's enclosing class. Existing XML summary comments travel with each file unchanged (V7 keeps "Final version", V6 keeps "Wait for approval", new V5 keeps V2's "Repeat the notes! 🎶").

### 2. Demo YAML files (`.demo/`)

- **`08-demo5.yaml`** — no edits. Already activates `V5.cs.temp`; new V5 content (foreach + repeats) fits the "safe pattern after V4" narrative better than the prior wait-for-approval content.
- **`09-demo6.yaml`** — fix the broken slide reference on line 9:
  - `04d-music-workflow-V6-diagram.md` → `04d-music-workflow-v6-diagram.md` (case fix; targets the renamed slide below)
- **`10-closing.yaml`** — swap final-version target from V6 to V7:
  - Lines 17-18: `MusicWorkflowV6.cs.temp` → `MusicWorkflowV7.cs.temp` and `MusicWorkflowV6.cs` → `MusicWorkflowV7.cs`
  - Lines 62-63 (reset block): same swap
  - Add a new reset entry mirroring the existing V5-V6 pattern so `MusicWorkflowV7.cs` is also restored back to `.temp`

### 3. Slide (`.demo/slides/03-tech-setup/`)

- Rename `04d-music-workflow-v5-diagram.md` → `04d-music-workflow-v6-diagram.md`
- Inside the renamed file, change the `# MusicWorkflowV5` heading to `# MusicWorkflowV6`. The mermaid "wait for approval" diagram is unchanged — the behavior it depicts is now V6's behavior.
- No new diagrams created for the new V5 or V7. No demo yaml currently opens those.

## Out of Scope

- New diagram slides for the new V5 and V7 (no demo yaml references them).
- Custom rewrites of summary comments inside the renamed workflow files.
- Updates to `MusicWorkflow.cs` (V1), V2, V3, V4 — they are untouched.
- Any C# code outside the renamed class identifiers (logic is preserved verbatim).

## Verification

After execution:

- `grep -rn "MusicWorkflowV[5-7]" ConcertoWorkflowSolution .demo` shows only the new file names and matching class names (no stale references).
- `ls ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflow*.temp` lists `V2`, `V3`, `V4`, `V5`, `V6`, `V7` `.cs.temp` files.
- `ls .demo/slides/03-tech-setup/04d-music-workflow-v6-diagram.md` exists; the old `...-v5-diagram.md` does not.
- `09-demo6.yaml` line 9 resolves to a real file.
- `10-closing.yaml` resets all of V2-V7 back to `.cs.temp` in its closing scene.
