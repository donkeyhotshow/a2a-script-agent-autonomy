/**
 * Схемы валидации для симуляций пилотного проекта
 * 
 * Типы симуляций:
 * - action_proposal (simulation 1): сервер предлагает действия
 * - action_executing (simulation 2-4): выполнение действий
 * - action_complete (simulation 5): завершение действия
 * 
 * Обозначения:
 * - STATIC: фиксированное значение
 * - DYNAMIC: изменяемое значение
 * - OPTIONAL: может отсутствовать
 */

/**
 * Схема для Simulation 1 - action_proposal
 * Сервер предлагает действия на основе задачи
 */
export const actionProposalSchema = {
  // Верхнеуровневые поля ответа
  success: 'STATIC: true',
  data: {
    id: 'DYNAMIC', // уникальный ID запроса
    promiseId: 'DYNAMIC', // ID Promise
    clientId: 'STATIC: "simulation-client"',
    status: 'STATIC: "completed"',
    priority: 'STATIC: 0',
    
    // Контекст запроса
    context: {
      task: 'DYNAMIC', // описание задачи от пользователя
      action: 'STATIC: "task_request"',
      version: 'STATIC: "1.0"',
      session_id: 'STATIC: "stateless"',
    },
    
    message: 'DYNAMIC', // дублирует task
    
    // Результат выполнения
    result: {
      context: {
        tasks: {
          type: 'array',
          items: {
            id: 'DYNAMIC', // ID задачи
            type: 'STATIC: "analyze"',
            status: 'STATIC: "in_progress"', // всегда in_progress для активных
            progress: 'DYNAMIC: 0 | 20 | 40 | 60 | 80 | 100', // только четверти
          }
        },
        version: 'STATIC: "1.0"',
        session_id: 'STATIC: "stateless"',
      },
      
      outcome: 'STATIC: "completed"', // всегда completed для успешного завершения
      
      // Предлагаемые действия
      proposedActions: {
        type: 'array',
        items: {
          actionId: 'DYNAMIC', // ID экшена
          title: 'DYNAMIC', // название с описанием плана
          priority: 'DYNAMIC', // приоритет
          matchScore: 'DYNAMIC', // оценка совпадения
          subActions: {
            type: 'array',
            items: {
              actionId: 'DYNAMIC',
              title: 'DYNAMIC',
            }
          },
          description: 'DYNAMIC',
        }
      },
      
      // Запасные действия
      fallbackActions: {
        type: 'array',
        items: {
          mode: 'STATIC: "auto-ai" | "task-decomposition"',
          title: 'DYNAMIC',
          description: 'DYNAMIC',
          fallbackType: 'STATIC: "llm_generation" | "manual"',
        }
      },
    },
    
    error: 'OPTIONAL',
    createdAt: 'DYNAMIC', // timestamp
    startedAt: 'DYNAMIC', // timestamp
    completedAt: 'DYNAMIC', // timestamp
  }
};

/**
 * Схема для Simulation 2 - action_executing (начало выполнения)
 * Пользователь выбрал действие, сервер начинает выполнение
 */
export const actionExecutingStartSchema = {
  success: 'STATIC: true',
  data: {
    id: 'DYNAMIC',
    promiseId: 'DYNAMIC',
    clientId: 'STATIC: "simulation-client"',
    status: 'STATIC: "completed"',
    priority: 'STATIC: 0',
    
    context: {
      action: 'STATIC: "approve_action"',
      selectedAction: {
        actionId: 'DYNAMIC', // ID выбранного пользователем действия
      },
      version: 'STATIC: "1.0"',
      session_id: 'STATIC: "stateless"',
    },
    
    message: 'OPTIONAL',
    codeBlocks: 'OPTIONAL',
    
    result: {
      context: {
        version: 'STATIC: "1.0"',
        execution: {
          history: 'DYNAMIC', // массив выполненных шагов
          actionId: 'DYNAMIC', // ID текущего действия
          currentActionId: 'DYNAMIC', // ID выполняемого шага
        },
        session_id: 'STATIC: "stateless"',
      },
      
      outcome: 'DYNAMIC',
      
      // Следующие шаги
      nextSteps: {
        type: 'array',
        items: {
          title: 'DYNAMIC',
          actionId: 'DYNAMIC',
        }
      },
      
      // Выполняемое действие
      executingAction: {
        dsl: {
          input: {
            rootDir: 'DYNAMIC', // может содержать переменные типа ${context.rootDir}
            extensions: 'DYNAMIC',
          },
          script: 'DYNAMIC',
        },
        title: 'DYNAMIC',
        actionId: 'DYNAMIC',
        priority: 'DYNAMIC',
        dslScript: 'DYNAMIC',
        description: 'DYNAMIC',
      }
    },
    
    error: 'OPTIONAL',
    createdAt: 'DYNAMIC',
    startedAt: 'DYNAMIC',
    completedAt: 'DYNAMIC',
  }
};

/**
 * Схема для Simulation 3-4 - action_executing (промежуточные шаги)
 * Клиент отправляет результат шага, сервер возвращает следующее действие
 */
