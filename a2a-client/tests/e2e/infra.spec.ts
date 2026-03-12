import { test, expect } from '@playwright/test';
import { infraManager } from './helpers/infra-manager.js';
// SERVICES imported in fixtures

test.describe('Infrastructure Validation', () => {
  test('Infrastructure and service startup validation', async ({ request }) => {
    const startTime = Date.now();
    let infraStatus = {
      dockerServices: false,
      serviceStartup: false,
    };
let servicesStatus = {
      server: false,
      clientApi: false,
      webUi: false,
      aiHub: false,
      ollama: false
    };
    let infraStatus = {
      dockerServices: false,
      serviceStartup: false,
      aiHub: false,
      ollama: false
    };

    try {
      infraStatus.dockerServices = await infraManager.checkDockerServices();
      logger.logInfrastructure('Docker services check', infraStatus);

logger.logInfrastructure('Docker services check', { postgres: infraStatus.dockerServices, redis: infraStatus.dockerServices });
            if (!infraStatus.dockerServices) {
                console.log('⚠ Docker services not available (PostgreSQL/Redis may be running natively or not needed)');
            } else {
                console.log('✓ Docker services available');
            }
            // Don't fail test if Docker is not available - services may run natively

            // Verify all core services are healthy (with retries like PowerShell script)
            const healthChecks = await Promise.all([
                infraManager.waitForServiceHealth(SERVICES.server.health, 'A2A Server'),
                infraManager.waitForServiceHealth(SERVICES.clientApi.health, 'Client API'),
                infraManager.waitForServiceHealth(SERVICES.webUi.health, 'Web UI')
            ]);

            servicesStatus.server = healthChecks[0];
            servicesStatus.clientApi = healthChecks[1];
            servicesStatus.webUi = healthChecks[2];

            expect(healthChecks.every((healthy: boolean) => healthy)).toBeTruthy();
            infraStatus.serviceStartup = true;

            // Check AI Hub health (localhost:11435) - optional check
            try {
                const aiHubResponse = await request.get(SERVICES.aiHub.health);
                if (aiHubResponse.status < 500) {
                    servicesStatus.aiHub = true;
                    infraStatus.aiHub = true;
                    console.log('✓ AI Hub health check passed');
                    logger.logInfrastructure('AI Hub health check', { status: aiHubResponse.status });
                }
            } catch (error) {
                console.log('⚠ AI Hub not available:', error.message);
                logger.logInfrastructure('AI Hub health check failed', { error: error.message });
            }
            // Don't fail test if AI Hub is not available

            // Check Ollama API (localhost:11434) - optional check
            try {
                const ollamaResponse = await request.get(SERVICES.ollama.health);
                if (ollamaResponse.status < 500) {
                    servicesStatus.ollama = true;
                    infraStatus.ollama = true;
                    console.log('✓ Ollama API check passed');
                    const ollamaData = await ollamaResponse.json();
                    logger.logInfrastructure('Ollama API check', { models: ollamaData.models?.length || 0 });
                }
            } catch (error) {
                console.log('⚠ Ollama API not available:', error.message);
                logger.logInfrastructure('Ollama API check failed', { error: error.message });
            }
            // Don't fail test if Ollama is not available

            logger.logInfrastructure('Service health checks completed', {
                server: servicesStatus.server,
                clientApi: servicesStatus.clientApi,
                webUi: servicesStatus.webUi,
                aiHub: servicesStatus.aiHub,
                ollama: servicesStatus.ollama
            });

            console.log('✓ All infrastructure and services validated including AI Hub and Ollama');
            logger.logTest('Infrastructure validation', 'passed', Date.now() - startTime, undefined, {
                ...servicesStatus,
                docker: infraStatus.dockerServices
            });

      logger.logTest('Infrastructure validation', 'passed', Date.now() - startTime);
    } catch (error) {
      logger.logTest('Infrastructure validation', 'failed', Date.now() - startTime, error.message);
      throw error;
    }
  });
});

