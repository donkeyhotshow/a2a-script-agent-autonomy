/**
 * TaskFlow Layout Renderer
 * 
 * GR-S-08: `context.workbench.slots.grayRoom` control envelope
 * Interrupt trace from server LLM chain
 */

(function (global) {
    'use strict';

    if (!global.TaskFlowRender) global.TaskFlowRender = {};
    const TFR = global.TaskFlowRender;

    /**
     * Escape HTML special characters
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    function escapeHtml(str) {
        if (typeof str !== 'string') return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    TFR.escapeHtml = escapeHtml;

    /**
     * Build interrupt trace HTML from context.workbench.slots.interruptTrace
     * @param {object} context - Session context
     * @returns {string} HTML string
     */
    function buildInterruptTraceHtml(context) {
        const slots = context?.workbench?.slots;
        const events = slots?.interruptTrace;
        if (!Array.isArray(events) || events.length === 0) return '';
        
        const rows = events
            .map((ev, i) => {
                if (!ev || typeof ev !== 'object') return '';
                const k = escapeHtml(String(ev.kind || '?'));
                const parts = [k];
                if (ev.phase) parts.push(escapeHtml(String(ev.phase)));
                if (ev.chars != null) parts.push(`${escapeHtml(String(ev.chars))} chars`);
                if (ev.interruptReason) parts.push('→ ' + escapeHtml(String(ev.interruptReason)));
                if (ev.reason) parts.push(escapeHtml(String(ev.reason)));
                if (ev.continueLoop != null) parts.push(ev.continueLoop ? 'reenter' : 'stop');
                if (ev.purpose) parts.push(escapeHtml(String(ev.purpose)));
                if (ev.ok != null) parts.push(ev.ok ? 'ok' : 'fail');
                if (ev.meta) parts.push(escapeHtml(String(ev.meta)));
                if (ev.note) parts.push(escapeHtml(String(ev.note)));
                if (ev.detail) parts.push(escapeHtml(String(ev.detail)));
                const line = parts.filter(Boolean).join(' · ');
                return `<li class="task-flow-interrupt-trace-item"><span class="task-flow-interrupt-trace-idx">${i + 1}.</span> ${line}</li>`;
            })
            .filter(Boolean)
            .join('');
        if (!rows) return '';
        return `<details class="task-flow-interrupt-trace"><summary class="task-flow-interrupt-trace-summary">Server LLM chain (${events.length} steps)</summary><ol class="task-flow-interrupt-trace-list">${rows}</ol></details>`;
    }

    /**
     * GR-S-08: Build gray room HTML from context.workbench.slots.grayRoom
     * @param {object} context - Session context
     * @returns {string} HTML string
     */
    function buildGrayRoomHtml(context) {
        const g = context?.workbench?.slots?.grayRoom;
        if (!g || typeof g !== 'object') return '';
        
        const rows = [];
        if (g.phase != null) rows.push(['Phase', String(g.phase)]);
        if (g.status != null) rows.push(['Status', String(g.status)]);
        if (g.turn != null) rows.push(['Turn', String(g.turn)]);
        if (g.maxTurns != null) rows.push(['Max turns', String(g.maxTurns)]);
        if (g.remainingBudget != null) rows.push(['Remaining budget', String(g.remainingBudget)]);
        if (g.lastReason) rows.push(['Last reason', String(g.lastReason)]);
        if (g.planId) rows.push(['Plan', String(g.planId)]);
        if (g.traceRef && typeof g.traceRef === 'object' && g.traceRef.length != null) {
            rows.push(['Trace length', String(g.traceRef.length)]);
        }
        if (g.timestamps && typeof g.timestamps === 'object') {
            if (g.timestamps.startedAt) rows.push(['Started', String(g.timestamps.startedAt)]);
            if (g.timestamps.lastUpdateAt) rows.push(['Updated', String(g.timestamps.lastUpdateAt)]);
        }
        
        if (rows.length === 0) return '';
        
        const inner = rows
            .map(
                ([k, v]) =>
                    `<div class="task-flow-gray-room-row"><span class="task-flow-gray-room-k">${escapeHtml(k)}</span> <span class="task-flow-gray-room-v">${escapeHtml(v)}</span></div>`
            )
            .join('');
        return `<details class="task-flow-gray-room"><summary class="task-flow-gray-room-summary">Gray room</summary><div class="task-flow-gray-room-body">${inner}</div></details>`;
    }

    /**
     * Build workbench sections HTML
     * @param {object} context - Session context
     * @returns {string} HTML string
     */
    function buildWorkbenchSectionsHtml(context) {
        const sections = context?.workbench?.sections;
        if (!sections) return '';
        
        let html = '<div class="task-flow-workbench-sections">';
        for (const [sectionName, sectionData] of Object.entries(sections)) {
            if (sectionData === null || sectionData === undefined) continue;
            
            let sectionHtml = '';
            if (Array.isArray(sectionData)) {
                sectionHtml = `<ul class="task-flow-section-list">${sectionData.map(item => {
                    if (typeof item === 'object' && item !== null) {
                        try {
                            const content = JSON.stringify(item, null, 2);
                            return `<li><details><summary>${escapeHtml(String(sectionName))} item</summary><pre class="task-flow-section-json">${escapeHtml(content)}</pre></details></li>`;
                        } catch (e) {
                            return `<li>${escapeHtml(String(sectionName))}: ${escapeHtml(String(item))}</li>`;
                        }
                    } else {
                        return `<li>${escapeHtml(String(item))}</li>`;
                    }
                }).join('')}</ul>`;
            } else if (typeof sectionData === 'object' && sectionData !== null) {
                try {
                    const content = JSON.stringify(sectionData, null, 2);
                    sectionHtml = `<details><summary>${escapeHtml(String(sectionName))}</summary><pre class="task-flow-section-json">${escapeHtml(content)}</pre></details>`;
                } catch (e) {
                    sectionHtml = `<div>${escapeHtml(String(sectionName))}: ${escapeHtml(String(sectionData))}</div>`;
                }
            } else {
                sectionHtml = `<div>${escapeHtml(String(sectionName))}: ${escapeHtml(String(sectionData))}</div>`;
            }
            
            html += `<div class="task-flow-section">${sectionHtml}</div>`;
        }
        
        html += '</div>';
        return html;
    }

    TFR.buildInterruptTraceHtml = buildInterruptTraceHtml;
    TFR.buildGrayRoomHtml = buildGrayRoomHtml;
    TFR.buildWorkbenchSectionsHtml = buildWorkbenchSectionsHtml;

})(typeof window !== 'undefined' ? window : global);
