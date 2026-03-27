/**
 * Error Handler Recovery Module
 * Handles retry logic and timers.
 */

(function (global) {
    'use strict';

    if (!global.ErrorHandler) global.ErrorHandler = {};
    const EH = global.ErrorHandler;

    if (!EH._retryTimers) EH._retryTimers = new Map();

    EH._isRetryable = function(error) {
        if (!this.config) return false;
        const code = error.code || '';
        
        if (this.config.nonRetryableErrors && this.config.nonRetryableErrors.includes(code)) {
            return false;
        }
        
        if (this.config.retryableErrors && this.config.retryableErrors.includes(code)) {
            return true;
        }
        return false;
    };

    EH._executeRetry = function(error, retryId, element) {
        if (!this.config) return;
        const context = error.context;
        if (!context || typeof context !== 'object') {
            const errMsg = '[ErrorHandler] Retry context is required';
            console.error(errMsg, error);
            if (element) {
                this._showRetryResult(element, retryId, false, 'Retry context unavailable');
            }
            return;
        }
        const attemptNumber = context.retryAttempt || 0;
        const maxRetries = this.config.maxRetries;
        const retryDelay = this.config.retryDelay;
        
        if (attemptNumber >= maxRetries) {
            this._showRetryResult(element, retryId, false, 'Превышен максимум попыток');
            console.warn(`[ErrorHandler] Max retries (${maxRetries}) exceeded for error:`, error.code);
            return;
        }
        
        const retryBtn = element.querySelector('.error-notification-retry');
        const retryInfo = element.querySelector('.error-notification-retry-info');
        
        if (retryBtn) {
            retryBtn.disabled = true;
            retryBtn.textContent = '⏳';
        }
        
        let remainingSeconds = Math.ceil(retryDelay / 1000);
        
        const updateCountdown = () => {
            if (retryInfo) {
                retryInfo.textContent = `Повтор через ${remainingSeconds}с... (попытка ${attemptNumber + 1}/${maxRetries})`;
            }
        };
        
        updateCountdown();
        
        const countdownTimer = setInterval(() => {
            remainingSeconds--;
            if (remainingSeconds > 0) {
                updateCountdown();
            }
        }, 1000);
        
        const retryTimer = setTimeout(() => {
            clearInterval(countdownTimer);
            this._retryTimers.delete(retryId);
            
            const retryContext = {
                ...context,
                retryAttempt: attemptNumber + 1,
                originalError: error
            };
            
            console.log(`[ErrorHandler] Executing retry ${attemptNumber + 1}/${maxRetries} for error:`, error.code);
            
            if (this.emit) {
                this.emit('retry', {
                    ...error,
                    context: retryContext,
                    retryAttempt: attemptNumber + 1
                });
            }
            
            element.remove();
            
        }, retryDelay);
        
        this._retryTimers.set(retryId, { retryTimer, countdownTimer });
        element._retryId = retryId;
    };

    EH._showRetryResult = function(element, retryId, success, message) {
        const retryInfo = element.querySelector('.error-notification-retry-info');
        if (retryInfo) {
            retryInfo.textContent = message;
            retryInfo.className = 'error-notification-retry-info ' + (success ? 'success' : 'failed');
        }
        
        const retryBtn = element.querySelector('.error-notification-retry');
        if (retryBtn) {
            retryBtn.disabled = true;
            retryBtn.textContent = success ? '✓' : '✗';
        }
    };

    EH.cancelRetry = function(retryId) {
        const timers = this._retryTimers.get(retryId);
        if (timers) {
            clearTimeout(timers.retryTimer);
            clearInterval(timers.countdownTimer);
            this._retryTimers.delete(retryId);
            console.log(`[ErrorHandler] Cancelled retry:`, retryId);
        }
    };

    EH.cancelAllRetries = function() {
        for (const [retryId, timers] of this._retryTimers) {
            clearTimeout(timers.retryTimer);
            clearInterval(timers.countdownTimer);
        }
        this._retryTimers.clear();
        console.log('[ErrorHandler] Cancelled all retries');
    };

})(typeof window !== 'undefined' ? window : globalThis);
