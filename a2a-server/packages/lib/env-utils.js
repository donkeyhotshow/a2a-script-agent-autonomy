"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readDialogHubLlmResubmitMax = readDialogHubLlmResubmitMax;
/** Max hub LLM promise resubmits before failing (`DIALOG_HUB_LLM_RESUBMIT_MAX`, default 2). */
function readDialogHubLlmResubmitMax() {
    var n = parseInt(process.env.DIALOG_HUB_LLM_RESUBMIT_MAX || '2', 10);
    return Number.isFinite(n) && n >= 0 ? n : 2;
}
