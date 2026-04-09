import { chainSyncInvokesForAgentTools } from './utils/agent-rag-chain.ts';

export async function maybeChainAgentTools({
    cwd,
    sessionId,
    a2aServerUrl,
    startStepNum,
    serverResponse,
    mergedContext,
    messages,
}) {
    if (!serverResponse) {
        return {
            stepNum: startStepNum,
            serverResponse,
            savedContext: mergedContext,
        };
    }

    try {
        const out = await chainSyncInvokesForAgentTools({
            cwd,
            sessionId,
            a2aServerUrl,
            startStepNum,
            serverResponse,
            mergedContext,
            messages,
        });
        return {
            stepNum: out.stepNum,
            serverResponse: out.serverResponse,
            savedContext: out.savedContext,
        };
    } catch (chainErr) {
        console.error('[VitePlugin] agent tool chain:', chainErr?.message || chainErr);
        return {
            stepNum: startStepNum,
            serverResponse,
            savedContext: mergedContext,
        };
    }
}

