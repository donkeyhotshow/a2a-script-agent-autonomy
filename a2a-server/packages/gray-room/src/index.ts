/**
 * Gray Room Feature
 *
 * Migrated from the core gray-room functionality to a pluggable feature.
 * Handles interrupt processing after LLM calls.
 */

import { GrayRoomOrchestrator } from './core/request-processor/gray-room-orchestrator.js';
import {
  readGrayRoomInterruptBudget,
  shouldUseGrayRoom,
} from './core/request-processor/gray-room-trigger.js';
import { getPromptsTransformsPath } from '../../transform/index.js';
import { features } from '../../config/index.js';

/** Minimal feature event interface */
export interface FeatureEvent {
  type: string;
  context: Record<string, unknown>;
  data?: unknown;
}

/** Minimal feature action interface */
export interface FeatureAction {
  name: string;
  priority: number;
  enabled: boolean;
  execute(event: FeatureEvent): Promise<Record<string, unknown> | void>;
}

export class GrayRoomFeature implements FeatureAction {
  name = 'gray-room';
  priority = 100; // High priority to run after other features
  enabled = features.transform.grayRoom;

  private orchestrator: GrayRoomOrchestrator;

  constructor() {
    this.orchestrator = new GrayRoomOrchestrator({
      promptsTransformsPath: getPromptsTransformsPath(),
      maxInterruptTurns: readGrayRoomInterruptBudget(),
    });
  }

  async execute(event: FeatureEvent): Promise<Record<string, unknown> | void> {
    if (event.type !== 'post_llm_call') {
      return;
    }

    const { context, data } = event;

    // Check if gray room should be triggered
    const triggerResult = shouldUseGrayRoom(context);
    if (!triggerResult.shouldTrigger) {
      return;
    }

    // Extract necessary data
    const schemaName = context['schemaName'] as string;
    const responseMd = data as string;
    const promiseId = context['promiseId'] as string;

    if (!schemaName || !responseMd || !promiseId) {
      return;
    }

    // Run the gray room processing
    const result = await this.orchestrator.runLoop(
      context,
      schemaName,
      responseMd,
      promiseId,
      false, // recovered
      true,  // processInterrupts
    );

    // Return the context modifications
    return result.context ?? {};
  }
}

// Export the feature instance
export const grayRoomFeature = new GrayRoomFeature();
