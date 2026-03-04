---
name: Create DemoTime slide
description: Create a markdown file with frontmatter that DemoTime can use as a slide. Use this skill when the user or another skill mentions: create a slide, design a slide.
---

## Overview

This skill creates a markdown-based slide that the VSCode extension DemoTime time supports.

## Structure

A slide always starts with frontmatter that contains fields for `layout` and `theme`. The rest of the file consists of regular markdown, including headings, texts, quotes, lists, images, mermaid diagrams.

### Layout field

The layout field options are:
- `default` - for regular slides
- `intro` - the very first slide with the title of the presentation
- `section` -  for a new section within the presentation. 

For more layout options see: https://demotime.show/slides/layouts/

### Theme field

Use the `default` value for the theme field unless explicitly mentioned otherwise.

For information about custom themes see: https://demotime.show/slides/themes/custom/

## File structure

Slides are always stored in a `.demo/slides/<SECTION>` folder within the repository. If the <SECTION> is unclear, ask the user what the section should be.

Slide files have a number as a prefix with one leading zero followed by one or two words that describe be content of the file.

Examples:
- .demo/slides/01-intro/01-title.md
- .demo/slides/01-intro/02-bio.md
- .demo/slides/02-workflow/01-workflow-intro.md
- .demo/slides/02-workflow/02-diagram.md 

## Example slide structure

```markdown
---
theme: default
layout: default
---

# Title

Some regular text.

![Image](<PATH_TO_IMAGE>)

- Item A
- Item B
- Item C

```

## DemoTime Act file

The markdown slides are organized in a DemoTime specific yaml file and saved in the `.demo` folder.

### Example 01-start.yaml

```
title: 01 - Start
version: 3
scenes:
  - title: Intro
    moves:
      - action: openSlide
        path: .demo/slides/01-intro/01-intro.md
  - id: demo-mmcgboeq-yvo8
    title: Bio
    moves:
      - action: openSlide
        path: .demo/slides/01-intro/02-bio.md
  - id: demo-mmcgdyir-ug1w
    title: EngageTime
    moves:
      - action: openSlide
        path: .demo/slides/01-intro/03-engagetime.md
```