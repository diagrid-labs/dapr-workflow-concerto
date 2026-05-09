using System.Reflection;
using CommunityToolkit.Aspire.Hosting.Dapr;

var builder = DistributedApplication.CreateBuilder(args);

builder.AddDapr();

string executingPath = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location)
    ?? throw new("Where am I?");
var resourcesPath = Path.Join(executingPath, "Resources");

var cachePassword = builder.AddParameter("cache-password", "state-store-123", secret: true);
var cache = builder
    .AddValkey("cache", 16379, cachePassword)
    .WithContainerName("workflow-state")
    .WithDataVolume("workflow-state-data");

var noteStream = builder
    .AddProject<Projects.NoteStreamApp>("note-stream-app")
    .WithHttpEndpoint(port: 5051, name: "http")
    .WithDaprSidecar(new DaprSidecarOptions
    {
        AppId = "note-stream-app",
        LogLevel = "info",
        ResourcesPaths = [resourcesPath],
    });
noteStream.WaitFor(cache);

var musicApp = builder
    .AddProject<Projects.ConcertoWorkflowApp>("music-app")
    .WithHttpEndpoint(port: 5500, name: "http")
    .WithDaprSidecar(new DaprSidecarOptions
    {
        AppId = "music-app",
        LogLevel = "info",
        ResourcesPaths = [resourcesPath],
    });
musicApp.WaitFor(cache);
musicApp.WaitFor(noteStream);

builder
    .AddContainer("diagrid-dashboard", "ghcr.io/diagridio/diagrid-dashboard:latest")
    .WithContainerName("diagrid-dashboard")
    .WithBindMount(resourcesPath, "/app/components")
    .WithEnvironment("COMPONENT_FILE", "/app/components/statestore-dashboard.yaml")
    .WithEnvironment("APP_ID", "diagrid-dashboard")
    .WithHttpEndpoint(targetPort: 8080)
    .WithReference(cache);

builder.Build().Run();
