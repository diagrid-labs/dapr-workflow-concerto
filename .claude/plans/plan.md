# SSE Workflow Application - Implementation Plan

## Project Overview
Create a .NET minimal API application that receives POST requests and forwards events via Server-Sent Events (SSE) to a front-end application. The front-end listens to SSE events and displays them in a list with newest messages on top.

## Architecture

```
Client (Browser)          .NET API (localhost:5000)          SSE Endpoint (localhost:5500/sse)
     |                              |                                    |
     |--POST /start (with data)---->|                                    |
     |                              |----SSE Event-------------------->  |
     |                              |                                    |
     |<--------------SSE Stream (listening to localhost:5500/sse)--------|
     |                              |                                    |
   Display                                                               |
```

## Components

### 1. Backend - .NET Minimal API (localhost:5000)

#### 1.1 Input Model
Create a C# record/class to represent the input object:
- `Id` (string or Guid)
- `Timestamp` (DateTime)
- `Type` (string)
- `Message` (string)

#### 1.2 API Endpoints
- **POST /start**: Accepts the input object and forwards it as SSE to localhost:5500/sse
  - Validates input
  - Sends data to SSE endpoint
  - Returns success/error response

#### 1.3 SSE Client
- Implement HttpClient to send SSE-formatted data to localhost:5500/sse
- Handle connection errors gracefully
- Format data according to SSE protocol

#### 1.4 Configuration
- Configure Kestrel to run on localhost:5000
- Add CORS policy to allow front-end access
- Configure HttpClient for SSE endpoint communication

### 2. Backend - SSE Server Endpoint (localhost:5500)

#### 2.1 SSE Endpoint
- **GET /sse**: Maintains persistent connections and broadcasts events to all connected clients
  - Set proper SSE headers (`Content-Type: text/event-stream`, `Cache-Control: no-cache`)
  - Keep connections alive
  - Broadcast events to all connected clients
  - Handle client disconnections

#### 2.2 Event Broadcasting
- Implement an in-memory event broadcaster/manager
- Track connected clients
- Format messages according to SSE protocol:
  ```
  data: {json payload}
  
  ```

### 3. Frontend Application

#### 3.1 HTML Structure (index.html)
- Page title and header
- Event list container (`<ul>` or `<div>`)
- Connection status indicator
- Error message display area

#### 3.2 CSS Styling (styles.css)
- Clean, modern design
- Event list styling with:
  - Clear separation between events
  - Timestamp display
  - Event type badges/labels
  - Message content
  - Responsive layout
- Color coding for different event types
- Animation for new messages appearing

#### 3.3 JavaScript (app.js)
- **EventSource Setup**:
  - Connect to `http://localhost:5500/sse`
  - Handle connection states (open, error, close)
  
- **Event Handling**:
  - Listen for incoming SSE messages
  - Parse JSON payload
  - Create DOM elements for each event
  - Prepend new events to the list (newest on top)
  
- **UI Updates**:
  - Display connection status
  - Show error messages
  - Format timestamps
  - Apply styling based on event type

- **Error Handling**:
  - Reconnection logic
  - Display connection errors
  - Handle malformed data

## Implementation Steps

### Phase 1: Setup Project Structure
1. Create new .NET minimal API project
2. Configure project to run on localhost:5000
3. Create folder structure:
   ```
   /
   ├── Program.cs
   ├── Models/
   │   └── EventInput.cs
   ├── Services/
   │   └── EventBroadcaster.cs
   ├── wwwroot/
   │   ├── index.html
   │   ├── styles.css
   │   └── app.js
   ├── local.http
   └── AGENTS.md
   ```

### Phase 2: Backend Development
1. **Create EventInput Model**
   - Define properties: Id, Timestamp, Type, Message
   - Add validation attributes

2. **Implement EventBroadcaster Service**
   - Singleton service to manage SSE connections
   - Methods to add/remove clients
   - Method to broadcast events to all clients

3. **Create POST /start Endpoint**
   - Accept EventInput object
   - Validate input
   - Send to SSE endpoint (localhost:5500/sse) using HttpClient
   - Return appropriate response

4. **Create GET /sse Endpoint**
   - Set SSE headers
   - Register client connection
   - Keep connection alive
   - Send events when received
   - Handle disconnections

5. **Configure Services**
   - Add CORS
   - Configure static files serving
   - Register EventBroadcaster as singleton
   - Configure HttpClient

### Phase 3: Frontend Development
1. **Create HTML Structure**
   - Basic page layout
   - Event list container
   - Connection status display

2. **Style with CSS**
   - Modern, clean design
   - Responsive layout
   - Event card styling
   - Status indicators

3. **Implement JavaScript Logic**
   - Initialize EventSource connection
   - Handle incoming events
   - Update DOM with new events
   - Display connection status
   - Format timestamps and data

### Phase 4: Testing
1. **Create local.http file**
   - Add POST /start test requests
   - Include sample data

2. **Test Scenarios**
   - Single event submission
   - Multiple rapid events
   - Different event types
   - Connection interruptions
   - Browser refresh handling
   - Multiple clients simultaneously

### Phase 5: Documentation
1. Update README with:
   - Project description
   - How to run
   - API documentation
   - Architecture diagram

## Technical Details

### SSE Message Format
```
data: {"id":"123","timestamp":"2025-11-28T10:00:00Z","type":"info","message":"Test message"}

```

### CORS Configuration
Allow all origins for development (restrict in production):
```csharp
builder.Services.AddCors(options => {
    options.AddDefaultPolicy(policy => {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});
```

### Event Broadcaster Pattern
- Use `AsyncLocal<StreamWriter>` or `ConcurrentBag` to track clients
- Thread-safe operations for adding/removing clients
- Async broadcasting to all clients

### Front-end EventSource
```javascript
const eventSource = new EventSource('http://localhost:5500/sse');
eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // Handle event
};
```

## Potential Enhancements
- Add event filtering by type
- Implement event search
- Add pagination for event history
- Persist events to database
- Add authentication/authorization
- Implement heartbeat/keep-alive mechanism
- Add reconnection with exponential backoff
- Display event statistics

## Dependencies
- .NET 9.0 SDK
- No additional NuGet packages required (use built-in HttpClient, SSE support)
- Modern web browser with EventSource support

## Configuration Files

### appsettings.json
```json
{
  "Kestrel": {
    "Endpoints": {
      "Http": {
        "Url": "http://localhost:5000"
      }
    }
  },
  "SseEndpoint": "http://localhost:5500/sse"
}
```

## Success Criteria
- ✅ .NET API runs on localhost:5000
- ✅ POST /start endpoint accepts and validates input
- ✅ Events are successfully sent to localhost:5500/sse
- ✅ SSE endpoint on localhost:5500 broadcasts to connected clients
- ✅ Front-end displays events in real-time
- ✅ New events appear at the top of the list
- ✅ Connection status is visible
- ✅ Multiple clients can connect simultaneously
- ✅ Application handles errors gracefully
