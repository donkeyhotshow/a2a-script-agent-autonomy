
import { UniversalController } from '../dist/UniversalController.js';
import { LoggingUtils } from '@libs/utils/logging';
import { ErrorHandlingUtils } from '@libs/utils/error-handling';
import { ConfigurationUtils } from '@libs/utils/configuration'; // Используем новую утилиту конфигурации
import { RequestValidator } from '../dist/RequestValidator.js';
import { RequestTransformer } from '../dist/RequestTransformer.js';
import { ResponseTransformer } from '../dist/ResponseTransformer.js';
import { ErrorHandlerIntegration } from '../dist/ErrorHandlerIntegration.js';

describe('UniversalController Integration Tests', () => {
    let controller;
    let logger;
    let errorHandler;
    let configManager;
    let requestValidator;
    let requestTransformer;
    let responseTransformer;

    beforeEach(() => {
        logger = new LoggingUtils();
        errorHandler = new ErrorHandlingUtils({ logger }); // Инициализируем ErrorHandlingUtils
        configManager = new ConfigurationUtils(); // Инициализируем ConfigurationUtils
        requestValidator = new RequestValidator({ configManager, logger });
        requestTransformer = new RequestTransformer({ logger });
        responseTransformer = new ResponseTransformer({ logger });

        // ConfigManager validation method
        configManager.validate = (data, schemaName) => { // Обновлено с validateSchema на validate
            if (schemaName === 'userSchema') {
                if (data.id && typeof data.id === 'string' && data.name && typeof data.name === 'string') {
                    return { ...data, isValid: true };
                } else {
                    throw new Error('Invalid user data');
                }
            }
            return data;
        };

        // Добавляем метод log, если его нет
        if (!logger.log) {
            logger.log = logger.info.bind(logger);
        }

        // Logger methods are available
        if (!logger.log) {
            logger.log = logger.info.bind(logger);
        }
        // Error handler is available

        controller = new UniversalController({
            logger,
            errorHandler,
            configManager,
            requestValidator,
            requestTransformer,
            responseTransformer,
        });

        // Добавляем loggingMiddleware для логирования запросов
        controller.addGlobalMiddleware(controller.loggingMiddleware.bind(controller));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should handle a successful request with logging, validation, and transformation', async () => {
        const requestTransform = (params) => ({ ...params, transformedReq: true, name: params.name.toUpperCase() });
        const responseTransform = (result) => ({ ...result, transformedRes: true, dataLength: result.data.length });

        controller.registerRoute(
            'POST',
            '/users',
            async (context) => {
                expect(context.params).toEqual({
                    id: '123',
                    name: 'ALEX',
                    transformedReq: true,
                    isValid: true,
                });
                return { status: 'created', data: ['user1', 'user2'] };
            },
            {
                validationSchema: 'userSchema',
                requestTransform,
                responseTransform,
            }
        );

        const response = await controller.executeRequest(
            'POST',
            '/users',
            { id: '123', name: 'alex' },
            { ip: '127.0.0.1', headers: { 'user-agent': 'test-agent' } }
        );

        expect(response).toEqual({
            status: 'created',
            data: ['user1', 'user2'],
            transformedRes: true,
            dataLength: 2,
        });

        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining('Запрос начат'),
            expect.objectContaining({
                method: 'POST',
                path: '/users',
                ip: '127.0.0.1',
                userAgent: 'test-agent',
                params: { id: '123', name: 'alex' } // Исходные данные, до трансформации
            })
        );

        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining('Запрос завершен'),
            expect.objectContaining({
                method: 'POST',
                path: '/users',
                result: { status: 'created', data: ['user1', 'user2'], transformedRes: true, dataLength: 2 } // Transformed response
            })
        );

        expect(errorHandler.handleError).not.toHaveBeenCalled();
    });

    test('should handle validation errors correctly', async () => {
        controller.registerRoute(
            'POST',
            '/users',
            async (context) => { /* should not be called */ },
            { validationSchema: 'userSchema' }
        );

        let error;
        try {
            await controller.executeRequest(
                'POST',
                '/users',
                { id: '123', name: 123 }, // Invalid name
                {}
            );
        } catch (e) {
            error = e;
        }

        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain("Некорректные входные данные для маршрута: Ошибка валидации данных: Invalid user data");
        expect(error.statusCode).toBe(400);

        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('Request validation failed'),
            expect.objectContaining({ requestId: expect.any(String) })
        );
        expect(errorHandler.handleError).toHaveBeenCalledWith(
            expect.any(Error),
            expect.objectContaining({ context: 'UniversalController.executeRequest' })
        );
    });

    test('should handle request transformation errors', async () => {
        const requestTransform = () => { throw new Error('Req transform failed'); };

        controller.registerRoute(
            'GET',
            '/items',
            async (context) => { /* should not be called */ },
            { requestTransform }
        );

        let error;
        try {
            await controller.executeRequest(
                'GET',
                '/items',
                { someParam: 'value' },
                {}
            );
        } catch (e) {
            error = e;
        }

        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain("Ошибка преобразования входных данных: Ошибка трансформации запроса: Req transform failed");
        expect(error.statusCode).toBe(400);

        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('Request transformation failed'),
            expect.objectContaining({ requestId: expect.any(String) })
        );
        expect(errorHandler.handleError).toHaveBeenCalledWith(
            expect.any(Error),
            expect.objectContaining({ context: 'UniversalController.executeRequest' })
        );
    });

    test('should handle response transformation errors', async () => {
        const responseTransform = () => { throw new Error('Res transform failed'); };

        controller.registerRoute(
            'GET',
            '/data',
            async (context) => { return { status: 'ok' }; },
            { responseTransform }
        );

        let error;
        try {
            await controller.executeRequest(
                'GET',
                '/data',
                {},
                {}
            );
        } catch (e) {
            error = e;
        }

        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain("Ошибка преобразования исходящих данных: Ошибка трансформации ответа: Res transform failed");
        expect(error.statusCode).toBe(500);

        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('Response transformation failed'),
            expect.objectContaining({ requestId: expect.any(String) })
        );
        expect(errorHandler.handleError).toHaveBeenCalledWith(
            expect.any(Error),
            expect.objectContaining({ context: 'UniversalController.executeRequest' })
        );
    });

    test('should log sensitive data as FILTERED', async () => {
        controller.registerRoute(
            'POST',
            '/login',
            async (context) => { return { token: 'abc', password: 'secret' }; },
            {}
        );

        await controller.executeRequest(
            'POST',
            '/login',
            { username: 'test', password: 'mysecret' },
            {}
        );

        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining('Запрос начат'),
            expect.objectContaining({
                params: { username: 'test', password: '[FILTERED]' }
            })
        );

        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining('Запрос завершен'),
            expect.objectContaining({
                result: { token: 'abc', password: '[FILTERED]' }
            })
        );
    });

    test('should pass through middleware registered for specific route', async () => {
        const routeSpecificMiddleware = async (context, next) => {
            context.middlewareExecuted = true;
            return await next();
        };

        controller.registerRoute(
            'GET',
            '/custom-route',
            async (context) => { return { status: 'ok', middlewareRan: context.middlewareExecuted }; },
            { middleware: [routeSpecificMiddleware] }
        );

        const response = await controller.executeRequest(
            'GET',
            '/custom-route',
            {},
            {}
        );

        expect(routeSpecificMiddleware).toHaveBeenCalledTimes(1);
        expect(response.middlewareRan).toBe(true);
    });
});
