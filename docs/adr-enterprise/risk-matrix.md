# Risk Matrix for Autonomous Agents

| Risk ID | Category | Description | Impact | Mitigation |
|---|---|---|---|---|
| R-001 | Security | Agent deletes production database | High | Read-only mode for critical paths; human-in-the-loop (HITL) for destructive commands. |
| R-002 | Cost | Infinite LLM loop consumption | Medium | Max token limits per session; circuit breakers for repeated errors. |
| R-003 | Privacy | Agent leaks secret keys in logs | High | Automated secret scanning on agent output; PII redaction. |
| R-004 | Stability | Unstable code merged to main | High | ADR-0082 mandatory verification loop. |
