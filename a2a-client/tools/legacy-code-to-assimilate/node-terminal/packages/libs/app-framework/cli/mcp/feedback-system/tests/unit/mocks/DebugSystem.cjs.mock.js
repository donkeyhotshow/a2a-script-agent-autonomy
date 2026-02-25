module.exports = {
    debugSystem: {
        registerProblem: jest.fn(),
        DEBUG_CATEGORIES: {
            USER_FEEDBACK: 'USER_FEEDBACK',
            FILE_SYSTEM_ERROR: 'FILE_SYSTEM_ERROR',
            DOCUMENT_GENERATION: 'DOCUMENT_GENERATION',
        },
    },
    DEBUG_CATEGORIES: {
        USER_FEEDBACK: 'USER_FEEDBACK',
        FILE_SYSTEM_ERROR: 'FILE_SYSTEM_ERROR',
        DOCUMENT_GENERATION: 'DOCUMENT_GENERATION',
    },
};
