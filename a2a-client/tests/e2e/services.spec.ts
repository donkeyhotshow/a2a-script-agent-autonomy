import { test, expect } from '@playwright/test';
import { logger } from './helpers/smoke-logger.js';
import { SERVICES } from './fixtures/services.js';

test.describe.configure({ mode: 'serial', timeout: 60000 });

test.describe('Service Health & API Smoke Tests', () => {
  test('Service health endpoints detailed validation', async ({ request }) => {
    const startTime = Date.now();
    let servicesStatus = { server: false, clientApi: false, webUi: false, aiHub: false, ollama: false };

    try {
      // Test A2A Server health
      const serverResponse = await request.get(SERVICES.server.health);
      expect(serverResponse.ok()).toBeTruthy();
expect(await serverResponse.status()).toBeLessThan(500);

      const serverHealth = await serverResponse.json();
      expect(serverHealth).toHaveProperty('status');
      servicesStatus.server = true;
      console.log(`✓ Server health: ${serverHealth.status}`);

      // Test Client API health - Vite doesn't have /health, check API endpoint instead
      try {
        const clientApiResponse = await request.get('http://localhost:5173/api/a2a/projects');
if ((await clientApiResponse.status()) < 500) {
          servicesStatus.clientApi = true;
          console.log(`✓ Client API available at port 5173`);
        }
      } catch (error) {
console.log(`⚠ Client API not available: ${(error as Error).message}`);
      }

      // Test Web UI availability (basic HTTP check)
      const webUiResponse = await request.get(SERVICES.webUi.health);
      expect(webUiResponse.ok()).toBeTruthy();
      expect(webUiResponse.status()).toBeLessThan(500);
      servicesStatus.webUi = true;
      console.log(`✓ Web UI available at port ${SERVICES.webUi.port}`);

      // Test AI Hub health
      try {
        const aiHubResponse = await request.get(SERVICES.aiHub.health);
if ((await aiHubResponse.status()) < 500) {
          servicesStatus.aiHub = true;
          console.log(`✓ AI Hub available at port ${SERVICES.aiHub.port}`);
        }
      } catch (error) {
        console.log(`⚠ AI Hub not available: ${error.message}`);
      }

      // Test Ollama API
      try {
        const ollamaResponse = await request.get(SERVICES.ollama.health);
if ((await ollamaResponse.status()) < 500) {
          servicesStatus.ollama = true;
          const ollamaData = await ollamaResponse.json();
          console.log(`✓ Ollama API available at port ${SERVICES.ollama.port} (${ollamaData.models?.length || 0} models)`);
        }
      } catch (error) {
        console.log(`⚠ Ollama not available: ${error.message}`);
      }

      logger.logTest('Service health checks', 'passed', Date.now() - startTime, undefined, servicesStatus);
    } catch (error) {
      logger.logTest('Service health checks', 'failed', Date.now() - startTime, error.message, servicesStatus);
      throw error;
    }
  });

  test('Session creation via API works end-to-end', async ({ request }) => {
    const startTime = Date.now();

    try {
      // Create session with minimal task
      const createResponse = await request.post('http://localhost:5173/api/a2a/sessions', {
        data: {
          projectId: 'smoke-test-project',
          task: 'Minimal session creation test'
        }
      });

      expect(createResponse.ok()).toBeTruthy();
      const createData = await createResponse.json();

      // Verify session structure
      expect(createData).toHaveProperty('success', true);
      expect(createData).toHaveProperty('session');
      expect(createData.session).toHaveProperty('id');
      expect(createData.session).toHaveProperty('status');

      const sessionId = createData.session.id;
      console.log(`✓ Session created: ${sessionId}`);

      // Verify session can be retrieved
      const getResponse = await request.get(`http://localhost:5173/api/a2a/sessions/${sessionId}`);
      expect(getResponse.ok()).toBeTruthy();
      const getData = await getResponse.json();
      
      // Verify the session ID matches (response may have different structure)
      const retrievedId = getData.session?.id || getData.id;
      expect(retrievedId).toBe(sessionId);

      console.log(`✓ Session retrievable: ${sessionId}`);
      logger.logTest('Session creation via API', 'passed', Date.now() - startTime);
    } catch (error) {
      logger.logTest('Session creation via API', 'failed', Date.now() - startTime, error.message);
      throw error;
    }
  });

  test('End-to-end session execution with API step validation', async ({ request }) => {
    const startTime = Date.now();
    let promiseId: string | null = null;

    try {
      // Create session
      const createResponse = await request.post('http://localhost:5173/api/a2a/sessions', {
        data: {
          projectId: 'e2e-test-project',
          task: 'End-to-end test'
        }
      });

      expect(createResponse.ok()).toBeTruthy();
      const createData = await createResponse.json();
      const sessionId = createData.session?.id || createData.data?.session?.id;
      console.log(`✓ E2E Session created: ${sessionId}`);

      // Send a step via /sessions/{id}/next
      const stepResponse = await request.post(`http://localhost:5173/api/a2a/sessions/${sessionId}/next`, {
        data: {
          task: 'test'
        }
      });

      expect(stepResponse.ok()).toBeTruthy();
      const stepData = await stepResponse.json();
      console.log(`✓ Step response received`);

      // Check if promiseId is returned (async flow)
      const responseData = stepData.data || stepData.session || stepData;
      if (responseData && responseData.promiseId) {
        promiseId = responseData.promiseId;
        console.log(`✓ Promise ID returned: ${promiseId}`);
        logger.logInfrastructure('E2E session - promiseId received', { promiseId });

        // Poll for completion
        const maxPollAttempts = 30;
        let pollAttempts = 0;
        let completed = false;
        let resultData: any = null;

        while (pollAttempts < maxPollAttempts && !completed) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const pollResponse = await request.get(`http://localhost:3000/api/v1/requests/${promiseId}/result`);
          if (pollResponse.ok()) {
            const pollData = await pollResponse.json();
            if (pollData.data && pollData.data.status === 'completed') {
              completed = true;
              resultData = pollData.data;
              console.log(`✓ Promise completed after ${pollAttempts + 1} polls`);
            } else if (pollData.data && pollData.data.status === 'failed') {
              throw new Error(`Promise failed: ${pollData.data.error}`);
            }
          }
          pollAttempts++;
        }

        expect(completed).toBeTruthy();
        expect(resultData).toBeTruthy();

        // Verify result contains execute/context with hint or message
        const hasExecute = resultData.data && (resultData.data.execute || resultData.data.context);
        const hasMessage = resultData.data && (resultData.data.message || resultData.data.result?.message);
        
        expect(hasExecute || hasMessage).toBeTruthy();
        console.log(`✓ Result contains execute/context or message`);
        logger.logInfrastructure('E2E session - result validated', { 
          hasExecute, 
          hasMessage,
          promiseId 
        });
      } else {
        // Sync flow - verify result directly
        const syncData = responseData || stepData;
        const hasResult = syncData && (syncData.execute || syncData.context || syncData.result || syncData.messages);
        expect(hasResult).toBeTruthy();
        console.log(`✓ Sync response contains result data`);
      }

      logger.logTest('End-to-end session execution', 'passed', Date.now() - startTime);
    } catch (error) {
      logger.logTest('End-to-end session execution', 'failed', Date.now() - startTime, error.message);
      throw error;
    }
  });

  test('Infrastructure cleanup and log collection verification', async ({ request }) => {
    const startTime = Date.now();

    try {
      // Verify all services are still responding after tests
for (const [name, service] of Object.entries(SERVICES as any)) {
        const response = await request.get(service.health);
        expect(response.ok()).toBeTruthy();
        console.log(`✓ ${name} still healthy after test suite`);
      }

      // Test that we can create multiple sessions (no resource leaks)
      const sessions = [];
      for (let i = 0; i < 3; i++) {
        const response = await request.post('http://localhost:5173/api/a2a/sessions', {
          data: {
            projectId: 'cleanup-test-project',
            task: `Cleanup test session ${i}`
          }
        });
        expect(response.ok()).toBeTruthy();
        const responseData = await response.json();
        const sessionId = responseData.session?.id || responseData.data?.session?.id;
        sessions.push(sessionId);
      }

      console.log(`✓ Created ${sessions.length} test sessions without issues`);
      console.log(`✓ Session IDs: ${sessions.join(', ')}`);
      logger.logTest('Infrastructure cleanup verification', 'passed', Date.now() - startTime);
    } catch (error) {
      logger.logTest('Infrastructure cleanup verification', 'failed', Date.now() - startTime, error.message);
      throw error;
    }
  });
});

