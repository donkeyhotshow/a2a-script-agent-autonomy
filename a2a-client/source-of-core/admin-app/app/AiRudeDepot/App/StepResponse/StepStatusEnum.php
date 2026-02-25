<?php

namespace App\AiRudeDepot\App\StepResponse;

enum StepStatusEnum: string
{
    case OK = 'ok';
    case ERROR = 'error'; // General error, might be deprecated if specific errors are used
    case REDIRECT = 'redirect';
    case HALTED = 'halted';
    case RECURSION_LIMIT = 'recursion_limit';

    // Added Specific Error Statuses
    case ERROR_NOT_FOUND = 'error_not_found';         // HTTP 404
    case ERROR_FORBIDDEN = 'error_forbidden';         // HTTP 403
    case ERROR_UNAUTHENTICATED = 'error_unauthenticated'; // HTTP 401
    case ERROR_VALIDATION = 'error_validation';       // HTTP 422
    case ERROR_CRITICAL = 'error_critical';           // HTTP 500 (recoverable internal)
    case ERROR_UNHANDLED_EXCEPTION = 'error_unhandled_exception'; // HTTP 500 (unrecoverable)

    // Можно добавить другие статусы при необходимости
} 