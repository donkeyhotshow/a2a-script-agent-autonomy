// Test script for Terminal WebSocket
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000/api/sessions/test-session/terminal');

ws.on('open', function open() {
    console.log('Connected to terminal WebSocket');
    
    // Send ping
    ws.send(JSON.stringify({ type: 'ping' }));
    
    // Send a command after 1 second
    setTimeout(() => {
        ws.send(JSON.stringify({ type: 'command', payload: 'help' }));
    }, 1000);
    
    // Close after 3 seconds
    setTimeout(() => {
        ws.close();
        console.log('Connection closed');
        process.exit(0);
    }, 3000);
});

ws.on('message', function incoming(data) {
    console.log('Received:', data.toString());
});

ws.on('error', function error(err) {
    console.error('WebSocket error:', err.message);
    process.exit(1);
});
