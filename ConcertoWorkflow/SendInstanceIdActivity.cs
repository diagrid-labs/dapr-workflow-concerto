using Dapr.Workflow;

public class SendInstanceIdActivity : WorkflowActivity<string, bool>
{
    private readonly HttpClient _httpClient;

    public SendInstanceIdActivity(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public override async Task<bool> RunAsync(WorkflowActivityContext context, string instanceId)
    {
        Console.WriteLine($"SendInstanceIdActivity: {instanceId}");
        var response = await _httpClient.PostAsJsonAsync("/sendinstanceid", instanceId);
        return response.IsSuccessStatusCode;
    }
}
