#!/bin/bash

# Create session
response=$(curl -s -X POST http://localhost:5173/api/a2a/sessions -H "Content-Type: application/json" -d '{"mode": "dialog", "task": "Echo '\''System validation complete'\'' to confirm the stack is operational."}')
echo "Create response: $response"

# Extract session id
id=$(echo "$response" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
if [ -z "$id" ]; then
    echo "Failed to get session id"
    exit 1
fi
echo "Session id: $id"

# Call POST /next with result message
next_response=$(curl -s -X POST http://localhost:5173/api/a2a/sessions/$id/next -H "Content-Type: application/json" -d '{"result": {"message": "Echo '\''System validation complete'\'' to confirm the stack is operational."}}')
echo "Next response: $next_response"

# Poll GET /async until not processing
while true; do
    async_response=$(curl -s http://localhost:5173/api/a2a/sessions/$id/async)
    echo "Async response: $async_response"
    status=$(echo "$async_response" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
    if [ "$status" != "processing" ]; then
        break
    fi
    sleep 2
done

# Get final session state
session_response=$(curl -s http://localhost:5173/api/a2a/sessions/$id)
echo "Final session: $session_response"

# Check for expected output in result
result=$(echo "$session_response" | grep -o '"result":{[^}]*}' | cut -d'{' -f2-)
if echo "$result" | grep -q "System validation complete"; then
    echo "Verification: Expected output found in result - stack operational"
else
    echo "Verification: Expected output not found in result"
fi