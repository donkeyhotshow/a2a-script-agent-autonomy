#!/usr/bin/env node

/**
 * Debug script + DevTools Panel - отладка и мониторинг состояния системы
 * 
 * Функциональность:
 * - Открытие браузера и логирование консольных сообщений
 * - DevTools panel в браузере для мониторинга session state
 * - Инспектор context (workbench, history)
 * - Логирование входящих execute payloads
 * - История action execution
 * 
 * Активация: Только в режиме разработки (DEV_MODE=1)
 */

const { chromium } = require('playwright');

// Конфигурация
const CONFIG = {
    devMode: process.env.DEV_MODE === '1' || process.env.NODE_ENV !== 'production',
    logExecutePayloads: process.env.LOG_EXECUTE === '1',
    consoleFilter: [
        '[WindowState]', '[WindowEvents]', '[Render]', '[SessionStore]',
        'toggleSessionWindow', 'createSessionWindow'
    ],
    apiBaseUrl: process.env.A2A_CLIENT_URL || 'http://localhost:5173'
};

// Хранилище для истории action execution
const actionHistory = [];
const executeLog = [];

/**
 * Логирование action с timestamp
 */
function logAction(type, data) {
    const entry = {
        timestamp: new Date().toISOString(),
        type,
        data: JSON.parse(JSON.stringify(data))
    };
    actionHistory.push(entry);
    if (CONFIG.devMode) {
        console.log(`[ActionExecutor] ${type}:`, JSON.stringify(data, null, 2));
    }
}

/**
 * Логирование execute payload
 */
function logExecute(actionType, payload) {
    const entry = {
        timestamp: new Date().toISOString(),
        actionType,
        payload: JSON.parse(JSON.stringify(payload)),
        duration: 0
    };
    executeLog.push(entry);
    if (CONFIG.logExecutePayloads) {
        console.log(`[Execute] ${actionType}:`, JSON.stringify(payload, null, 2));
    }
    return entry;
}

/**
 * Форматирование context для отображения
 */
function formatContext(context) {
    if (!context) return null;
    
    return {
        execution: context.execution || null,
        workbench: {
            sections: context.workbench?.sections || {},
            slots: context.workbench?.slots || {},
            ops: context.workbench?.ops || []
        },
        history: context.history || [],
        sessionId: context.session_id || null
    };
}

/**
 * Создание DevTools panel HTML
 */
