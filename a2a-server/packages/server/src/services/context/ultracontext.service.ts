export class UltraContextService {
  async getContext(_sessionId: string): Promise<Record<string, unknown>> { return {}; }
}
export const ultraContextService = new UltraContextService();
