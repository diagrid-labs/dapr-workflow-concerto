---
name: Create DemoTime move
description: Adds a DemoTime move definition to a DemoTime yaml file that defines an action and related configuration. Use this skill when the user or another skill mentions: create a DemoTime move, create an DemoTime act with moves.
---

## Overview

This skill creates a DemoTime move that will instruct DemoTime to perform an action.

## Structure

Actions are child items of moves in a DemoTime yaml.

Example:
```yaml
title: 03 - Tech Setup
version: 3
scenes:
  - title: Run Diagrid Dev Dashboard
    moves:
      - action: executeTerminalCommand
        command: docker run -p 8080:8080 ghcr.io/diagridio/diagrid-dashboard:latest
        terminalId: dev-dashboard
        insertTypingMode: character-by-character
        insertTypingSpeed: 50
```

## Actions

These are some commonly used actions:
- **executeTerminalCommand** - use to execute a VS Code terminal command
- **focusTerminal** - use to focus the terminal
- **executeVSCodeCommand** - use to execute a VS Code command
- **open** - use to open a file
- **close** - use to close the current file
- **openSlide** - use to open a markdown slide
- **rename** - use to rename a file
- **preview** - use to preview a file, typically a large markdown file that can't be shown with the openSlide action
- **highlight** - use to highlight text in a file
- **sendKeybinding** - use to send a keybinding to VSCode, such as CTRL+C to stop an application from running

### Terminal actions

#### executeTerminalCommand

```yaml
action: executeTerminalCommand
command: <command to execute>
terminalId: <terminal id (optional)>
autoExecute: <true/false (optional - default is true)>
insertTypingMode: <typing mode (optional - default is 'instant')>
insertTypingSpeed: <speed in milliseconds (optional)>
```

Example to run a Dapr application with multi-app run:
```yaml
action: executeTerminalCommand
command: dapr run -f .
terminalId: dapr-run
insertTypingMode: character-by-character
insertTypingSpeed: 75
```

Example to navigate to a folder named ConcertoWorkflow that contains a Dapr application:
```yaml
action: executeTerminalCommand
command: cd ConcertoWorkflow
terminalId: dapr-run
insertTypingMode: character-by-character
insertTypingSpeed: 50
```

Example to run the Diagrid Dev Dashboard container with docker:
```yaml
action: executeTerminalCommand
command: docker run -p 8080:8080 ghcr.io/diagridio/diagrid-dashboard:latest
terminalId: dev-dashboard
insertTypingMode: character-by-character
insertTypingSpeed: 50
```

For more terminal actions see: https://demotime.show/actions/terminal/

#### focusTerminal

```yaml
action: focusTerminal
terminalId: dapr-run
```

## VSCode actions

### executeVSCodeCommand

```yaml
action: executeVSCodeCommand
command: workbench.action.toggleSidebarVisibility
```

For more VSCode actions see: https://demotime.show/actions/vscode/

### File actions

#### open

```yaml
action: open
path: <relative path to the file>
```

#### close

```yaml
action: close
```

#### rename

```yaml
action: rename
path: <relative path to the file>
dest: <new name/path of the file>
overwrite: <true/false> # optional, default is false
```

For more file actions see: https://demotime.show/actions/file/

## Preview actions

### openSlide

```yaml
action: openSlide
path: <relative path to the file>
slide: <slide number (1-based) (optional)>
```

### preview

```yaml
action: markdownPreview
path: <relative path to the file>
```

For more preview actions see: https://demotime.show/actions/preview/

### Text actions

### highlight

```yaml
# Via position
action: highlight
path: <relative path to the file>
position: <position>
zoom: <zoom level> # Optional
highlightBlur: <blur effect for non-highlighted text> # Optional
highlightOpacity: <opacity for non-highlighted text> # Optional
```

For more text actions see: https://demotime.show/actions/text/

### Interaction actions

### sendKeybinding

Example to send CTRL+C to the terminal with id `dapr-run`:

```yaml
action: focusTerminal
terminalId: dapr-run
action: sendKeybinding
keybinding: ctrl+c
```