export const actionExecutingStepSchema = {
  success: 'STATIC: true',
  data: {
    id: 'DYNAMIC',
    promiseId: 'DYNAMIC',
    clientId: 'STATIC: "simulation-client"',
    status: 'STATIC: "completed"',
    priority: 'STATIC: 0',
    
    context: {
      action: 'STATIC: "step_result"',
      stepId: 'DYNAMIC', // ID выполненного шага
      stepResult: 'DYNAMIC', // результат выполнения шага (разный для каждого шага)
      version: 'STATIC: "1.0"',
      session_id: 'STATIC: "stateless"',
    },
    
    message: 'OPTIONAL',
    codeBlocks: 'OPTIONAL',
    
    result: {
      context: {
        tasks: {
          type: 'array',
          items: {
            id: 'DYNAMIC',
            type: 'STATIC: "analyze"',
            status: 'STATIC: "in_progress"',
            progress: 'DYNAMIC', // 20, 40, 60...
          }
        },
        version: 'STATIC: "1.0"',
        session_id: 'STATIC: "stateless"',
      },
      
      outcome: 'DYNAMIC',
      
      // Следующие шаги (может быть пустым)
      nextSteps: 'DYNAMIC',
      
      // Текущее выполняемое действие
      executingAction: {
        title: 'DYNAMIC',
        actionId: 'DYNAMIC',
      }
    },
    
    error: 'OPTIONAL',
    createdAt: 'DYNAMIC',
    startedAt: 'DYNAMIC',
    completedAt: 'DYNAMIC',
  }
};

/**
 * Схема для Simulation 3 - action_executing (шаг detect)
 * Результат: обнаруженные сломанные импорты
 */
export const actionExecutingDetectSchema = {
  ...actionExecutingStepSchema,
  // Переопределяем специфичные поля для шага detect
  _specific: {
    stepResult: {
      broken_imports: {
        type: 'array',
        items: {
          file: 'DYNAMIC', // путь к файлу
          line: 'DYNAMIC', // номер строки
          specifier: 'DYNAMIC', // неправильный импорт
        }
      }
    }
  }
};

/**
 * Схема для Simulation 4 - action_executing (шаг resolve)
 * Результат: сгенерированные патчи для исправления
 */
export const actionExecutingResolveSchema = {
  ...actionExecutingStepSchema,
  _specific: {
    stepResult: {
      patches: {
        type: 'array',
        items: {
          file: 'DYNAMIC',
          from: 'DYNAMIC', // старый импорт
          to: 'DYNAMIC', // новый импорт
          line: 'DYNAMIC',
        }
      }
    }
  }
};

/**
 * Схема для Simulation 5 - action_complete
 * Завершение действия - все шаги выполнены
 */
export const actionCompleteSchema = {
  success: 'STATIC: true',
  data: {
    id: 'DYNAMIC',
    promiseId: 'DYNAMIC',
    clientId: 'STATIC: "simulation-client"',
    status: 'STATIC: "completed"',
    priority: 'STATIC: 0',
    
    context: {
      action: 'STATIC: "step_result"',
      stepId: 'DYNAMIC', // ID последнего шага (vue-import-apply)
      stepResult: {
        fixed_files: {
          type: 'array',
          items: {
            file: 'DYNAMIC', // путь к исправленному файлу
            status: 'STATIC: "fixed"',
          }
        }
      },
      version: 'STATIC: "1.0"',
      session_id: 'STATIC: "stateless"',
    },
    
    message: 'OPTIONAL',
    codeBlocks: 'OPTIONAL',
    
    result: {
      context: {
        tasks: {
          type: 'array',
          items: {
            id: 'DYNAMIC',
            type: 'STATIC: "analyze"',
            status: 'DYNAMIC', // может быть "completed"
            progress: 'DYNAMIC', // 100
          }
        },
        version: 'STATIC: "1.0"',
        session_id: 'STATIC: "stateless"',
      },
      
      outcome: 'DYNAMIC',
      
      // Следующие шаги - пустой массив
      nextSteps: 'STATIC: []',
      
      executingAction: {
        title: 'DYNAMIC',
        actionId: 'DYNAMIC',
      }
    },
    
    error: 'OPTIONAL',
    createdAt: 'DYNAMIC',
    startedAt: 'DYNAMIC',
    completedAt: 'DYNAMIC',
  }
};

/**
 * Объединенная схема для всех типов симуляций
 */
export const simulationSchemas = {
  action_proposal: actionProposalSchema,
  action_executing_start: actionExecutingStartSchema,
  action_executing_step: actionExecutingStepSchema,
  action_executing_detect: actionExecutingDetectSchema,
  action_executing_resolve: actionExecutingResolveSchema,
  action_complete: actionCompleteSchema,
};

/**
 * Типы симуляций
 */
export type SimulationType = 
  | 'action_proposal'
  | 'action_executing_start'
  | 'action_executing_step'
  | 'action_executing_detect'
  | 'action_executing_resolve'
  | 'action_complete';

/**
 * Получить схему по типу симуляции
 */
export function getSchema(type: SimulationType) {
  return simulationSchemas[type];
}
