# SSE Workflow Application

A .NET minimal API application that demonstrates Server-Sent Events (SSE) with real-time event broadcasting to a web frontend.

## Overview

This application receives POST requests containing event data and broadcasts them in real-time to connected web clients using Server-Sent Events (SSE). The frontend displays incoming events in a live-updating list with newest messages appearing on top.

## Architecture

```
┌─────────────┐         ┌──────────────────────┐         ┌─────────────┐
│   Browser   │         │   .NET API (5000)    │         │  SSE (5500) │
│  (Client)   │────POST /start───>│                │         │             │
│             │         │  Validates & Broadcasts ────────>│  /sse       │
│             │<────────SSE Stream──────────────────────────│             │
│   Display   │         │                      │         │             │
└─────────────┘         └──────────────────────┘         └─────────────┘
```

## Features

- ✅ .NET 9 minimal API with ASP.NET Core
- ✅ Server-Sent Events (SSE) real-time communication
- ✅ Event broadcasting to multiple connected clients
- ✅ Modern, responsive web UI
- ✅ Event type categorization (info, success, warning, error)
- ✅ Automatic reconnection handling
- ✅ CORS enabled for development
- ✅ No external dependencies required

## Project Structure

```
sse-workflow-dotnet/
├── Models/
│   └── EventInput.cs          # Input model for events
├── Services/
│   └── EventBroadcaster.cs    # SSE broadcasting service
├── wwwroot/
│   ├── index.html             # Frontend HTML
│   ├── styles.css             # Frontend styling
│   └── app.js                 # Frontend JavaScript
├── Properties/
│   └── launchSettings.json    # Launch configuration
├── Program.cs                 # Main application entry point
├── local.http                 # HTTP test requests
├── appsettings.json           # Application settings
└── README.md                  # This file
```

## Prerequisites

- .NET 9.0 SDK or later
- Modern web browser with EventSource support

## Getting Started

### 1. Run the Application

```powershell
dotnet run
```

The application will start on two ports:
- `http://localhost:5000` - Main API endpoint
- `http://localhost:5500` - SSE endpoint

### 2. Open the Frontend

Open your browser and navigate to:
```
http://localhost:5000
```

The page will automatically connect to the SSE stream at `http://localhost:5500/sse`

### 3. Send Events

Use the VSCode REST Client extension with the `local.http` file or use any HTTP client:

```bash
# Using curl
curl -X POST http://localhost:5000/start \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt-001",
    "timestamp": "2025-11-28T10:30:00Z",
    "type": "info",
    "message": "Test event message"
  }'
```

## API Endpoints

### POST /start

Accepts event data and broadcasts it to all connected SSE clients.

**Request Body:**
```json
{
  "id": "string",           // Required: Event identifier
  "timestamp": "datetime",  // Required: ISO 8601 timestamp
  "type": "string",        // Required: Event type (info, success, warning, error)
  "message": "string"      // Required: Event message
}
```

**Response:**
```json
{
  "success": true,
  "message": "Event broadcasted successfully"
}
```

**Status Codes:**
- `200 OK` - Event successfully broadcasted
- `400 Bad Request` - Invalid input data

### GET /sse

Server-Sent Events endpoint that maintains persistent connections and broadcasts events.

**Headers:**
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `Connection: keep-alive`

**Event Format:**
```
data: {"id":"evt-001","timestamp":"2025-11-28T10:30:00Z","type":"info","message":"Test message"}

```

## Event Types

The application supports different event types, each with distinct visual styling:

- **info** - Blue badge - General informational messages
- **success** - Green badge - Successful operations
- **warning** - Yellow badge - Warning messages
- **error** - Red badge - Error messages
- **connected** - Purple badge - System connection events

## Testing

### Using VSCode REST Client

1. Install the REST Client extension for VSCode
2. Open `local.http`
3. Click "Send Request" above any request

### Using PowerShell

```powershell
# Send a test event
Invoke-RestMethod -Uri "http://localhost:5000/start" `
  -Method POST `
  -ContentType "application/json" `
  -Body (@{
    id = "test-$(Get-Random)"
    timestamp = (Get-Date).ToString("o")
    type = "info"
    message = "Test from PowerShell"
  } | ConvertTo-Json)
```

## Development

### Key Components

**EventBroadcaster Service:**
- Singleton service managing SSE client connections
- Thread-safe client tracking using `ConcurrentBag`
- Broadcasts events to all connected clients

**Program.cs:**
- Configures Kestrel to listen on ports 5000 and 5500
- Implements `/start` endpoint for receiving events
- Implements `/sse` endpoint for SSE streaming
- CORS enabled for cross-origin requests

**Frontend (app.js):**
- Establishes EventSource connection to SSE endpoint
- Handles connection states (open, error, reconnect)
- Displays events in real-time with newest on top
- Provides visual feedback for connection status

## Troubleshooting

### Port Already in Use

If ports 5000 or 5500 are already in use, modify `Properties/launchSettings.json`:

```json
"applicationUrl": "http://localhost:5001;http://localhost:5501"
```

Also update the frontend connection in `wwwroot/app.js`:
```javascript
eventSource = new EventSource('http://localhost:5501/sse');
```

### CORS Issues

For production, update the CORS policy in `Program.cs` to restrict allowed origins:

```csharp
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("https://yourdomain.com")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});
```

### Connection Timeout

The SSE connection sends a keep-alive heartbeat every second. If connections are timing out, check firewall settings or reverse proxy configurations.

## Production Considerations

- [ ] Replace in-memory event broadcaster with Redis or similar for distributed scenarios
- [ ] Add authentication and authorization
- [ ] Implement event persistence (database)
- [ ] Add rate limiting on `/start` endpoint
- [ ] Configure HTTPS
- [ ] Restrict CORS to specific origins
- [ ] Add health check endpoints
- [ ] Implement structured logging
- [ ] Add metrics and monitoring

## License

This is a demonstration project for educational purposes.
