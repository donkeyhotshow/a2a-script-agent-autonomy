/**
 * Middleware Core
 * Extracted from main-gateway application
 */

class MiddlewareCore {
  constructor() {
    this.middleware = new Map();
  }

  /**
   * Add middleware
   */
  use(name, middleware) {
    this.middleware.set(name, middleware);
  }

  /**
   * Apply middleware to a route. Returns a composite middleware function.
   */
  applyToRoute(routePath, middlewareNames) {
    const selectedMiddleware = middlewareNames.map(name => {
      const mw = this.middleware.get(name);
      if (!mw) {
        console.warn(`Middleware '${name}' not found for route '${routePath}'. It will be skipped.`);
      }
      return mw;
    }).filter(Boolean);

    return (req, res, finalNext) => {
      let index = 0;
      let chainTerminated = false;

      // This function ensures finalNext is called only once
      const terminateChain = (err) => {
        if (!chainTerminated) {
          chainTerminated = true;
          finalNext(err);
        }
      };

      const dispatch = (i) => {
        // If chain is already terminated (e.g., response sent or error), stop further dispatch
        if (chainTerminated || res.finished || res.headersSent) {
          return;
        }

        const currentMiddleware = selectedMiddleware[i];

        if (!currentMiddleware) {
          // All middleware executed, call finalNext
          return terminateChain();
        }

        let nextCalledForThisMiddleware = false;
        const nextCallback = (err) => {
          if (nextCalledForThisMiddleware) {
            // Attempt to call next() multiple times by the same middleware
            return terminateChain(new Error('next() called multiple times by a single middleware instance'));
          }
          nextCalledForThisMiddleware = true;

          if (err) {
            // Error occurred, terminate chain with error
            return terminateChain(err);
          }

          // If response sent or headers sent, terminate chain
          if (res.finished || res.headersSent) {
            return terminateChain();
          }

          // Otherwise, dispatch next middleware
          dispatch(i + 1);
        };

        try {
          // Execute current middleware
          currentMiddleware.call(null, req, res, nextCallback);

          // If middleware executes synchronously and doesn't call nextCallback,
          // we must ensure the chain terminates to avoid a timeout.
          // We use setImmediate to check after current event loop turn.
          setImmediate(() => {
            if (!nextCalledForThisMiddleware && !res.finished && !res.headersSent && !chainTerminated) {
              terminateChain();
            }
          });

        } catch (error) {
          // Catch synchronous errors from middleware
          terminateChain(error);
        }
      };

      // Start the middleware chain
      dispatch(0);
    };
  }

  /**
   * Remove middleware
   */
  remove(name) {
    return this.middleware.delete(name);
  }

  /**
   * Get all middleware names
   */
  getMiddlewareNames() {
    return Array.from(this.middleware.keys());
  }
}

export { MiddlewareCore };
