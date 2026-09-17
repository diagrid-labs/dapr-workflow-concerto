using System.Reflection;
using CommunityToolkit.Aspire.Hosting.Dapr;

var builder = DistributedApplication.CreateBuilder(args);

builder.AddDapr();

string executingPath = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location)
    ?? throw new("Where am I?");
var resourcesPath = Path.Join(executingPath, "Resources");

var statestorePassword = builder.AddParameter("cache-password", "state-store-123", secret: true);
var statestore = builder
    .AddValkey("statestore", 16379, statestorePassword)
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
noteStream.WaitFor(statestore);

var musicApp = builder
    .AddProject<Projects.ConcertoWorkflow_App>("music-app")
    .WithHttpEndpoint(port: 5500, name: "http")
    .WithDaprSidecar(new DaprSidecarOptions
    {
        AppId = "music-app",
        LogLevel = "info",
        ResourcesPaths = [resourcesPath],
    });
musicApp.WaitFor(statestore);
musicApp.WaitFor(noteStream);

builder.Build().Run();
