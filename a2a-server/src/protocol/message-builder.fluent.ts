/** Fluent message builder stub. */

export interface FluentMessageBuilder {
  sessionId(sessionId: string): FluentMessageBuilder;
  context(ctx: unknown): FluentMessageBuilder;
  build(): Record<string, unknown>;
}

export function createFluentMessageBuilder(): FluentMessageBuilder {
  let sessionId = '';
  let context: unknown = null;
  return {
    sessionId(s: string) {
      sessionId = s;
      return this;
    },
    context(c: unknown) {
      context = c;
      return this;
    },
    build() {
      return { version: '1.0', session_id: sessionId, context };
    },
  };
}
