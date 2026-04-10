/**
 * @param {new () => unknown} Ctor
 */
export function applyTaskMonitorRouterGate(Ctor) {
  Object.assign(Ctor.prototype, {
    /**
     * Submit router choice or re-send task text when the UI shows a text "task" form (idle beat).
     * Router forms with `form.choices` never auto-advance — operator must POST /next with result.choice.
     * @returns {Promise<boolean>} true if a /next was sent, false otherwise
     */
    /**
     * @param {string} sessionId
     * @param {string} routerSearchText — first-phase text for router/RAG (short).
     * @param {object | null} preloadedSession
     * @param {{ twoPhase?: boolean, agentSpecText?: string, agentSpecGate?: { submitted: boolean } }} [options]
     */
    async tryAdvanceMonitorGate(sessionId, routerSearchText, preloadedSession = null, options = {}) {
      const sessionData =
        preloadedSession || (await this.getSession(sessionId, { includeContext: true }));
      if (!sessionData) return false;

      const twoPhase = Boolean(options.twoPhase);
      const agentSpecText =
        typeof options.agentSpecText === 'string' ? options.agentSpecText.trim() : '';
      const agentSpecGate = options.agentSpecGate;

      const form =
        sessionData?.context?.execution?.form ||
        sessionData?.execute?.form ||
        null;

      const choices = form && Array.isArray(form.choices) ? form.choices : [];
      if (choices.length > 0) {
        const autoOff = /^(0|false|no)$/i.test(
          String(process.env.TASK_MONITOR_ROUTER_AUTO_AGENT ?? '1').trim()
        );
        if (!autoOff) {
          const agentRow = choices.find(
            (c) =>
              c &&
              (c.id === 'agent' || String(c.type || '').toLowerCase() === 'agent')
          );
          const choiceId = agentRow?.id;
          if (choiceId) {
            const res = await this.sendNext(sessionId, { task: choiceId });
            if (res) {
              console.log(
                `Router step for session ${sessionId}: auto-selected choice "${choiceId}"`
              );
              return true;
            }
          }
        }
        console.log(
          `Router step for session ${sessionId}: manual choice required (monitor does not auto-select)`
        );
        return false;
      }

      const inputs = form && Array.isArray(form.input) ? form.input : [];
      // Legacy task/message form fields; router handoff may use execute.message only (no form).
      const hasTaskField = inputs.some(
        (i) =>
          i &&
          (i.name === 'task' ||
            i.name === 'message' ||
            (i.type === 'text' && !i.name))
      );
      const routerText = typeof routerSearchText === 'string' ? routerSearchText.trim() : '';

      const execAction = sessionData?.context?.execution?.action ?? sessionData?.execute?.action;
      const execStep = sessionData?.context?.execution?.step ?? sessionData?.execute?.step;

      /** Two-phase: full spec after router→agent when UI shows no input form (LLM runs from context.task). */
      async function submitAgentSpecOnce() {
        if (!twoPhase || !agentSpecText || agentSpecGate?.submitted) return false;
        if (execAction !== 'agent' || (execStep !== 'request' && execStep !== 'start')) {
          return false;
        }
        let res = await this.sendNext(sessionId, { task: agentSpecText });
        if (!res || res.error) {
          res = await this.sendNext(sessionId, { result: { message: agentSpecText } });
        }
        if (res) {
          agentSpecGate.submitted = true;
          const prev = agentSpecText.length > 100 ? `${agentSpecText.slice(0, 100)}…` : agentSpecText;
          console.log(`[task-monitor] Agent handoff: submitted file/spec task (${prev})`);
          return true;
        }
        return false;
      }

      if (hasTaskField && (routerText || (twoPhase && agentSpecText))) {
        if (execAction === 'agent' && (execStep === 'request' || execStep === 'start')) {
          const ok = await submitAgentSpecOnce.call(this);
          if (ok) return true;
          if (execStep === 'request' && (!twoPhase || !agentSpecText)) {
            return false;
          }
        }
        if (!routerText) {
          return false;
        }
        const res = await this.sendNext(sessionId, { result: { message: routerText } });
        return !!res;
      }

      if (
        twoPhase &&
        agentSpecText &&
        agentSpecGate &&
        !agentSpecGate.submitted &&
        execAction === 'agent' &&
        (execStep === 'request' || execStep === 'start') &&
        choices.length === 0 &&
        !hasTaskField
      ) {
        return submitAgentSpecOnce.call(this);
      }

      return false;
    },
  });
}
