import {
    feedbackPlugin
} from './FeedbackPlugin';
import { FeedbackAnalytics } from './FeedbackAnalytics';

/**
 * MCP Tools для работы с системой обратной связи проектов
 */
export class FeedbackTools {
    /**
     * Добавление нового предложения
     */
    static async addSuggestionTool(params: { suggestion: string, user?: string, category?: string, type?: string }): Promise<{ success: boolean, error?: string, data?: any, message?: string }> {
        try {
            const { suggestion, user = 'anonymous', category = 'general', type = 'feedback' } = params;

            if (!suggestion) {
                return {
                    success: false,
                    error: 'Необходимо указать предложение'
                };
            }

            const result = feedbackPlugin.addSuggestion(suggestion, user, category, type);

            if (result.success) {
                return {
                    success: true,
                    message: 'Предложение успешно добавлено',
                    data: {
                        id: result.suggestion?.id,
                        suggestion: result.suggestion?.suggestion,
                        user: result.suggestion?.user,
                        category: result.suggestion?.category,
                        type: result.suggestion?.type,
                        status: result.suggestion?.status,
                        createdAt: result.suggestion?.createdAt
                    }
                };
            } else {
                return {
                    success: false,
                    error: result.error
                };
            }
        } catch (error: any) {
            return {
                success: false,
                error: `Ошибка добавления предложения: ${error.message}`
            };
        }
    }

    /**
     * Создание документа
     */
    static async createDocumentTool(params: { content: string, documentType: string, title: string, metadata?: any }): Promise<{ success: boolean, error?: string, data?: any, message?: string }> {
        try {
            const { content, documentType, title, metadata = {} } = params;

            if (!content || !documentType || !title) {
                return {
                    success: false,
                    error: 'Необходимо указать содержимое, тип документа и заголовок'
                };
            }

            const result = feedbackPlugin.createDocument(content, documentType, title, metadata);

            if (result.success) {
                return {
                    success: true,
                    message: 'Документ успешно создан',
                    data: {
                        filePath: result.filePath,
                        documentType: documentType,
                        title: title
                    }
                };
            } else {
                return {
                    success: false,
                    error: result.error
                };
            }
        } catch (error: any) {
            return {
                success: false,
                error: `Ошибка создания документа: ${error.message}`
            };
        }
    }

    /**
     * Получение списка предложений
     */
    static async getSuggestionsTool(params: {
        status?: string,
        category?: string,
        user?: string,
        priority?: string,
        type?: string,
        sortBy?: string,
        limit?: number,
        nestedKey?: string,
        nestedValue?: any
    }): Promise<{ success: boolean, error?: string, message?: string, data?: any }> {
        try {
            const {
                status,
                category,
                user,
                priority,
                type,
                sortBy = 'date',
                limit = 20,
                nestedKey,
                nestedValue
            } = params;

            const filters: { [key: string]: any } = {};
            if (status) filters.status = status;
            if (category) filters.category = category;
            if (user) filters.user = user;
            if (priority) filters.priority = priority;
            if (type) filters.type = type;
            if (sortBy) filters.sortBy = sortBy;
            if (nestedKey) filters.nestedKey = nestedKey;
            if (nestedValue !== undefined) filters.nestedValue = nestedValue;

            const result = feedbackPlugin.getSuggestions(filters);

            if (result.success) {
                // Ограничиваем количество результатов
                const limitedSuggestions = result.suggestions?.slice(0, limit);

                return {
                    success: true,
                    message: `Найдено ${result.total} предложений`,
                    data: {
                        total: result.total,
                        shown: limitedSuggestions?.length,
                        suggestions: limitedSuggestions?.map((s: any) => ({
                            id: s.id,
                            suggestion: s.suggestion,
                            user: s.user,
                            category: s.category,
                            type: s.type,
                            status: s.status,
                            priority: s.priority,
                            votes: s.votes,
                            createdAt: s.createdAt,
                            updatedAt: s.updatedAt
                        }))
                    }
                };
            } else {
                return {
                    success: false,
                    error: result.error
                };
            }
        } catch (error: any) {
            return {
                success: false,
                error: `Ошибка получения предложений: ${error.message}`
            };
        }
    }

