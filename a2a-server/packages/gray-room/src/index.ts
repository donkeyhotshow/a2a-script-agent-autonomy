/**
 * Gray Room Feature
 *
 * Migrated from the core gray-room functionality to a pluggable feature.
 * Handles interrupt processing after LLM calls.
 */

import { FeatureAction, FeatureEvent } from "../index.js";
import { GrayRoomOrchestrator } from "../../../../packages/gray-room/src/core/request-processor/gray-room-orchestrator.js";
import {
  readGrayRoomInterruptBudget,
  shouldUseGrayRoom,
} from "../../../../packages/gray-room/src/core/request-processor/gray-room-trigger.js";
import { getPromptsTransformsPath } from "../../../../packages/transform/index.js";
import { features } from "../../../../packages/config/index.js";

export class GrayRoomFeature implements FeatureAction {
  name = "gray-room";
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
    if (event.type !== "post_llm_call") {
      return;
    }

    const { context, data } = event;

    // Check if gray room should be triggered
    const triggerResult = shouldUseGrayRoom(context);
    if (!triggerResult.shouldTrigger) {
      return;
    }

    // Extract necessary data
    const schemaName = context["schemaName"] as string;
    const responseMd = data as string;
    const promiseId = context["promiseId"] as string;

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
      true, // processInterrupts
    );

    // Return the context modifications
    return result.context || {};
  }
}

// Export the feature instance
export const grayRoomFeature = new GrayRoomFeature();
