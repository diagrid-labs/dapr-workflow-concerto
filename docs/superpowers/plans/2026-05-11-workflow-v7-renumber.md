# Workflow V7 Renumber Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renumber the demo workflow versions so the current V6 becomes V7, the current V5 becomes V6, and a new V5 is introduced as a copy of V2's logic — keeping the DemoTime scene scripts and slides consistent with the new numbering.

**Architecture:** The renamed files are all `.cs.temp` files — DemoTime templates that are never compiled. They are revealed during demo scenes via DemoTime `rename` actions in `.demo/*.yaml`. Therefore there are no unit tests and no `dotnet build` step in this plan; verification is filesystem and grep based.

**Tech Stack:** C# (.NET 10 source held as `.cs.temp` until demo time), DemoTime YAML scene files, Markdown + mermaid slide files.

---

## File Inventory

**Workflow templates** (`ConcertoWorkflowSolution/ConcertoWorkflow.App/`):

- Rename: `MusicWorkflowV6.cs.temp` → `MusicWorkflowV7.cs.temp`
- Rename: `MusicWorkflowV5.cs.temp` → `MusicWorkflowV6.cs.temp`
- Create: `MusicWorkflowV5.cs.temp` (copy of `MusicWorkflowV2.cs.temp`, class renamed)

**Demo scene scripts** (`.demo/`):

- Modify: `09-demo6.yaml` (fix slide reference filename casing)
- Modify: `10-closing.yaml` (swap V6 → V7 in two scenes; add V7 to reset block)
- Untouched: `08-demo5.yaml` (still activates `V5.cs.temp`; new V5 content fits its narrative)

**Slides** (`.demo/slides/03-tech-setup/`):

- Rename: `04d-music-workflow-v5-diagram.md` → `04d-music-workflow-v6-diagram.md` (and update inline heading)

---

## Task 1: Rename V6 to V7

**Files:**

- Rename: `ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV6.cs.temp` → `ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV7.cs.temp`
- Modify (after rename): `ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV7.cs.temp`

- [ ] **Step 1: Rename the file using git**

Run:

```bash
git mv ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV6.cs.temp ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV7.cs.temp
```

Expected: silent success; `git status` shows `R  ...V6.cs.temp -> ...V7.cs.temp`.

- [ ] **Step 2: Update the class identifier inside the renamed file**

In `ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV7.cs.temp` replace every occurrence of `MusicWorkflowV6` with `MusicWorkflowV7`. There are exactly three textual occurrences (verified against the source content):

1. `public sealed partial class MusicWorkflowV6 : Workflow<MusicScore, object>`
2. `var logger = context.CreateReplaySafeLogger<MusicWorkflowV6>();`
3. `[LoggerMessage(LogLevel.Information, "Starting music workflow for score: {Title}")]` is the line *above* `static partial void LogStart(...)`; the partial-class binding uses `MusicWorkflowV6` via the `public sealed partial class` declaration only, so the three textual hits above are the complete set. The XML summary comment (`/// Final version.`) stays as-is.

Use a single `replace_all` edit (Edit tool, `replace_all: true`) with `old_string: MusicWorkflowV6` and `new_string: MusicWorkflowV7`.

- [ ] **Step 3: Verify the rename and class update**

Run:

```bash
grep -n "MusicWorkflowV6\|MusicWorkflowV7" ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV7.cs.temp
```

Expected output (exactly three lines, all containing `MusicWorkflowV7`, none containing `MusicWorkflowV6`):

```
8:public sealed partial class MusicWorkflowV7 : Workflow<MusicScore, object>
12:        var logger = context.CreateReplaySafeLogger<MusicWorkflowV7>();
...:    static partial void LogStart(ILogger logger, string Title);
```

(The third `MusicWorkflowV7` lives implicitly via the partial class — the grep will return two `MusicWorkflowV7` lines. If `MusicWorkflowV6` still appears, redo Step 2.)

- [ ] **Step 4: Commit**

```bash
git add ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV7.cs.temp
git commit -m "Rename MusicWorkflowV6 to MusicWorkflowV7"
```

---

## Task 2: Rename V5 to V6

**Files:**

- Rename: `ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV5.cs.temp` → `ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV6.cs.temp`
- Modify (after rename): `ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV6.cs.temp`