    /**
     * Получение предложений по вложенному ключу
     * Позволяет выгружать и редактировать данные по более узкому набору критериев
     * Поддерживает расширенные возможности фильтрации
     */
    static async getSuggestionsByNestedKeyTool(params: {
        nestedKey: string,
        nestedValue?: any,
        nestedKeys?: string[], // Множественные ключи для OR фильтрации
        nestedRange?: { min?: any, max?: any }, // Диапазон значений для числовых полей
        nestedPattern?: string, // Regex паттерн для строковых полей
        nestedExists?: boolean, // Проверка существования ключа
        nestedType?: 'string' | 'number' | 'boolean' | 'array' | 'object', // Тип значения
        category?: string,
        status?: string,
        user?: string,
        priority?: string,
        type?: string,
        sortBy?: string,
        limit?: number,
        offset?: number, // Пагинация
        groupBy?: string, // Группировка результатов
        aggregate?: boolean // Включить агрегацию
    }): Promise<{ success: boolean, error?: string, message?: string, data?: any }> {
        try {
            const {
                nestedKey,
                nestedValue,
                nestedKeys,
                nestedRange,
                nestedPattern,
                nestedExists,
                nestedType,
                category,
                status,
                user,
                priority,
                type,
                sortBy = 'date',
                limit = 20,
                offset = 0,
                groupBy,
                aggregate = false
            } = params;

            if (!nestedKey && !nestedKeys) {
                return {
                    success: false,
                    error: 'Необходимо указать хотя бы один ключ вложенности'
                };
            }

            const additionalFilters: { [key: string]: any } = {};
            if (status) additionalFilters.status = status;
            if (category) additionalFilters.category = category;
            if (user) additionalFilters.user = user;
            if (priority) additionalFilters.priority = priority;
            if (type) additionalFilters.type = type;
            if (sortBy) additionalFilters.sortBy = sortBy;

            // Расширенные параметры фильтрации
            const extendedParams = {
                nestedKey,
                nestedValue,
                nestedKeys,
                nestedRange,
                nestedPattern,
                nestedExists,
                nestedType,
                ...additionalFilters
            };

            const result = feedbackPlugin.getSuggestionsByNestedKeyExtended(extendedParams);

            if (result.success) {
                let suggestions = result.suggestions || [];

                // Применяем пагинацию
                if (offset > 0) {
                    suggestions = suggestions.slice(offset);
                }

                // Ограничиваем количество результатов
                const limitedSuggestions = suggestions.slice(0, limit);

                // Группировка результатов
                let groupedData = null;
                if (groupBy && aggregate) {
                    groupedData = FeedbackAnalytics.groupSuggestions(limitedSuggestions, groupBy);
                }

                return {
                    success: true,
                    message: `Найдено ${result.total} предложений по расширенным критериям`,
                    data: {
                        total: result.total,
                        shown: limitedSuggestions.length,
                        offset,
                        limit,
                        nestedKey,
                        nestedValue,
                        nestedKeys,
                        nestedRange,
                        nestedPattern,
                        nestedExists,
                        nestedType,
                        filteredBy: 'nested_key_extended',
                        suggestions: limitedSuggestions.map((s: any) => ({
                            id: s.id,
                            suggestion: s.suggestion,
                            user: s.user,
                            category: s.category,
                            type: s.type,
                            status: s.status,
                            priority: s.priority,
                            votes: s.votes,
                            createdAt: s.createdAt,
                            updatedAt: s.updatedAt,
                            metadata: s.metadata,
                            tags: s.tags
                        })),
                        grouped: groupedData,
                        aggregates: aggregate ? FeedbackAnalytics.calculateAggregates(limitedSuggestions) : null
                    }
                };
            } else {
                return {
                    success: false,
                    error: result.error
                };
            }
        } catch (error: any) {
            return {
                success: false,
                error: `Ошибка получения предложений по вложенному ключу: ${error.message}`
            };
        }
    }

    /**
     * Голосование за предложение
     */
    static async voteSuggestionTool(params: { suggestionId: string, user: string, vote?: number }): Promise<{ success: boolean, error?: string, message?: string, data?: any }> {
        try {
            const { suggestionId, user, vote = 1 } = params;

            if (!suggestionId || !user) {
                return {
                    success: false,
                    error: 'Необходимо указать ID предложения и пользователя'
                };
            }

            const result = feedbackPlugin.voteSuggestion(suggestionId, user, vote);

            if (result.success) {
                return {
                    success: true,
                    message: 'Голос учтен',
                    data: {
                        id: result.suggestion?.id,
                        votes: result.suggestion?.votes
                    }
                };
            } else {
                return {
                    success: false,
                    error: result.error
                };
            }
        } catch (error: any) {
            return {
                success: false,
                error: `Ошибка голосования: ${error.message}`
            };
        }
    }

