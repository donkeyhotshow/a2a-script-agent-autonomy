// RAG feature module
import { createRAG } from '@a2a/rag';

let ragInstance: ReturnType<typeof createRAG> | null = null;

export async function initialize(): Promise<void> {
  // Initialize RAG with default configuration
  ragInstance = createRAG({
    // Use current working directory as project path
    projectPath: process.cwd(),
    // Enable common features
    useTFIDF: true,
    useBM25: true,
    useSemantic: true,
    useAST: true,
    fallbackToRegex: true,
    relevanceFeedback: true,
  });
  
  console.log('RAG feature initialized');
}

export async function start(): Promise<void> {
  if (!ragInstance) {
    await initialize();
  }
  // RAG indexer and searcher are ready to use after initialization
  console.log('RAG feature started');
}

export async function stop(): Promise<void> {
  // Cleanup if needed
  ragInstance = null;
  console.log('RAG feature stopped');
}

// Export the instance for use by other parts of the application
export { ragInstance };