- [ ] **Step 1: Rename the file using git**

Run:

```bash
git mv ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV5.cs.temp ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV6.cs.temp
```

Expected: silent success.

- [ ] **Step 2: Update the class identifier inside the renamed file**

In `ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV6.cs.temp` replace every occurrence of `MusicWorkflowV5` with `MusicWorkflowV6`. Use a single `replace_all` Edit call with `old_string: MusicWorkflowV5` and `new_string: MusicWorkflowV6`. The XML summary comment (`/// Wait for approval before playing each note 🤦.`) stays as-is.

- [ ] **Step 3: Verify the rename and class update**

Run:

```bash
grep -n "MusicWorkflowV5\|MusicWorkflowV6" ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV6.cs.temp
```

Expected: two lines, both containing `MusicWorkflowV6`, none containing `MusicWorkflowV5`:

```
8:public sealed partial class MusicWorkflowV6 : Workflow<MusicScore, object>
12:        var logger = context.CreateReplaySafeLogger<MusicWorkflowV6>();
```

- [ ] **Step 4: Commit**

```bash
git add ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV6.cs.temp
git commit -m "Rename MusicWorkflowV5 to MusicWorkflowV6"
```

---

## Task 3: Create new V5 from V2

**Files:**

- Create: `ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV5.cs.temp`

- [ ] **Step 1: Copy V2 as the new V5**

Run:

```bash
cp ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV2.cs.temp ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV5.cs.temp
```

Expected: silent success.

- [ ] **Step 2: Update the class identifier inside the new file**

In `ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV5.cs.temp` replace every occurrence of `MusicWorkflowV2` with `MusicWorkflowV5`. Use a single `replace_all` Edit call. The XML summary comment (`/// Repeat the notes! 🎶`) stays as-is.

- [ ] **Step 3: Verify the new file has the expected content**

Run:

```bash
grep -n "MusicWorkflowV2\|MusicWorkflowV5" ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV5.cs.temp
```

Expected: two lines, both containing `MusicWorkflowV5`, none containing `MusicWorkflowV2`:

```
8:public sealed partial class MusicWorkflowV5 : Workflow<MusicScore, object>
12:        var logger = context.CreateReplaySafeLogger<MusicWorkflowV5>();
```

Then confirm the V2 source is unchanged:

```bash
grep -c "MusicWorkflowV2" ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV2.cs.temp
```

Expected: `2`.

- [ ] **Step 4: Commit**

```bash
git add ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV5.cs.temp
git commit -m "Add MusicWorkflowV5 as foreach+repeats variant"
```

---

## Task 4: Verify cross-references in the new file set

This task is a guardrail — it catches Task 1-3 mistakes before we start editing demo yamls.

- [ ] **Step 1: Confirm the full template inventory**

Run:

```bash
ls ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflow*.cs.temp
```

Expected output (exactly these six files):

```
ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV2.cs.temp
ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV3.cs.temp
ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV4.cs.temp
ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV5.cs.temp
ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV6.cs.temp
ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV7.cs.temp
```

If any file is missing or named differently, fix it before proceeding.

- [ ] **Step 2: Confirm class identifiers match their file names**

Run:

```bash
for v in 2 3 4 5 6 7; do
  f="ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV${v}.cs.temp"
  grep -q "class MusicWorkflowV${v} " "$f" && echo "V${v} ok" || echo "V${v} MISMATCH"
done
```

Expected:

```
V2 ok
V3 ok
V4 ok
V5 ok
V6 ok
V7 ok
```

If any line says `MISMATCH`, revisit the corresponding earlier task before continuing.

(No commit — this task is verification only.)

---

## Task 5: Update `09-demo6.yaml` slide reference

**Files:**

- Modify: `.demo/09-demo6.yaml:9`

Background: line 9 currently points to `04d-music-workflow-V6-diagram.md` (uppercase `V6`). The slide file we will rename in Task 7 is `04d-music-workflow-v6-diagram.md` (lowercase `v6`). Even if macOS is case-insensitive, DemoTime running on other platforms is not — fix the casing now.

- [ ] **Step 1: Update the slide path casing**

Edit `.demo/09-demo6.yaml`:

