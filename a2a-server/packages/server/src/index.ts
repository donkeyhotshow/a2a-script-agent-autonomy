import http from "node:http";
import { existsSync } from "node:fs";
import app from "./app";
import { config } from "../../server-config/index";
import { logger } from "../../server-utils/src/logger";
import {
  startRequestProcessor,
  stopRequestProcessor,
} from "./request-processor/request-processor.service";
import { actionRegistry } from "../../actions/src/action-registry";
// Removed algorithm registry import - module moved to gray-room package
const algorithmRegistry = { loadFromDirectory: async () => console.log('Algorithm registry skipped') };
import { getPromptsTransformsPath } from './index';
import { globalArtifactStore } from "./artifact-store";

// Temporary placeholders for missing modules
const ultraContextService = {};
const peerRelay = { joinRoom: () => console.log('Peer relay joined room') };

// Create HTTP server
const server = http.createServer(app);

async function bootstrap(): Promise<void> {
  try {
    await actionRegistry.loadFromDirectory();
    logger.info("[Bootstrap] Action registry loaded", {
      count: actionRegistry.count,
    });
  } catch (err) {
    logger.error(
      "[Bootstrap] Action registry load failed — router will use empty registry / fallback",
      {
        error: err instanceof Error ? err.message : String(err),
      },
    );
  }

  try {
    await algorithmRegistry.loadFromDirectory();
    logger.info("[Bootstrap] Algorithm registry loaded", {
      count: algorithmRegistry.count(),
    });
  } catch (err) {
    logger.error(
      "[Bootstrap] Algorithm registry load failed — Black Room will use empty registry",
      {
        error: err instanceof Error ? err.message : String(err),
      },
    );
  }

  const envPromptsPath = process.env.PROMPTS_TRANSFORMS_PATH;
  const resolvedPromptsPath = getPromptsTransformsPath();
  const promptsPathExists = existsSync(resolvedPromptsPath);
  const promptsMode = envPromptsPath ? "env-override" : "bundled-default";

  logger.info("[Bootstrap] Prompts/transforms configuration", {
    mode: promptsMode,
    envPath: envPromptsPath ?? null,
    resolvedPath: resolvedPromptsPath,
    exists: promptsPathExists,
  });

  if (!promptsPathExists) {
    logger.warn("[Bootstrap] Prompts/transforms directory does not exist", {
      resolvedPath: resolvedPromptsPath,
      cwd: process.cwd(),
    });
  }

  startRequestProcessor(config.requestProcessorIntervalMs);

  // ADR-0079: Nightly ArtifactStore purge (every 6 hours)
  setInterval(
    () => {
      const purged = globalArtifactStore.purgeExpired();
      if (purged > 0) {
        logger.info("[ArtifactStore] Routine purge completed", { purged });
      }
    },
    6 * 60 * 60 * 1000,
  );

  // ADR-0080+: Initialize distributed services
  logger.info("[A2A] Initializing Distributed Core 2.5...");
  peerRelay.joinRoom("main", "server-01");

  server.listen(config.port, () => {
    logger.info(`A2A Server started (Simulation Mode)`, {
      port: config.port,
      environment: config.nodeEnv,
      pid: process.pid,
      actionsRegistered: actionRegistry.count,
    });

    logger.info(`Health check: http://localhost:${config.port}/health`);
    logger.info(`API: http://localhost:${config.port}/api/v1/invoke`);
  });
}

void bootstrap();

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  stopRequestProcessor();

  server.close((err) => {
    if (err) {
      logger.error("Error during server shutdown", { error: err.message });
      process.exit(1);
    }
    logger.info("Server closed successfully");
    process.exit(0);
  });

  // Force shutdown after timeout
  setTimeout(() => {
    logger.error("Forced shutdown due to timeout");
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  const name = reason instanceof Error ? reason.name : "";
  if (
    msg === "terminated" ||
    name === "AbortError" ||
    /aborted|terminated/i.test(msg)
  ) {
    logger.debug("[Process] Dropped rejection (request aborted)", {
      reason: msg,
    });
    return;
  }
  logger.error("Unhandled promise rejection", {
    reason: String(reason),
  });
});

export default server;
