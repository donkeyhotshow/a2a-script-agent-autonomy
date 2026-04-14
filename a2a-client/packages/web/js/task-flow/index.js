/**
 * TaskFlow Index - Main module aggregation
 */

window.TaskFlow = window.TaskFlow || {};

// In this repo, TaskFlow files are loaded as modules via <script type="module"> in index.html.
// Keep aggregation purely from globals to avoid fragile ESM export requirements.
Object.assign(window.TaskFlow, {
    init: window.TaskFlow.init,
    loader: window.TaskFlow.loader,
    tasks: window.TaskFlow.tasks,
    messages: window.TaskFlow.messages,
    render: window.TaskFlow.render,
    renderLayout: window.TaskFlow.renderLayout,
    getSlots: window.TaskFlow.getSlots,
});

// Also expose render utilities
if (window.TaskFlowRender) {
    window.TaskFlow.renderLayout = window.TaskFlowRender.buildGrayRoomHtml ? 
        (context) => window.TaskFlowRender.buildGrayRoomHtml(context) + window.TaskFlowRender.buildInterruptTraceHtml(context) : 
        window.TaskFlow.renderLayout;
}

export const init = window.TaskFlow.init;
export const loader = window.TaskFlow.loader;
export const tasks = window.TaskFlow.tasks;
export const messages = window.TaskFlow.messages;
export const render = window.TaskFlow.render;
export const renderLayout = window.TaskFlow.renderLayout;
export const getSlots = window.TaskFlow.getSlots;
