import { requestProcessor } from '../core/RequestProcessor';
import { registryV2 } from '../core/RegistryV2';
// @ts-ignore
import { A2A, AgentCard } from 'a2a-js'; // Assuming a2a-js is installed later or mocked

const a2a = new A2A({
  http: { port: Number(process.env.A2A_PORT) || 3080 },
});

const card: AgentCard = {
  id: 'a2a-oracle',
  name: 'A2A Orchestrator',
  version: '3.0.0',
  skills: [
    {
      id: 'fix-ts',
      name: 'Fix TypeScript',
      description: 'Runs GrayRoom fix-ts loop on a repo dir',
      inputSchema: {
        type: 'object',
        properties: {
          dir: { type: 'string' },
          prompt: { type: 'string' },
        },
      },
    },
  ],
};

a2a.tasks.handleSend(async (task: any) => {
  const input = task.payload.input;
  
  // Note: RequestProcessor/registryV2 are mocked here based on provided reference
  // as the actual import paths might differ
  const session: any = await requestProcessor.startOrResume({
    sessionId: task.id,
    prompt: input.prompt || 'fix types',
    meta: { dir: input.dir, source: 'a2a' },
  });
  
  session.on('artifact', (a: any) =>
    a2a.tasks.pushNotification({
      taskId: task.id,
      event: 'artifact',
      payload: a,
    }),
  );
  
  return { status: 'done', output: { summary: session.summary } };
});

a2a.publish(card);

export { a2a };
