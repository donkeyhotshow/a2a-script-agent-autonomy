/** Max hub LLM promise resubmits before failing (`DIALOG_HUB_LLM_RESUBMIT_MAX`, default 2). */
export function readDialogHubLlmResubmitMax() {
    const n = parseInt(process.env.DIALOG_HUB_LLM_RESUBMIT_MAX || '2', 10);
    return Number.isFinite(n) && n >= 0 ? n : 2;
}
//# sourceMappingURL=env-utils.js.map