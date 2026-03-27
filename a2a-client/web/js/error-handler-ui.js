/**
 * Error Handler UI Module
 * Handles DOM elements, modals, and toasts for errors.
 */

(function (global) {
    'use strict';

    if (!global.ErrorHandler) global.ErrorHandler = {};
    const EH = global.ErrorHandler;

    EH.displayError = function(error) {
        let container = document.getElementById('errorNotifications');
        if (!container) {
            container = this._createErrorContainer();
        }

        const errorEl = this._createErrorElement(error);
        container.appendChild(errorEl);

        if (this.config && this.config.autoHideDelay > 0) {
            setTimeout(() => {
                errorEl.classList.add('hiding');
                setTimeout(() => errorEl.remove(), 300);
            }, this.config.autoHideDelay);
        }

        if (global.addNotification) {
            global.addNotification(error.message, 'error');
        }
    };

    EH._createErrorContainer = function() {
        const container = document.createElement('div');
        container.id = 'errorNotifications';
        container.className = 'error-notifications';
        document.body.appendChild(container);
        return container;
    };

    EH._createErrorElement = function(error) {
        const el = document.createElement('div');
        el.className = `error-notification error-${error.code?.toLowerCase() || 'general'}`;
        
        let html = `
            <div class="error-notification-icon">⚠️</div>
            <div class="error-notification-content">
                <div class="error-notification-message">${global.escapeHtml(error.message)}</div>
        `;

        if (error.context?.action) {
            html += `<div class="error-notification-action">Action: ${global.escapeHtml(error.context.action)}</div>`;
        }

        if (this.config && this.config.showStackTrace && error.stack) {
            html += `<pre class="error-notification-stack">${global.escapeHtml(error.stack)}</pre>`;
        }

        if (this.config && this.config.showDetailsButton) {
            html += `<button class="error-notification-details" title="Показать детали">Details</button>`;
        }

        html += '</div>';

        if (this.config && this.config.showDismissButton) {
            html += `<button class="error-notification-close" title="Dismiss">&times;</button>`;
        }

        let retryId;
        if (error.retryable) {
            retryId = `retry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            html += `<button class="error-notification-retry" data-retry-id="${retryId}" title="Retry">↻ Повторить</button>`;
            html += `<div class="error-notification-retry-info" data-retry-id="${retryId}"></div>`;
        }

        el.innerHTML = html;

        const closeBtn = el.querySelector('.error-notification-close');
        closeBtn?.addEventListener('click', () => {
            el.classList.add('hiding');
            setTimeout(() => el.remove(), 300);
        });

        const retryBtn = el.querySelector('.error-notification-retry');
        retryBtn?.addEventListener('click', () => {
            if (this._executeRetry) {
                this._executeRetry(error, retryId, el);
            }
        });

        const detailsBtn = el.querySelector('.error-notification-details');
        detailsBtn?.addEventListener('click', () => {
            if (this.showErrorDetails) this.showErrorDetails(error);
        });

        return el;
    };

    EH.showErrorDetails = function(error) {
        if (typeof document === 'undefined') return;

        const ctx = error.context ?? {};
        const requestUrl = ctx.url ?? ctx.requestUrl ?? '';
        const requestMethod = (ctx.method ?? ctx.requestMethod ?? 'GET').toUpperCase();
        const requestPayload = ctx.payload ?? ctx.body ?? ctx.requestPayload;

        const stackText = error.stack || 'Stack trace unavailable';
        const contextText = JSON.stringify(ctx, null, 2) || 'No context data';
        const metaPieces = [];
        if (error.code) metaPieces.push(error.code);
        if (ctx.status) metaPieces.push(`status ${ctx.status}`);
        const metaText = metaPieces.join(' · ') || 'Details';

        const requestBlock = [
            requestUrl ? `URL: ${requestUrl}` : null,
            `Method: ${requestMethod}`,
            requestPayload != null && requestPayload !== '' ? `Request payload:\n${typeof requestPayload === 'string' ? requestPayload : JSON.stringify(requestPayload, null, 2)}` : null
        ].filter(Boolean).join('\n');

        const copyPayload = [
            `Message: ${error.message}`,
            `Code: ${error.code || 'UNSPECIFIED'}`,
            requestBlock ? `Request:\n${requestBlock}` : null,
            'Stack trace:',
            stackText,
            'Context:',
            contextText
        ].filter(Boolean).join('\n\n');

        const existingOverlay = document.querySelector('.error-detail-backdrop');
        if (existingOverlay) existingOverlay.remove();

        const backdrop = document.createElement('div');
        backdrop.className = 'error-detail-backdrop';
        backdrop.addEventListener('click', (evt) => {
            if (evt.target === backdrop) backdrop.remove();
        });

        const modal = document.createElement('div');
        modal.className = 'error-detail-modal';

        const header = document.createElement('div');
        header.className = 'error-detail-header';

        const titleWrapper = document.createElement('div');
        const title = document.createElement('div');
        title.className = 'error-detail-title';
        title.textContent = error.message || 'Error details';

        const meta = document.createElement('div');
        meta.className = 'error-detail-meta';
        meta.textContent = metaText;

        titleWrapper.appendChild(title);
        titleWrapper.appendChild(meta);

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'error-detail-close';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => backdrop.remove());

        header.appendChild(titleWrapper);
        header.appendChild(closeBtn);

        const body = document.createElement('div');
        body.className = 'error-detail-body';

        if (requestUrl || requestPayload != null) {
            const reqLabel = document.createElement('div');
            reqLabel.className = 'error-detail-section-title';
            reqLabel.textContent = 'Request';
            const reqPre = document.createElement('pre');
            reqPre.className = 'error-detail-request';
            reqPre.textContent = [
                requestUrl ? `URL: ${requestUrl}` : null,
                `Method: ${requestMethod}`,
                requestPayload != null && requestPayload !== ''
                    ? `Payload:\n${(typeof requestPayload === 'string' ? requestPayload : JSON.stringify(requestPayload, null, 2))}`
                    : null
            ].filter(Boolean).join('\n');
            body.appendChild(reqLabel);
            body.appendChild(reqPre);
        }

        const stackLabel = document.createElement('div');
        stackLabel.className = 'error-detail-section-title';
        stackLabel.textContent = 'Stack trace';

        const stackPre = document.createElement('pre');
        stackPre.className = 'error-detail-stack';
        stackPre.textContent = stackText;

        const contextLabel = document.createElement('div');
        contextLabel.className = 'error-detail-section-title';
        contextLabel.textContent = 'Context';

        const contextPre = document.createElement('pre');
        contextPre.className = 'error-detail-context';
        contextPre.textContent = contextText;

        body.appendChild(stackLabel);
        body.appendChild(stackPre);
        body.appendChild(contextLabel);
        body.appendChild(contextPre);

        const footer = document.createElement('div');
        footer.className = 'error-detail-footer';

        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'error-detail-copy';
        copyBtn.textContent = 'Copy';
        copyBtn.addEventListener('click', async () => {
            try {
                if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(copyPayload);
                } else {
                    throw new Error('clipboard not available');
                }
                copyBtn.textContent = 'Copied';
            } catch (err) {
                const tmp = document.createElement('textarea');
                tmp.value = copyPayload;
                document.body.appendChild(tmp);
                tmp.select();
                document.execCommand('copy');
                tmp.remove();
                copyBtn.textContent = 'Copied';
            } finally {
                setTimeout(() => {
                    copyBtn.textContent = 'Copy';
                }, 1500);
            }
        });

        footer.appendChild(copyBtn);

        modal.appendChild(header);
        modal.appendChild(body);
        modal.appendChild(footer);
        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);
    };

})(typeof window !== 'undefined' ? window : globalThis);
