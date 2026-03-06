/**
 * TaskFlow - Main Entry Point
 * Объединяет все модули TaskFlow
 * 
 * Модули:
 * - api.js - HTTP запросы и retry логика
 * - render.js - рендеринг UI компонентов
 * - core.js - основной объект TaskFlow
 * 
 * Загрузка модулей должна происходить в порядке:
 * 1. api.js
 * 2. render.js
 * 3. core.js
 * 4. index.js
 */

(function (global) {
    'use strict';

    // Modules are loaded globally as:
    // - global.TaskFlowAPI (from api.js)
    // - global.TaskFlowRender (from render.js)
    // - global.TaskFlow (from core.js)

    // Auto-initialize when DOM is ready
    if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', function() {
            // Wait for modules to be loaded
            const checkAndInit = () => {
                if (global.TaskFlow && typeof global.TaskFlow.init === 'function') {
                    global.TaskFlow.init();
                } else {
                    // Retry after short delay
                    setTimeout(checkAndInit, 100);
                }
            };
            checkAndInit();
        });
    }

    // Export convenience functions
    global.startTask = function(task, projectId) {
        if (global.TaskFlow) {
            global.TaskFlow.run(task, projectId);
        }
    };

    global.sendTaskChoice = function(choiceId) {
        if (global.TaskFlow && global.TaskFlow.panel) {
            const content = global.TaskFlow.panel.getContentEl();
            if (content) {
                global.TaskFlow.sendChoice(choiceId, content);
            }
        }
    };

    global.sendTaskMessage = function(message) {
        if (global.TaskFlow && global.TaskFlow.panel) {
            const content = global.TaskFlow.panel.getContentEl();
            if (content) {
                global.TaskFlow.sendMessageResult(message, content);
            }
        }
    };

})(typeof window !== 'undefined' ? window : global);
