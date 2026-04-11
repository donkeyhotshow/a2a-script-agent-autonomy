/**
 * Generic thread-safe lazy singleton factory
 * Creates a getter function that returns a single instance of the given class
 */
export function createSingleton<T, A extends any[] = []>(
  constructor: new (...args: A) => T
): (...args: A) => T {
  let instance: T | null = null;
  let initializing = false;

  return (...args: A): T => {
    if (instance) {
      return instance;
    }

    if (initializing) {
      // Prevent race conditions and recursive initialization
      throw new Error(`Singleton ${constructor.name} is already being initialized`);
    }

    initializing = true;
    try {
      instance = new constructor(...args);
      return instance;
    } finally {
      initializing = false;
    }
  };
}
