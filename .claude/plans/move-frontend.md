# Plan: Move FrontEnd Static Files into NoteStreamApp

## Goal

Move the static files from the `FrontEnd` folder into `NoteStreamApp` so the HTML/CSS/JS is served directly by the ASP.NET Core app on `http://localhost:5051`. Once moved, the `FrontEnd` folder is removed.

## Current State

- `FrontEnd/` contains three files: `index.html`, `style.css`, `sketch.js`
- `NoteStreamApp` runs on `http://localhost:5051` (no static file serving)
- `NoteStreamApp` has no `wwwroot` folder and no static file middleware

## Steps

### 1. Add a `wwwroot` folder to `NoteStreamApp`

Create `NoteStreamApp/wwwroot/` and move the three files into it:

- `FrontEnd/index.html` → `NoteStreamApp/wwwroot/index.html`
- `FrontEnd/style.css` → `NoteStreamApp/wwwroot/style.css`
- `FrontEnd/sketch.js` → `NoteStreamApp/wwwroot/sketch.js`

### 2. Update `NoteStreamApp.csproj`

Add an `<ItemGroup>` so the build includes the static files as content:

```xml
<ItemGroup>
  <Content Include="wwwroot\**" CopyToOutputDirectory="PreserveNewest" />
</ItemGroup>
```

### 3. Update `Program.cs`

Add static file and default file middleware before the endpoint definitions:

```csharp
app.UseDefaultFiles();   // serves index.html for "/"
app.UseStaticFiles();    // serves wwwroot contents
```

### 4. Delete the `FrontEnd` folder

Remove the now-empty `FrontEnd/` directory from the repository.

## End Result

- `NoteStreamApp` listens on `http://localhost:5051`
- `http://localhost:5051/` serves `index.html`
- `http://localhost:5051/style.css` and `/sketch.js` are served as static assets
- `http://localhost:5051/sendnote` and `/sse` remain as API endpoints
- The `FrontEnd` folder no longer exists
