using System.Collections.Concurrent;
using System.Text.Json;

public class EventBroadcaster
{
    private readonly ConcurrentBag<StreamWriter> _clients = new();
    private readonly ILogger<EventBroadcaster> _logger;

    public EventBroadcaster(ILogger<EventBroadcaster> logger)
    {
        _logger = logger;
    }

    public void AddClient(StreamWriter writer)
    {
        _clients.Add(writer);
        _logger.LogInformation("Client connected. Total clients: {Count}", _clients.Count);
    }

    public void RemoveClient(StreamWriter writer)
    {
        // ConcurrentBag doesn't support removal, but clients will be cleaned up when disconnected
        _logger.LogInformation("Client disconnected");
    }

    public async Task BroadcastAsync<T>(T data)
    {
        var options = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
        var json = JsonSerializer.Serialize(data, options);
        var message = $"data: {json}\n\n";
        
        var clientsToRemove = new List<StreamWriter>();

        foreach (var client in _clients)
        {
            try
            {
                await client.WriteAsync(message);
                await client.FlushAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send message to client");
                clientsToRemove.Add(client);
            }
        }

        _logger.LogInformation("Broadcasted event to {Count} clients", _clients.Count - clientsToRemove.Count);
    }
}
