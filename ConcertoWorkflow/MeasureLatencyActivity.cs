using System;
using Microsoft.Extensions.Logging;
using Dapr.Workflow;

public sealed partial class MeasureLatencyActivity(ILogger<MeasureLatencyActivity> logger)
    : WorkflowActivity<string, DateTimeOffset>
{
    public override Task<DateTimeOffset> RunAsync(WorkflowActivityContext context, string _)
    {
        var now = DateTimeOffset.UtcNow;
        LogTick(logger, now);
        return Task.FromResult(now);
    }

    [LoggerMessage(LogLevel.Information, "MeasureLatencyActivity tick: {Now:o}")]
    partial void LogTick(ILogger logger, DateTimeOffset Now);
}
