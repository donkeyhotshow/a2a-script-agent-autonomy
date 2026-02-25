
export class ErrorHandlerIntegration {
    constructor(errorHandler) {
        if (!errorHandler) {
            throw new Error("ErrorHandler instance is required for ErrorHandlerIntegration.");
        }
        this.errorHandler = errorHandler;
    }

    /**
     * Registers a global error handling middleware for the given Express-like app.
     * @param {object} app - The Express-like application instance (e.g., app.use).
     */
    registerGlobalErrorHandler(app) {
        app.use((err, req, res, next) => {
            this.errorHandler.handle(err, { req, res, next });
            // The error handler might close the response or pass it to the next middleware.
            // If it doesn't, we can send a generic 500 here.
            if (!res.headersSent) {
                res.status(500).send("Internal Server Error");
            }
        });
    }

    /**
     * Catches and handles errors in an asynchronous function.
     * @param {Function} fn - The asynchronous function to wrap.
     * @returns {Function} - The wrapped function.
     */
    catchAsync(fn) {
        return async (req, res, next) => {
            try {
                return await fn(req, res, next);
            } catch (err) {
                this.errorHandler.handle(err, { req, res, next });
                if (res && !res.headersSent) {
                    res.status(500).send("Internal Server Error");
                }
            }
        };
    }
}

