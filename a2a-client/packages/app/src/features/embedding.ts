// Embedding feature module
import { createEmbeddingClient, EmbeddingConfig } from '@a2a/embedding';

let embeddingClient: ReturnType<typeof createEmbeddingClient> | null = null;

export async function initialize(): Promise<void> {
  // Initialize embedding client with default configuration
  const config: EmbeddingConfig = {
    // Use environment variables or defaults
    provider: process.env.EMBEDDING_PROVIDER as any,
    apiKey: process.env.EMBEDDING_API_KEY,
    baseUrl: process.env.EMBEDDING_BASE_URL,
    model: process.env.EMBEDDING_MODEL,
  };
  
  // Remove undefined values
  Object.keys(config).forEach(key => config[key] === undefined && delete config[key]);
  
  embeddingClient = createEmbeddingClient(config);
  
  console.log('Embedding feature initialized');
}

export async function start(): Promise<void> {
  if (!embeddingClient) {
    await initialize();
  }
  // Verify the client is available
  const isAvailable = await embeddingClient?.isAvailable();
  console.log(`Embedding feature started (available: ${isAvailable})`);
}

export async function stop(): Promise<void> {
  // Cleanup if needed
  if (embeddingClient) {
    embeddingClient.dispose();
    embeddingClient = null;
  }
  console.log('Embedding feature stopped');
}

// Export the client for use by other parts of the application
export { embeddingClient };