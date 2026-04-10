/**
 * Infrastructure Manager for smoke tests
 */

import { execSync } from 'child_process';

export class InfrastructureManager {
  private processes: any[] = [];

  async checkDockerServices(): Promise<boolean> {
    try {
      const output = execSync('docker ps --format "{{.Names}}"', { encoding: 'utf8' }).toString();
      const services = output.trim().split('\n').filter((name: string) => name);
      const hasPostgres = services.some((name: string) => name.includes('postgres'));
      const hasRedis = services.some((name: string) => name.includes('redis'));
      console.log(`Docker services found: postgres=${hasPostgres}, redis=${hasRedis}`);
      return hasPostgres && hasRedis;
    } catch (error) {
      console.warn('Docker check failed:', error.message);
      return false;
    }
  }

  async waitForServiceHealth(url: string, serviceName: string, timeoutMs: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await fetch(url);
        if (response.status < 500) {
          console.log(`✓ ${serviceName} health check passed`);
          return true;
        }
      } catch (error: any) {
        // Continue trying
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    console.error(`✗ ${serviceName} health check failed after ${timeoutMs}ms`);
    return false;
  }


  cleanup() {
    this.processes.forEach(proc => {
      try {
        if (proc && !proc.killed) {
          proc.kill();
        }
      } catch (error) {
        console.warn('Failed to cleanup process:', error);
      }
    });
    this.processes = [];
  }
}

export const infraManager = new InfrastructureManager();

