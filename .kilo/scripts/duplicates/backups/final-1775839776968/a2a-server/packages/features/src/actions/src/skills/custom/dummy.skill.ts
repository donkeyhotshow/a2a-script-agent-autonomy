export const skill = {
  name: 'echo',
  version: '1.0.0',
  path: __filename,
  schema: { type: 'object', properties: { s: { type: 'string' } } },
  async execute({ s }: { s: string }) { return { out: s }; },
};
