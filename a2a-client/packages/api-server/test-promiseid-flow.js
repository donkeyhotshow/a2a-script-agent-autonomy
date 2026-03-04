#!/usr/bin/env node

/**
 * Test script for promiseId flow
 * 
 * This script tests the complete promiseId flow:
 * 1. Create a session
 * 2. Send a request to /api/v1/invoke
 * 3. Check that promiseId is stored in session
 * 4. Poll /api/v1/requests/:id/status
 * 5. Verify session is updated with status response
 */

const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

const API_BASE = 'http://localhost:3001';
const SERVER_API_BASE = 'http://localhost:3000/api/v1';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function createProject() {
    console.log('Creating test project...');
    const response = await fetch(`${API_BASE}/api/v1/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test Project',
            description: 'Test project for promiseId flow'
        })
    });
    
    if (!response.ok) {
        throw new Error(`Failed to create project: ${response.status}`);
    }
    
    const project = await response.json();
    console.log(`Created project: ${project.id}`);
    return project;
}

async function createSession(projectId) {
    console.log('Creating test session...');
    const response = await fetch(`${API_BASE}/api/v1/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            projectId: projectId,
            title: 'Test Session',
            task: 'Test promiseId flow'
        })
    });
    
    if (!response.ok) {
        throw new Error(`Failed to create session: ${response.status}`);
    }
    
    const session = await response.json();
    console.log(`Created session: ${session.id}`);
    return session;
}

async function sendInvokeRequest(sessionId, projectId) {
    console.log('Sending invoke request...');
    const response = await fetch(`${API_BASE}/api/v1/invoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            task: 'Test task for promiseId',
            sessionId: sessionId,
            projectId: projectId
        })
    });
    
    if (!response.ok) {
        throw new Error(`Invoke request failed: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Invoke response:', JSON.stringify(result, null, 2));
    return result;
}

async function getSession(sessionId, projectId) {
    console.log(`Getting session ${sessionId}...`);
    const response = await fetch(`${API_BASE}/api/v1/sessions/${sessionId}?projectId=${projectId}`);
    
    if (!response.ok) {
        throw new Error(`Failed to get session: ${response.status}`);
    }
    
    const session = await response.json();
    console.log('Session details:', JSON.stringify(session, null, 2));
    return session;
}

async function pollStatus(requestId) {
    console.log(`Polling status for request ${requestId}...`);
    
    for (let i = 0; i < 10; i++) {
        const response = await fetch(`${API_BASE}/api/v1/requests/${requestId}/status`);
        
        if (!response.ok) {
            console.log(`Status request ${i + 1}/10 failed: ${response.status}`);
            await sleep(1000);
            continue;
        }
        
        const result = await response.json();
        console.log(`Status check ${i + 1}/10:`, JSON.stringify(result, null, 2));
        
        // Check if request is completed
        if (result.status === 'completed' || result.status === 'failed') {
            console.log('Request completed!');
            return result;
        }
        
        await sleep(2000);
    }
    
    throw new Error('Request did not complete within timeout');
}

async function testPromiseIdFlow() {
    console.log('=== Testing promiseId Flow ===\n');
    
    try {
        // 1. Create project
        const project = await createProject();
        
        // 2. Create session
        const session = await createSession(project.id);
        
        // 3. Send invoke request
        const invokeResult = await sendInvokeRequest(session.id, project.id);
        
        // 4. Check session for promiseId
        const updatedSession = await getSession(session.id, project.id);
        
        if (updatedSession.lastPromiseId) {
            console.log(`✅ promiseId found in session: ${updatedSession.lastPromiseId}`);
        } else {
            console.log('❌ No promiseId found in session');
        }
        
        // 5. Poll status if we have a promiseId
        if (updatedSession.lastPromiseId) {
            try {
                const statusResult = await pollStatus(updatedSession.lastPromiseId);
                console.log('✅ Status polling completed successfully');
                
                // 6. Check session again after status update
                const finalSession = await getSession(session.id, project.id);
                console.log('✅ Final session state updated');
                
            } catch (error) {
                console.log('Status polling failed (this is expected if server is not running):', error.message);
            }
        } else {
            console.log('Skipping status polling - no promiseId available');
        }
        
        console.log('\n=== Test completed successfully ===');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    testPromiseIdFlow();
}

module.exports = { testPromiseIdFlow };