/**
 * AI Actions Storage Module - сохранение и загрузка состояния
 */

(function (global) {
    'use strict';

    /**
     * Добавить методы storage к классу AIActionsSessionPanel
     * @param {Function} PanelClass - класс AIActionsSessionPanel
     */
    function mixinStorage(PanelClass) {

        /**
         * Сохранить в custom storage
         */
        PanelClass.prototype.saveToStorage = async function() {
            try {
                const data = this.exportAllSessions();
                // Try async storage first, fallback to sync
                try {
                    await StorageAPI.aiActions.setItem('sessions', JSON.stringify(data));
                    await StorageAPI.aiActions.setItem('current-session', this.currentSessionId || '');
                } catch (asyncError) {
                    console.warn('[AIActionsSessionPanel] Async storage failed, using sync fallback:', asyncError);
                    StorageAPI.aiActions.setItemSync('sessions', JSON.stringify(data));
                    StorageAPI.aiActions.setItemSync('current-session', this.currentSessionId || '');
                }
            } catch (e) {
                console.error('[AIActionsSessionPanel] Failed to save to storage:', e);
            }
        };

        /**
         * Загрузить из custom storage
         * @returns {Array} загруженные сессии
         */
        PanelClass.prototype.loadFromStorage = async function() {
            try {
                // Try async storage first, fallback to sync
                let data;
                try {
                    data = await StorageAPI.aiActions.getItem('sessions');
                } catch (asyncError) {
                    console.warn('[AIActionsSessionPanel] Async storage failed, using sync fallback:', asyncError);
                    data = StorageAPI.aiActions.getItemSync('sessions');
                }

                if (data) {
                    const sessions = typeof data === 'string' ? JSON.parse(data) : data;
                    sessions.forEach(session => {
                        this.sessions.set(session.id, session);
                    });
                    this._renderSessionList();
                    this._updateSessionCount();

                    // Восстанавливаем текущую сессию
                    let currentId;
                    try {
                        currentId = await StorageAPI.aiActions.getItem('current-session');
                    } catch (asyncError) {
                        currentId = StorageAPI.aiActions.getItemSync('current-session');
                    }

                    if (currentId && this.sessions.has(currentId)) {
                        this.switchToSession(currentId);
                    }

                    return sessions;
                }
            } catch (e) {
                console.error('[AIActionsSessionPanel] Failed to load from storage:', e);
            }
            return [];
        };

        /**
         * Очистить custom storage
         */
        PanelClass.prototype.clearStorage = async function() {
            try {
                // Try async storage first, fallback to sync
                try {
                    await StorageAPI.aiActions.removeItem('sessions');
                    await StorageAPI.aiActions.removeItem('current-session');
                } catch (asyncError) {
                    console.warn('[AIActionsSessionPanel] Async storage failed, using sync fallback:', asyncError);
                    StorageAPI.aiActions.removeItemSync('sessions');
                    StorageAPI.aiActions.removeItemSync('current-session');
                }
            } catch (e) {
                console.error('[AIActionsSessionPanel] Failed to clear storage:', e);
            }
        };

        return PanelClass;
    }

    // Export mixin
    global.mixinAIStorage = mixinStorage;

})(typeof window !== 'undefined' ? window : globalThis);
