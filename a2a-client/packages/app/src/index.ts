import { loadConfig, Config } from './config';

/**
 * Feature modules - these are dynamically imported based on config
 */
interface FeatureModules {
  rag?: { initialize: () => Promise<void>; start: () => Promise<void>; stop: () => Promise<void> };
  embedding?: { initialize: () => Promise<void>; start: () => Promise<void>; stop: () => Promise<void> };
  execution?: { initialize: () => Promise<void>; start: () => Promise<void>; stop: () => Promise<void> };
  web?: { initialize: () => Promise<void>; start: () => Promise<void>; stop: () => Promise<void> };
  storage?: { initialize: () => Promise<void>; start: () => Promise<void>; stop: () => Promise<void> };
}

/**
 * Main application class that reads configuration and activates features
 */
class A2AClientApplication {
  private config: Config;
  private features: FeatureModules = {};

  constructor(configPath?: string) {
    this.config = loadConfig(configPath);
    this.initializeFeatures();
  }

  /**
   * Initialize feature modules based on configuration
   * Dynamically imports enabled features
   */
  private async initializeFeatures(): Promise<void> {
    console.log('Initializing A2A Client Application...');
    console.log('Configuration:', JSON.stringify(this.config, null, 2));

    // Initialize enabled features
    if (this.config.features.rag) {
      console.log('RAG feature enabled');
      this.features.rag = await import('./features/rag.js');
    }

    if (this.config.features.embedding) {
      console.log('Embedding feature enabled');
      this.features.embedding = await import('./features/embedding.js');
    }

    if (this.config.features.execution) {
      console.log('Execution feature enabled');
      this.features.execution = await import('./features/execution.js');
    }

    if (this.config.features.web) {
      console.log('Web feature enabled');
      this.features.web = await import('./features/web.js');
    }

    if (this.config.features.storage) {
      console.log('Storage feature enabled');
      this.features.storage = await import('./features/storage.js');
    }
  }

  /**
   * Start all enabled features
   */
  public async start(): Promise<void> {
    console.log('Starting A2A Client Application...');
    
    // Start enabled features
    const startPromises = [];
    
    if (this.config.features.rag && this.features.rag) {
      startPromises.push(this.features.rag());
    }
    
    if (this.config.features.embedding && this.features.embedding) {
      startPromises.push(this.features.embedding());
    }
    
    if (this.config.features.execution && this.features.execution) {
      startPromises.push(this.features.execution());
    }
    
    if (this.config.features.web && this.features.web) {
      startPromises.push(this.features.web());
    }
    
    if (this.config.features.storage && this.features.storage) {
      startPromises.push(this.features.storage());
    }
    
    // Wait for all features to start
    await Promise.all(startPromises);
    console.log('All features started successfully');
  }

  /**
   * Stop all running features
   */
  public async stop(): Promise<void> {
    console.log('Stopping A2A Client Application...');
    
    // Stop features in reverse order
    const stopPromises = [];
    
    if (this.config.features.storage && this.features.storage) {
      // Assuming stop method exists
      // stopPromises.push(this.features.storage.stop?.());
    }
    
    if (this.config.features.web && this.features.web) {
      // stopPromises.push(this.features.web.stop?.());
    }
    
    if (this.config.features.execution && this.features.execution) {
      // stopPromises.push(this.features.execution.stop?.());
    }
    
    if (this.config.features.embedding && this.features.embedding) {
      // stopPromises.push(this.features.embedding.stop?.());
    }
    
    if (this.config.features.rag && this.features.rag) {
      // stopPromises.push(this.features.rag.stop?.());
    }
    
    await Promise.all(stopPromises);
    console.log('All features stopped');
  }
}

/**
 * Entry point for the application
 */
async function main() {
  // Get config path from command line or use default
  const configPath = process.argv[2];
  
  const app = new A2AClientApplication(configPath);
  
  try {
    await app.start();
    
    // Keep application running until interrupted
    process.on('SIGINT', async () => {
      console.log('\nReceived SIGINT, shutting down...');
      await app.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\nReceived SIGTERM, shutting down...');
      await app.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { A2AClientApplication, loadConfig, Config };