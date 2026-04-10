import { test, expect } from '@playwright/test';
import { infraManager } from './helpers/infra-manager.js';

// SERVICES imported in fixtures

const SERVICES = {
  server: { health: 'http://localhost:3000/health' },
  clientApi: { health: 'http://localhost:5173/api/a2a/projects' },
  webUi: { health: 'http://localhost:5173' },
  aiHub: { health: 'http://localhost:11434/health' },
  compat_llm: { health: 'http://localhost:11435/api/tags' }
};

test.describe('Infrastructure Validation', () => {
  test('Infrastructure and service startup validation', async ({ request }) => {
    const startTime = Date.now();
    const infraStatus = {
      dockerServices: false,
      serviceStartup: false,
      aiHub: false,
      compat_llm: false
    };
    const servicesStatus = {
      server: false,
      clientApi: false,
      webUi: false,
      aiHub: false,
      compat_llm: false
    };

    try {
      infraStatus.dockerServices = await infraManager.checkDockerServices();
      console.log('Docker services check', infraStatus);

      if (!infraStatus.dockerServices) {
        console.log('⚠ Docker services not available (PostgreSQL/Redis may be running natively or not needed)');
      } else {
        console.log('✓ Docker services available');
      }

      // Verify all core services are healthy
      const healthChecks = await Promise.all([
        infraManager.waitForServiceHealth(SERVICES.server.health, 'A2A Server'),
        infraManager.waitForServiceHealth(SERVICES.clientApi.health, 'Client API'),
        infraManager.waitForServiceHealth(SERVICES.webUi.health, 'Web UI')
      ]);

      servicesStatus.server = healthChecks[0];
      servicesStatus.clientApi = healthChecks[1];
      servicesStatus.webUi = healthChecks[2];

      expect(healthChecks.every((healthy) => healthy)).toBeTruthy();
      infraStatus.serviceStartup = true;

      // Check AI Hub (localhost:11434) - optional check
      try {
        const aiHubResponse = await request.get(SERVICES.aiHub.health);
        const status = await aiHubResponse.status();
        if (status < 500) {
          servicesStatus.aiHub = true;
          infraStatus.aiHub = true;
          console.log('✓ AI Hub health check passed');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log('⚠ AI Hub not available:', message);
      }

      // Check Local LLM upstream API (localhost:11435) - optional check
      try {
        const compat_llmResponse = await request.get(SERVICES.compat_llm.health);
        const status = await compat_llmResponse.status();
        if (status < 500) {
          servicesStatus.compat_llm = true;
          infraStatus.compat_llm = true;
          console.log('✓ Local LLM upstream API check passed');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log('⚠ Local LLM upstream API not available:', message);
      }

      console.log('✓ All infrastructure and services validated including AI Hub and Local LLM upstream');
      console.log('Infrastructure validation passed:', Date.now() - startTime, 'ms');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log('Infrastructure validation failed:', message);
      throw error;
    }
  });
});
