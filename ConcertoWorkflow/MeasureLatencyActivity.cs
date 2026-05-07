using System;
using Dapr.Workflow;

public sealed partial class MeasureLatencyActivity()
    : WorkflowActivity<string, DateTimeOffset>
{
    public override Task<DateTimeOffset> RunAsync(WorkflowActivityContext context, string _)
    {
        var now = DateTimeOffset.UtcNow;
        return Task.FromResult(now);
    }
}