- `old_string`: `path: .demo/slides/03-tech-setup/04d-music-workflow-V6-diagram.md`
- `new_string`: `path: .demo/slides/03-tech-setup/04d-music-workflow-v6-diagram.md`

- [ ] **Step 2: Verify**

Run:

```bash
grep -n "04d-music-workflow" .demo/09-demo6.yaml
```

Expected (exactly one line, lowercase `v6`):

```
9:        path: .demo/slides/03-tech-setup/04d-music-workflow-v6-diagram.md
```

- [ ] **Step 3: Commit**

```bash
git add .demo/09-demo6.yaml
git commit -m "Fix V6 diagram slide path casing in demo6"
```

---

## Task 6: Update `10-closing.yaml` for V7

**Files:**

- Modify: `.demo/10-closing.yaml` (lines 17-18, lines 62-63, and the reset block ending at line 63)

Background: the closing demo currently activates `MusicWorkflowV6.cs.temp` as the "final version" and then resets V2-V6 back to `.cs.temp`. After renumbering, the final version is V7, and the reset block must also include V7.

- [ ] **Step 1: Change the opening "Let's Play!" scene from V6 to V7**

Edit `.demo/10-closing.yaml`:

- `old_string`:

```yaml
      - action: rename
        path: ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV6.cs.temp
        dest: ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV6.cs
      - action: waitForTimeout
```

- `new_string`:

```yaml
      - action: rename
        path: ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV7.cs.temp
        dest: ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV7.cs
      - action: waitForTimeout
```

(Anchor includes `waitForTimeout` to disambiguate from the reset block, which also renames V6.)

- [ ] **Step 2: Add a V7 reset entry to the Reset All block**

The existing Reset All block resets V2-V6. After renumbering, V6 is still activated mid-demo (by `09-demo6.yaml`) and V7 is also activated (by the opening scene of `10-closing.yaml` after Step 1), so **both** must appear in Reset All. Insert a new V7 rename move *after* the existing V6 rename move.

Edit `.demo/10-closing.yaml`:

- `old_string`:

```yaml
      - action: rename
        path: ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV6.cs
        dest: ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV6.cs.temp
      - action: focusTerminal
```

- `new_string`:

```yaml
      - action: rename
        path: ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV6.cs
        dest: ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV6.cs.temp
      - action: rename
        path: ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV7.cs
        dest: ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV7.cs.temp
      - action: focusTerminal
```

(Anchor includes `focusTerminal` to ensure we insert only inside the Reset All block, not after the opening scene we changed in Step 1.)

- [ ] **Step 3: Verify the closing yaml references V6 and V7 in the right places**

Run:

```bash
grep -n "MusicWorkflowV6\|MusicWorkflowV7" .demo/10-closing.yaml
```

Expected: two `MusicWorkflowV6` lines (only inside Reset All) and four `MusicWorkflowV7` lines (two in the opening "Let's Play!" scene, two in Reset All):

```
17:        path: ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV7.cs.temp
18:        dest: ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV7.cs
...:        path: ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV6.cs
...:        dest: ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV6.cs.temp
...:        path: ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV7.cs
...:        dest: ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflowV7.cs.temp
```

(Exact line numbers may differ — what matters is: zero V6 lines in the opening scene, two V7 lines in the opening scene, and a V6 + V7 pair in Reset All.)

- [ ] **Step 4: Commit**

```bash
git add .demo/10-closing.yaml
git commit -m "Point closing demo at MusicWorkflowV7"
```

---

## Task 7: Rename the V5 diagram slide to V6

**Files:**

- Rename: `.demo/slides/03-tech-setup/04d-music-workflow-v5-diagram.md` → `.demo/slides/03-tech-setup/04d-music-workflow-v6-diagram.md`
- Modify (after rename): the renamed file's `# MusicWorkflowV5` heading

Background: the existing V5 diagram describes the "wait for approval per note" pattern, which is now V6's behavior. The mermaid body is unchanged — only the heading and file name change.

- [ ] **Step 1: Rename the slide using git**

Run:

```bash
git mv .demo/slides/03-tech-setup/04d-music-workflow-v5-diagram.md .demo/slides/03-tech-setup/04d-music-workflow-v6-diagram.md
```

Expected: silent success.

- [ ] **Step 2: Update the heading inside the renamed slide**

