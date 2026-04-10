// Execution feature module
import { 
  runAgentCommand, 
  runAgentRegisteredScript,
  runAgentEditPatch,
  FileScanner,
  IgnoreDetector,
  PathSandbox
} from '@a2a-client/execution';

let fileScanner: FileScanner | null = null;
let ignoreDetector: IgnoreDetector | null = null;
let pathSandbox: PathSandbox | null = null;

export async function initialize(): Promise<void> {
  // Initialize execution components
  ignoreDetector = new IgnoreDetector();
  await ignoreDetector.initialize();
  
  fileScanner = new FileScanner({
    ignoreDetector
  });
  
  pathSandbox = new PathSandbox();
  
  console.log('Execution feature initialized');
}

export async function start(): Promise<void> {
  if (!fileScanner || !ignoreDetector || !pathSandbox) {
    await initialize();
  }
  console.log('Execution feature started');
}

export async function stop(): Promise<void> {
  // Cleanup if needed
  fileScanner = null;
  ignoreDetector = null;
  pathSandbox = null;
  console.log('Execution feature stopped');
}

// Export commonly used functions for use by other parts of the application
export { 
  runAgentCommand, 
  runAgentRegisteredScript,
  runAgentEditPatch,
  fileScanner,
  ignoreDetector,
  pathSandbox
};