    /**
     * Обновление статуса предложения
     */
    static async updateSuggestionStatusTool(params: { suggestionId: string, status: string, adminUser?: string }): Promise<{ success: boolean, error?: string, message?: string, data?: any }> {
        try {
            const { suggestionId, status, adminUser = 'admin' } = params;

            if (!suggestionId || !status) {
                return {
                    success: false,
                    error: 'Необходимо указать ID предложения и статус'
                };
            }

            const result = feedbackPlugin.updateSuggestionStatus(suggestionId, status, adminUser);

            if (result.success) {
                return {
                    success: true,
                    message: `Статус обновлен на: ${status}`,
                    data: {
                        id: result.suggestion?.id,
                        status: result.suggestion?.status,
                        updatedBy: result.suggestion?.updatedBy
                    }
                };
            } else {
                return {
                    success: false,
                    error: result.error
                };
            }
        } catch (error: any) {
            return {
                success: false,
                error: `Ошибка обновления статуса: ${error.message}`
            };
        }
    }

    /**
     * Получение статистики
     */
    static async getStatisticsTool(params: {} = {}): Promise<{ success: boolean, error?: string, message?: string, data?: any }> {
        try {
            const result = feedbackPlugin.getStatistics();

            if (result.success) {
                return {
                    success: true,
                    message: 'Статистика получена',
                    data: result.statistics
                };
            } else {
                return {
                    success: false,
                    error: result.error
                };
            }
        } catch (error: any) {
            return {
                success: false,
                error: `Ошибка получения статистики: ${error.message}`
            };
        }
    }

    /**
     * Экспорт предложений
     */
    static async exportSuggestionsTool(params: { format?: string }): Promise<{ success: boolean, error?: string, message?: string, data?: any }> {
        try {
            const { format = 'json' } = params;

            const result = feedbackPlugin.exportSuggestions(format);

            if (result.success) {
                return {
                    success: true,
                    message: `Экспорт в формате ${format} завершен`,
                    data: {
                        format: format,
                        filename: result.filename,
                        data: result.data,
                        size: result.data?.length
                    }
                };
            } else {
                return {
                    success: false,
                    error: result.error
                };
            }
        } catch (error: any) {
            return {
                success: false,
                error: `Ошибка экспорта: ${error.message}`
            };
        }
    }

    /**
     * Получение информации о плагине обратной связи
     */
    static async getFeedbackInfoTool(params: {} = {}): Promise<{ success: boolean, error?: string, message?: string, data?: any }> {
        try {
            const pluginInfo = feedbackPlugin.getPluginInfo();

            return {
                success: true,
                message: 'Информация о плагине обратной связи проектов',
                data: {
                    pluginInfo: pluginInfo,
                    description: 'Система сбора предложений и отчетов для проектов',
                    targetService: 'project-feedback',
                    note: 'Предложения и отчеты принимаются для текущего проекта, в котором работает сессия',
                    categories: [
                        { id: 'general', name: 'Общие предложения' },
                        { id: 'ui', name: 'Пользовательский интерфейс' },
                        { id: 'performance', name: 'Производительность' },
                        { id: 'security', name: 'Безопасность' },
                        { id: 'architecture', name: 'Архитектура' },
                        { id: 'documentation', name: 'Документация' },
                        { id: 'testing', name: 'Тестирование' },
                        { id: 'deployment', name: 'Развертывание' },
                        { id: 'other', name: 'Прочее' }
                    ],
                    types: [
                        { id: 'feedback', name: 'Обратная связь' },
                        { id: 'task', name: 'Задача' },
                        { id: 'idea', name: 'Идея' },
                        { id: 'bug', name: 'Ошибка' },
                        { id: 'feature', name: 'Функция' },
                        { id: 'improvement', name: 'Улучшение' }
                    ],
                    documentTypes: [
                        { id: 'report', name: 'Отчет', path: 'work/reports' },
                        { id: 'rule', name: 'Правило', path: '.cursor/rules' },
                        { id: 'guide', name: 'Руководство', path: 'docs/guides' },
                        { id: 'analysis', name: 'Анализ', path: 'work/reports' },
                        { id: 'task', name: 'Задача', path: 'feedback' }
                    ],
                    statuses: [
                        { id: 'new', name: 'Новое предложение' },
                        { id: 'reviewing', name: 'На рассмотрении' },
                        { id: 'approved', name: 'Одобрено' },
                        { id: 'rejected', name: 'Отклонено' },
                        { id: 'implemented', name: 'Реализовано' },
                        { id: 'in-progress', name: 'В работе' }
                    ],
                    priorities: [
                        { id: 'low', name: 'Низкий приоритет' },
                        { id: 'medium', name: 'Средний приоритет' },
                        { id: 'high', name: 'Высокий приоритет' },
                        { id: 'critical', name: 'Критический приоритет' }
                    ],
                    limits: {
                        maxSuggestionLength: pluginInfo.maxSuggestionLength,
                        maxSuggestionsPerUser: pluginInfo.maxSuggestionsPerUser
                    }
                }
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Ошибка получения информации о плагине: ${error.message}`
            };
        }
    }
}