function createDevToolsPanelHtml() {
    return `
        <div id="devtools-panel" style="
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 300px;
            background: #1e1e1e;
            color: #d4d4d4;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 12px;
            z-index: 99999;
            display: none;
            flex-direction: column;
            border-top: 2px solid #007acc;
        ">
            <div style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                background: #252526;
                border-bottom: 1px solid #3c3c3c;
            ">
                <span style="font-weight: bold; color: #007acc;">🔧 DevTools Panel</span>
                <div style="display: flex; gap: 8px;">
                    <button onclick="window.DevTools.showTab('session')" style="
                        background: #333; color: #fff; border: none; padding: 4px 12px;
                        cursor: pointer; border-radius: 2px;
                    ">Session</button>
                    <button onclick="window.DevTools.showTab('context')" style="
                        background: #333; color: #fff; border: none; padding: 4px 12px;
                        cursor: pointer; border-radius: 2px;
                    ">Context</button>
                    <button onclick="window.DevTools.showTab('execute')" style="
                        background: #333; color: #fff; border: none; padding: 4px 12px;
                        cursor: pointer; border-radius: 2px;
                    ">Execute</button>
                    <button onclick="window.DevTools.showTab('history')" style="
                        background: #333; color: #fff; border: none; padding: 4px 12px;
                        cursor: pointer; border-radius: 2px;
                    ">History</button>
                    <button onclick="window.DevTools.toggle()" style="
                        background: #c62828; color: #fff; border: none; padding: 4px 12px;
                        cursor: pointer; border-radius: 2px;
                    ">✕ Close</button>
                </div>
            </div>
            <div id="devtools-content" style="
                flex: 1;
                overflow: auto;
                padding: 12px;
            ">
                <div style="color: #858585;">Press Ctrl+Shift+D to toggle DevTools Panel</div>
            </div>
        </div>
        <script>
        (function() {
            const panel = document.getElementById('devtools-panel');
            const content = document.getElementById('devtools-content');
            let currentTab = 'session';
            
            window.DevTools = {
                isOpen: false,
                
                toggle: function() {
                    this.isOpen = !this.isOpen;
                    panel.style.display = this.isOpen ? 'flex' : 'none';
                    if (this.isOpen) {
                        this.showTab(currentTab);
                    }
                },
                
                showTab: function(tab) {
                    currentTab = tab;
                    this.render();
                },
                
                getSessionState: function() {
                    const store = window.SessionStore;
                    if (!store) return { error: 'SessionStore not found' };
                    
                    return {
                        sessionId: store.sessionId,
                        projectId: store.projectId,
                        execute: store.execute,
                        context: store.context,
                        messages: store.messages,
                        asyncPending: store.asyncPending,
                        promiseId: store.promiseId
                    };
                },
                
                getContextInspector: function() {
                    const store = window.SessionStore;
                    if (!store || !store.context) return { error: 'Context not found' };
                    
                    const ctx = store.context;
                    return {
                        execution: ctx.execution,
                        workbench: ctx.workbench,
                        history: ctx.history,
                        sessionId: ctx.session_id
                    };
                },
                
                render: function() {
                    let html = '';
                    switch(currentTab) {
                        case 'session':
                            const state = this.getSessionState();
                            html = '<h3 style="color: #007acc; margin: 0 0 12px;">Session State</h3>';
                            html += '<pre style="background: #2d2d2d; padding: 12px; border-radius: 4px; overflow: auto;">';
                            html += JSON.stringify(state, null, 2);
                            html += '</pre>';
                            break;
                            
                        case 'context':
                            const ctx = this.getContextInspector();
                            html = '<h3 style="color: #007acc; margin: 0 0 12px;">Context Inspector</h3>';
                            
                            html += '<div style="margin-bottom: 16px;">';
                            html += '<h4 style="color: #ce9178; margin: 8px 0;">execution</h4>';
                            html += '<pre style="background: #2d2d2d; padding: 12px; border-radius: 4px; overflow: auto;">';
                            html += JSON.stringify(ctx.execution || {}, null, 2);
                            html += '</pre></div>';
                            
                            html += '<div style="margin-bottom: 16px;">';
                            html += '<h4 style="color: #ce9178; margin: 8px 0;">workbench</h4>';
                            html += '<pre style="background: #2d2d2d; padding: 12px; border-radius: 4px; overflow: auto;">';
                            html += JSON.stringify(ctx.workbench || {}, null, 2);
                            html += '</pre></div>';
                            
                            html += '<div style="margin-bottom: 16px;">';
                            html += '<h4 style="color: #ce9178; margin: 8px 0;">history</h4>';
                            html += '<pre style="background: #2d2d2d; padding: 12px; border-radius: 4px; overflow: auto;">';
                            html += JSON.stringify(ctx.history || [], null, 2);
                            html += '</pre></div>';
                            break;
                            
                        case 'execute':
                            html = '<h3 style="color: #007acc; margin: 0 0 12px;">Execute Payloads</h3>';
                            const store = window.SessionStore;
                            html += '<pre style="background: #2d2d2d; padding: 12px; border-radius: 4px; overflow: auto;">';
                            html += JSON.stringify(store?.execute || null, null, 2);
                            html += '</pre>';
                            break;
                            
                        case 'history':
                            html = '<h3 style="color: #007acc; margin: 0 0 12px;">Action Execution History</h3>';
                            const history = window.__actionHistory || [];
                            if (history.length === 0) {
                                html += '<div style="color: #858585;">No actions recorded yet</div>';
                            } else {
                                history.forEach(function(entry, idx) {
                                    html += '<div style="margin-bottom: 12px; padding: 8px; background: #2d2d2d; border-radius: 4px;">';
                                    html += '<span style="color: #858585;">[' + entry.timestamp + ']</span> ';
                                    html += '<span style="color: #4ec9b0;">' + entry.type + '</span>';
                                    html += '<pre style="margin: 8px 0 0; overflow: auto;">';
                                    html += JSON.stringify(entry.data, null, 2);
                                    html += '</pre></div>';
                                });
                            }
                            break;
                    }
                    content.innerHTML = html;
                }
            };
            
            // Keyboard shortcut: Ctrl+Shift+D
            document.addEventListener('keydown', function(e) {
                if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                    e.preventDefault();
                    window.DevTools.toggle();
                }
            });
            
            // Expose to global for action logging
            window.__actionHistory = [];
            window.__devToolsLogAction = function(type, data) {
                window.__actionHistory.push({
                    timestamp: new Date().toISOString(),
                    type: type,
                    data: data
                });
            };
            
            console.log('[DevTools] Panel ready. Press Ctrl+Shift+D to toggle');
        })();
        </script>
    `;
}

async function main() {
    if (!CONFIG.devMode) {
        console.log('DevTools disabled - not in development mode');
        return;
    }
    
    console.log('Starting debug session with DevTools Panel...');
    console.log('DevTools: Press Ctrl+Shift+D in browser to toggle panel');
    
    const browser = await chromium.launch({ 
        headless: false,
        devTools: true 
    });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Добавляем DevTools panel script на страницу
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        
        // Логируем интересные сообщения
        const shouldLog = CONFIG.consoleFilter.some(f => text.includes(f));
        if (shouldLog) {
            console.log(`[CONSOLE ${type}]: ${text}`);
        }
        
        // Логируем actions
        if (text.includes('[ActionExecutor]') || text.includes('[Action]')) {
            try {
                const data = text.replace(/^.*\[Action[^\]]*\]/, '').trim();
                logAction('CONSOLE', { message: text });
            } catch (e) {
                // ignore
            }
        }
    });
    
    page.on('pageerror', error => {
        console.error('[PAGE ERROR]:', error.message);
    });
    
    try {
        console.log('Navigating to', CONFIG.apiBaseUrl);
        await page.goto(CONFIG.apiBaseUrl, { waitUntil: 'networkidle', timeout: 30000 });
        console.log('Page loaded');
        
        // Инжектируем DevTools panel
        await page.evaluate(createDevToolsPanelHtml);
        
        // Ожидаем взаимодействия
        await page.waitForTimeout(5000);
        
        console.log('\n=== Debug Session Active ===');
        console.log('DevTools Panel: Press Ctrl+Shift+D in browser');
        console.log('Logs are being captured...\n');
        
        // Оставляем браузер открытым
        await browser.waitForEvent('close');
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await browser.close();
    }
}

main().catch(console.error);
