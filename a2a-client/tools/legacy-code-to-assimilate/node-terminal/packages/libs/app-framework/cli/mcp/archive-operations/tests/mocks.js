const LoggerCore = {
    info: console.log,
    error: console.error,
    debug: console.debug
};

const errorHandler = {
    handle: (error, context) => {
        console.error(`[${context}] Error:`, error);
    }
};

export { LoggerCore,
    errorHandler };