Edit `.demo/slides/03-tech-setup/04d-music-workflow-v6-diagram.md`:

- `old_string`: `# MusicWorkflowV5`
- `new_string`: `# MusicWorkflowV6`

- [ ] **Step 3: Verify**

Run:

```bash
grep -n "MusicWorkflowV5\|MusicWorkflowV6" .demo/slides/03-tech-setup/04d-music-workflow-v6-diagram.md
```

Expected (exactly one line):

```
5:# MusicWorkflowV6
```

- [ ] **Step 4: Commit**

```bash
git add .demo/slides/03-tech-setup/04d-music-workflow-v6-diagram.md
git commit -m "Rename V5 diagram slide to V6"
```

---

## Task 8: Repo-wide cross-reference sweep

This task confirms there are no stale `MusicWorkflowV6` references anywhere in the repo expecting the old "final version" content, no stale `04d-music-workflow-v5-diagram.md` references, and that the renumbered set is internally consistent.

- [ ] **Step 1: Confirm no `.cs.temp` outside the App folder references the old names**

Run:

```bash
grep -rn "MusicWorkflowV[2-7]" \
  --include="*.cs" --include="*.yaml" --include="*.md" \
  --include="*.json" --include="*.http" .
```

Expected behavior: every result either

- lives inside `ConcertoWorkflowSolution/ConcertoWorkflow.App/` and matches its own file name's version, OR
- lives in a `.demo/*.yaml` and references the renumbered file names (V5/V6/V7 per Tasks 5-6), OR
- lives in a slide and refers to the renumbered diagrams.

Specifically the legitimate V6/V7 references in demo yamls after this plan are:

- `09-demo6.yaml`: V6 (activated mid-demo)
- `10-closing.yaml`: V7 in the opening "Let's Play!" scene; V6 and V7 each appear once in the Reset All block.

There must be **zero** references to `MusicWorkflowV5` outside of `08-demo5.yaml`. Scan visually; if anything looks wrong, fix it before continuing.

- [ ] **Step 2: Confirm no stale V5 diagram references remain**

Run:

```bash
grep -rn "04d-music-workflow-v5-diagram\|04d-music-workflow-V5-diagram\|04d-music-workflow-V6-diagram" \
  --include="*.yaml" --include="*.md" .
```

Expected: zero results.

- [ ] **Step 3: Confirm DemoTime scene activations resolve to existing files**

For each `.demo/*.yaml` rename-action `path` value (and each `openSlide` `path` value), run a `test -e` check. A one-liner:

```bash
python3 - <<'PY'
import re, pathlib, sys
root = pathlib.Path('.')
demos = sorted((root / '.demo').glob('*.yaml'))
missing = []
for d in demos:
    text = d.read_text()
    for m in re.finditer(r'path:\s*(\S+)', text):
        p = m.group(1)
        if p.endswith('.cs') and not p.endswith('.cs.temp'):
            continue
        if not (root / p).exists():
            missing.append(f"{d}: {p}")
for line in missing:
    print(line)
sys.exit(1 if missing else 0)
PY
```

Expected: zero output, exit code 0. (We exclude `.cs` paths without `.temp` because those files only exist transiently mid-demo.)

- [ ] **Step 4: Final commit (only if sweep surfaced fixes)**

If Steps 1-3 required any inline corrections, commit them:

```bash
git add -A
git commit -m "Fix stale workflow version references"
```

If everything passed cleanly, skip this commit.

---

## Verification Summary

After all tasks complete:

- `ls ConcertoWorkflowSolution/ConcertoWorkflow.App/MusicWorkflow*.cs.temp` lists V2-V7 (six files).
- Each `MusicWorkflowVx.cs.temp` declares `class MusicWorkflowVx`.
- `.demo/09-demo6.yaml` line 9 references `04d-music-workflow-v6-diagram.md` (lowercase).
- `.demo/10-closing.yaml` references `MusicWorkflowV7` four times (twice in the opening scene, twice in Reset All) and `MusicWorkflowV6` twice (only in Reset All).
- `.demo/slides/03-tech-setup/04d-music-workflow-v6-diagram.md` exists with heading `# MusicWorkflowV6`; the `...v5-diagram.md` file does not exist.
- Each demo YAML's `path:` values resolve to real files on disk (Task 8 Step 3).
