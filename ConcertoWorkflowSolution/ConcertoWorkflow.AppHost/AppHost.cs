using System.Reflection;
using CommunityToolkit.Aspire.Hosting.Dapr;

var builder = DistributedApplication.CreateBuilder(args);

builder.AddDapr();

string executingPath = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location)
    ?? throw new("Where am I?");
var resourcesPath = Path.Join(executingPath, "Resources");

// Replace Dapr's default mDNS name resolution with the SQLite resolver.
// mDNS is link-wide: an app-id can resolve to another machine on the same
// network, or to a stale address a sidecar advertised earlier (for example a
// VPN address that is since gone), which makes service invocation fail with
// ERR_DIRECT_INVOKE. SQLite keeps registrations in a local file instead.
// Written at startup so the absolute connectionString is correct on any machine.
// disableWAL is required, not cosmetic: Aspire starts both sidecars in the same
// millisecond, and on a cold database they race to run the resolver's initial
// migration. Enabling WAL needs an exclusive lock, so the loser dies with
// "database is locked (5) (SQLITE_BUSY)". Its resolver never retries and that
// sidecar silently falls back to mDNS - the very thing this config replaces.
var nameResolutionDbPath = Path.Join(executingPath, "dapr-nameresolution.db");
var daprConfigPath = Path.Join(executingPath, "daprConfig.yaml");
File.WriteAllText(daprConfigPath, $"""
    apiVersion: dapr.io/v1alpha1
    kind: Configuration
    metadata:
      name: concertoconfig
    spec:
      nameResolution:
        component: "sqlite"
        version: "v1"
        configuration:
          connectionString: "{nameResolutionDbPath}"
          busyTimeout: "30s"
          disableWAL: true
    """);

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
        Config = daprConfigPath,
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
        Config = daprConfigPath,
    });
musicApp.WaitFor(statestore);
musicApp.WaitFor(noteStream);

builder.Build().Run();
