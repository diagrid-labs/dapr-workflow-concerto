using Microsoft.Extensions.Logging;
using Dapr.Workflow;

public sealed partial class SendInstanceIdActivity(ILogger<SendInstanceIdActivity> logger, HttpClient httpClient) : WorkflowActivity<string, bool>
{
    public override async Task<bool> RunAsync(WorkflowActivityContext context, string instanceId)
    {
        LogInstanceIdSend(logger, instanceId);
        var response = await httpClient.PostAsJsonAsync("/sendinstanceid", instanceId);
        return response.IsSuccessStatusCode;
    }

    [LoggerMessage(LogLevel.Information, "SendInstanceIdActivity: {InstanceId}")]
    partial void LogInstanceIdSend(ILogger logger, string InstanceId);
}
