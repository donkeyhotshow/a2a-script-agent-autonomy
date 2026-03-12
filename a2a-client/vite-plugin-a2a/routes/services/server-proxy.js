/**
 * Server Proxy Service
 * Extracted from stepRoutes.js - handles a2a-server communication
 * Uses modern fetch + polling with configurable timeouts
 */

const A2A_SERVER_URL = process.env.A2A_SERVER_URL || 'http://localhost:3000';

/**
 * Server proxy service for a2a-server API calls
 */
export class ServerProxyService {
    baseUrl;

    constructor() {
        this.baseUrl = A2A_SERVER_URL;
    }

    /**
     * Send request to a2a-server /api/v1/requests
     * @param sessionId - session identifier
     * @param requestBody - request payload
     * @returns server response or null
     */
    async sendRequest(sessionId, requestBody) {
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/requests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-skip-auth': 'true'
                },
                body: JSON.stringify(requestBody)
            });

            return await response.json();
        } catch (error) {
            console.error('[ServerProxy] Request failed:', error.message);
            return null;
        }
    }

    /**
     * Poll promise result until completed or timeout
     * @param promiseId - promise ID from server
     * @param maxPolls - maximum poll attempts (default 10)
     * @param pollInterval - ms between polls (default 1000)
     * @returns poll result or null
     */
    async pollPromise(promiseId, maxPolls = 10, pollInterval = 1000) {
        for (let i = 0; i < maxPolls; i++) {
            try {
                await new Promise(resolve => setTimeout(resolve, pollInterval));
                
                const response = await fetch(`${this.baseUrl}/api/v1/requests/${promiseId}/result`, {
                    headers: { 'x-skip-auth': 'true' }
                });

                const data = await response.json();
                
                if (data.data?.status === 'completed') {
                    return data.data;
                }
            } catch (pollError) {
                console.error('[ServerProxy] Poll error:', pollError.message);
            }
        }
        
        return null;
    }

    /**
     * Send invoke request (alternative endpoint)
     * @param payload - invoke payload
     * @returns response or null
     */
    async invoke(payload) {
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/invoke`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            return response.ok ? await response.json() : null;
        } catch (error) {
            console.error('[ServerProxy] Invoke failed:', error.message);
            return null;
        }
    }

    /**
     * Full request + poll cycle (POST /steps pattern)
     * @param sessionId 
     * @param requestBody 
     * @returns {serverResponse, serverPromise} or null
     */
    async requestWithPolling(sessionId, requestBody) {
        const serverData = await this.sendRequest(sessionId, requestBody);
        
        if (!serverData) return null;

        if (serverData.data?.promiseId) {
            const serverPromise = {
                promiseId: serverData.data.promiseId,
                status: serverData.data.status || 'pending',
                pollUrl: serverData.data.pollUrl,
                submittedAt: new Date().toISOString()
            };

            const pollResult = await this.pollPromise(serverPromise.promiseId);
            
            if (pollResult) {
                return {
                    serverResponse: { ...pollResult },
                    serverPromise
                };
            }
            
            return { serverPromise };
        }

        return { serverResponse: serverData.data };
    }
}

// Singleton instance
export const serverProxy = new ServerProxyService();

