/**
 * Plasticine UI - Main Entry Point
 * Объединяет все модули
 * 
 * Модули:
 * - panel.js - класс панели
 * - drawers.js - управление ящиками
 * - core.js - основной класс UI
 */

(function (global) {
    'use strict';

    // Модули загружаются глобально:
    // - global.PlasticinePanel (из panel.js)
    // - global.PanelDrawers (из drawers.js)  
    // - global.PlasticineUI (из core.js)

    // Функция для быстрого создания UI
    global.createPlasticineUI = function(options = {}) {
        return new global.PlasticineUI(options);
    };

    // Экспортируем отдельные компоненты для удобства
    global.Plasticine = {
        Panel: global.PlasticinePanel,
        Drawers: global.PanelDrawers,
        UI: global.PlasticineUI,
        createUI: global.createPlasticineUI,
        createPanel: global.createPanelDOM,
        createCube: global.createCubeDOM,
        createZones: global.createZonesDOM
    };

})(typeof window !== 'undefined' ? window : global);
