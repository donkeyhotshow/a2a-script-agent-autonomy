/**
 * E2E Test Fixtures
 * Mock API responses based on simulation data
 */

export const fixtures = {
    // Task request - initial user message
    taskRequest: {
        success: true,
        data: {
            id: 'req_001',
            promiseId: 'promise_001',
            status: 'completed',
            result: {
                outcome: 'action_proposal',
                proposedActions: [
                    {
                        actionId: 'fix-vue-imports',
                        title: 'Исправить сломанные импорты в Vue файлах',
                        description: 'Автоматически определить и исправить проблемы с импортами в Vue компонентах',
                        priority: 10,
                        matchScore: 0.95,
                        subActions: [
                            {
                                actionId: 'vue-import-detect',
                                title: 'Определить сломанные импорты',
                                description: 'Сканирует Vue файлы и находит битые импорты',
                                priority: 10,
                                input: 'none',
                                output: 'broken_imports[]'
                            },
                            {
                                actionId: 'vue-import-resolve',
                                title: 'Разрешить правильные пути',
                                description: 'На основе списка битых импортов находит правильные пути',
                                priority: 9,
                                input: 'broken_imports[]',
                                output: 'patches[]'
                            },
                            {
                                actionId: 'vue-import-apply',
                                title: 'Применить исправления',
                                description: 'Применяет исправления к файлам',
                                priority: 8,
                                input: 'patches[]',
                                output: 'fixed_files[]'
                            }
                        ]
                    }
                ]
            }
        }
    },

    // Action executing - step result
    actionExecuting: {
        success: true,
        data: {
            id: 'req_002',
            promiseId: 'promise_002',
            status: 'completed',
            result: {
                outcome: 'action_executing',
                proposedActions: [
                    {
                        actionId: 'fix-vue-imports',
                        title: 'Исправить сломанные импорты',
                        description: 'Исправление импортов',
                        priority: 10,
                        matchScore: 0.95,
                        subActions: [
                            {
                                actionId: 'vue-import-detect',
                                title: 'Определить сломанные импорты',
                                description: '',
                                priority: 10,
                                input: 'none',
                                output: ''
                            },
                            {
                                actionId: 'vue-import-resolve',
                                title: 'Разрешить пути',
                                description: '',
                                priority: 9,
                                input: '',
                                output: ''
                            },
                            {
                                actionId: 'vue-import-apply',
                                title: 'Применить исправления',
                                description: '',
                                priority: 8,
                                input: '',
                                output: ''
                            }
                        ]
                    }
                ],
                executingAction: {
                    actionId: 'vue-import-detect',
                    title: 'Определить сломанные импорты'
                },
                context: {
                    execution: {
                        actionId: 'fix-vue-imports',
                        currentStepIndex: 0,
                        history: []
                    }
                },
                previousStep: {
                    result: {
                        broken_imports: [
                            {file: 'Login.vue', line: 3},
                            {file: 'Register.vue', line: 5}
                        ]
                    }
                }
            }
        }
    },

    // Step result - patches generated
    stepResult: {
        success: true,
        data: {
            id: 'req_003',
            promiseId: 'promise_003',
            status: 'completed',
            result: {
                outcome: 'action_executing',
                proposedActions: [
                    {
                        actionId: 'fix-vue-imports',
                        title: 'Исправить сломанные импорты',
                        description: 'Исправление импортов',
                        priority: 10,
                        matchScore: 0.95,
                        subActions: [
                            {
                                actionId: 'vue-import-detect',
                                title: 'Определить сломанные импорты',
                                description: '',
                                priority: 10,
                                input: 'none',
                                output: ''
                            },
                            {
                                actionId: 'vue-import-resolve',
                                title: 'Разрешить пути',
                                description: '',
                                priority: 9,
                                input: '',
                                output: ''
                            },
                            {
                                actionId: 'vue-import-apply',
                                title: 'Применить исправления',
                                description: '',
                                priority: 8,
                                input: '',
                                output: ''
                            }
                        ]
                    }
                ],
                executingAction: {
                    actionId: 'vue-import-resolve',
                    title: 'Разрешить правильные пути'
                },
                context: {
                    execution: {
                        actionId: 'fix-vue-imports',
                        currentStepIndex: 1,
                        history: [
                            {stepId: 'vue-import-detect', status: 'completed', result: {broken_imports: []}}
                        ]
                    }
                },
                previousStep: {
                    result: {
                        patches: [
                            {to: '@/components/Header', file: 'Login.vue', from: '../components/Header', line: 3},
                            {to: '@/utils/helpers', file: 'Register.vue', from: '../../utils/helpers', line: 5}
                        ]
                    }
                }
            }
        }
    },

    // Action complete
    actionComplete: {
        success: true,
        data: {
            id: 'req_004',
            promiseId: 'promise_004',
            status: 'completed',
            result: {
                outcome: 'completed',
                proposedActions: [
                    {
                        actionId: 'fix-vue-imports',
                        title: 'Исправить сломанные импорты',
                        description: 'Исправление импортов',
                        priority: 10,
                        matchScore: 0.95,
                        subActions: [
                            {
                                actionId: 'vue-import-detect',
                                title: 'Определить сломанные импорты',
                                description: '',
                                priority: 10,
                                input: 'none',
                                output: ''
                            },
                            {
                                actionId: 'vue-import-resolve',
                                title: 'Разрешить пути',
                                description: '',
                                priority: 9,
                                input: '',
                                output: ''
                            },
                            {
                                actionId: 'vue-import-apply',
                                title: 'Применить исправления',
                                description: '',
                                priority: 8,
                                input: '',
                                output: ''
                            }
                        ]
                    }
                ],
                finalResult: {
                    actionId: 'fix-vue-imports',
                    summary: {
                        totalSteps: 3,
                        duration: '45s',
                        filesChanged: 5
                    }
                },
                context: {
                    execution: {
                        actionId: 'fix-vue-imports',
                        currentStepIndex: 3,
                        history: [
                            {stepId: 'vue-import-detect', status: 'completed', result: {}},
                            {stepId: 'vue-import-resolve', status: 'completed', result: {}},
                            {stepId: 'vue-import-apply', status: 'completed', result: {}}
                        ]
                    }
                }
            }
        }
    },

    // Graph incomplete response
    graphIncomplete: {
        success: true,
        data: {
            id: 'req_005',
            promiseId: 'promise_005',
            status: 'completed',
            result: {
                outcome: 'graph_incomplete',
                questions: [
                    'Какой фреймворк используется на фронтенде?',
                    'Какой фреймворк используется на бэкенде?'
                ],
                missing: ['frontend', 'backend'],
                frameworks: {
                    frontend: ['Vue'],
                    backend: ['Laravel']
                }
            }
        }
    },

    // Session list
    sessions: {
        success: true,
        data: [
            {
                id: 'session_001',
                status: 'active',
                createdAt: '2026-02-25T10:00:00Z',
                messages: [
                    {
                        id: 'msg_001',
                        role: 'user',
                        content: {text: 'исправить импорты'},
                        contentText: 'исправить импорты',
                        status: 'completed'
                    }
                ]
            }
        ]
    },

    // Single session
    session: {
        success: true,
        data: {
            id: 'session_001',
            status: 'active',
            createdAt: '2026-02-25T10:00:00Z',
            messages: []
        }
    },

    // Create session
    createSession: {
        success: true,
        data: {
            id: 'session_new_001',
            status: 'active',
            createdAt: '2026-02-25T10:05:00Z',
            messages: []
        }
    },

    // Create request
    createRequest: {
        success: true,
        data: {
            promiseId: 'promise_new_001'
        }
    },

    // Request status - processing
    requestStatusProcessing: {
        success: true,
        data: {
            status: 'processing'
        }
    },

    // Request status - completed
    requestStatusCompleted: {
        success: true,
        data: {
            status: 'completed'
        }
    }
};

export default fixtures;
