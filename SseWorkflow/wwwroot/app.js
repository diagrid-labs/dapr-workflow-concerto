// SSE Event Monitor Application
(function() {
    'use strict';

    // DOM Elements
    const connectionStatus = document.getElementById('connection-status');
    const errorMessage = document.getElementById('error-message');
    const eventsContainer = document.getElementById('events-container');
    const clearEventsBtn = document.getElementById('clear-events');

    // EventSource instance
    let eventSource = null;

    // Audio context for sound playback
    let audioContext = null;

    // Initialize the application
    function init() {
        connectToSSE();
        setupEventListeners();
        initAudioContext();
    }

    // Initialize audio context (requires user interaction)
    function initAudioContext() {
        // Audio context is created on first user interaction
        document.addEventListener('click', () => {
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
        }, { once: true });
    }

    // Connect to SSE endpoint
    function connectToSSE() {
        try {
            updateConnectionStatus('connecting');
            
            eventSource = new EventSource('http://localhost:5500/sse');

            eventSource.onopen = handleConnectionOpen;
            eventSource.onerror = handleConnectionError;
            eventSource.onmessage = handleMessage;

        } catch (error) {
            console.error('Failed to create EventSource:', error);
            showError('Failed to connect to SSE endpoint: ' + error.message);
            updateConnectionStatus('disconnected');
        }
    }

    // Handle successful connection
    function handleConnectionOpen() {
        console.log('SSE connection established');
        updateConnectionStatus('connected');
        hideError();
    }

    // Handle connection errors
    function handleConnectionError(error) {
        console.error('SSE connection error:', error);
        updateConnectionStatus('disconnected');
        showError('Connection to SSE endpoint lost. Attempting to reconnect...');

        // EventSource will automatically attempt to reconnect
    }

    // Handle incoming messages
    function handleMessage(event) {
        try {
            const data = JSON.parse(event.data);
            console.log('Received event:', data);
            addEventToUI(data);
            playEventSound(data.type);
        } catch (error) {
            console.error('Failed to parse event data:', error);
            showError('Received malformed event data');
        }
    }

    // Add event to UI
    function addEventToUI(eventData) {
        // Remove "no events" message if present
        const noEvents = eventsContainer.querySelector('.no-events');
        if (noEvents) {
            noEvents.remove();
        }

        // Create event element
        const eventElement = createEventElement(eventData);

        // Prepend to container (newest on top)
        eventsContainer.insertBefore(eventElement, eventsContainer.firstChild);
    }

    // Create event DOM element
    function createEventElement(data) {
        const eventDiv = document.createElement('div');
        eventDiv.className = 'event-item';

        const eventType = data.type || 'info';
        const timestamp = data.timestamp ? formatTimestamp(data.timestamp) : new Date().toLocaleString();
        const id = data.id || 'N/A';
        const message = data.message || 'No message';

        eventDiv.innerHTML = `
            <div class="event-header">
                <span class="event-type ${eventType.toLowerCase()}">${escapeHtml(eventType)}</span>
                <span class="event-timestamp">${escapeHtml(timestamp)}</span>
            </div>
            <div class="event-id">ID: ${escapeHtml(id)}</div>
            <div class="event-message">${escapeHtml(message)}</div>
        `;

        return eventDiv;
    }

    // Format timestamp
    function formatTimestamp(timestamp) {
        try {
            const date = new Date(timestamp);
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch (error) {
            return timestamp;
        }
    }

    // Update connection status
    function updateConnectionStatus(status) {
        connectionStatus.className = 'status ' + status;
        
        switch(status) {
            case 'connected':
                connectionStatus.textContent = 'Connected';
                break;
            case 'disconnected':
                connectionStatus.textContent = 'Disconnected';
                break;
            case 'connecting':
                connectionStatus.textContent = 'Connecting...';
                break;
            default:
                connectionStatus.textContent = 'Unknown';
        }
    }

    // Show error message
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }

    // Hide error message
    function hideError() {
        errorMessage.classList.add('hidden');
        errorMessage.textContent = '';
    }

    // Clear all events
    function clearEvents() {
        eventsContainer.innerHTML = `
            <div class="no-events">
                <p>Waiting for events...</p>
                <p class="hint">Send a POST request to <code>http://localhost:5000/start</code> to generate events</p>
            </div>
        `;
    }

    // Setup event listeners
    function setupEventListeners() {
        clearEventsBtn.addEventListener('click', clearEvents);

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            if (eventSource) {
                eventSource.close();
            }
        });
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Play sound based on event type using Web Audio API
    function playEventSound(eventType) {
        if (!audioContext) {
            // Audio context not initialized yet (user hasn't interacted)
            return;
        }

        const now = audioContext.currentTime;

        switch(eventType?.toLowerCase()) {
            case 'info':
                playBeep(440, now, 0.15);
                break;
            case 'success':
                playAscendingChime(now);
                break;
            case 'error':
                playDescendingAlert(now);
                break;
            case 'warning':
                playTripleBeep(now);
                break;
            case 'connected':
                // Don't play sound for connection events
                break;
            default:
                // Default sound for unknown types
                playBeep(440, now, 0.15);
        }
    }

    // Play a single beep at given frequency
    function playBeep(frequency, startTime, duration) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        // Envelope for smoother sound
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    }

    // Play ascending chime (440 Hz → 880 Hz)
    function playAscendingChime(startTime) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, startTime);
        oscillator.frequency.exponentialRampToValueAtTime(880, startTime + 0.3);

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

        oscillator.start(startTime);
        oscillator.stop(startTime + 0.3);
    }

    // Play descending alert (880 Hz → 220 Hz)
    function playDescendingAlert(startTime) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, startTime);
        oscillator.frequency.exponentialRampToValueAtTime(220, startTime + 0.4);

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

        oscillator.start(startTime);
        oscillator.stop(startTime + 0.4);
    }

    // Play three quick beeps (440 Hz)
    function playTripleBeep(startTime) {
        playBeep(440, startTime, 0.05);
        playBeep(440, startTime + 0.1, 0.05);
        playBeep(440, startTime + 0.2, 0.05);
    }

    // Start the application when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
