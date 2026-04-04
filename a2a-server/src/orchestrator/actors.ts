import { Queue, Worker } from 'bullmq';
import { logger } from '../utils/logger.js';

export const teamQueue = new Queue('a2a-agent-team', {
  connection: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
  },
});

export function createTeamWorker() {
  const worker = new Worker('a2a-agent-team', async (job) => {
    const { taskId, goal, agentCount } = job.data;
    logger.info('[Actors] Spawning sub-agent team', { taskId, agentCount });
    
    // Simulate parallel execution
    const results = await Promise.all(
      Array.from({ length: agentCount }).map(async (_, i) => {
        // Mock agent logic
        return { agent: i, status: 'completed', result: `Fixed chunk ${i}` };
      })
    );

    return { taskId, results };
  });

  worker.on('completed', (job) => {
    logger.info('[Actors] Team goal achieved', { jobId: job.id });
  });

  return worker;
}

export async function spawnTeam(taskId: string, goal: string, count = 136) {
  await teamQueue.add('spawn', { taskId, goal, agentCount: count });
  logger.info('[Actors] Job added to team queue', { taskId });
}
