import { Router, Request, Response, NextFunction } from "express";
import Ajv, { ValidateFunction } from "ajv";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { invoke } from '../../../services/src/utils/invoke.service.js';
import requestsRouter from "./requests.routes.js";
import type { FileBlock } from "../types/index.js";
import { logger } from "../../lib/logger.js";
import { validateInvokeRequest } from "@a2a-server/protocol";

const ajv = new Ajv({ strict: false, allErrors: true, validateFormats: false });

const router = Router();

// Mount requests API (status, result, batch status)
router.use("/requests", requestsRouter);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SERVER_INVOKE_REQUEST_SCHEMA_PATH = join(
  __dirname,
  "../../../docs/new-request-flow/json-schemas/server-invoke-request.schema.json",
);

let validateInvokeRequestBody: ValidateFunction<unknown> | null = null;
try {
  const schema = JSON.parse(
    readFileSync(SERVER_INVOKE_REQUEST_SCHEMA_PATH, "utf-8"),
  );
  validateInvokeRequestBody = ajv.compile(schema);
} catch (err) {
  // Fail fast in production when schema is missing; in dev (SKIP_AUTH=1), warn and skip validation.
  if (process.env.SKIP_AUTH !== "1") {
    throw new Error(
      `[invoke route] Fatal: Failed to compile server-invoke-request.schema.json: ${err}`,
    );
  }
  console.warn(
    "[invoke route] Failed to compile server-invoke-request.schema.json (dev mode)",
    err,
  );
}

/**
 * Main invoke endpoint - all processing happens here
 */
router.post(
  "/invoke",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as {
        task?: string;
        context?: unknown;
        message?: string;
        code_blocks?: unknown;
        result?: unknown;
        action?: string;
        selectedAction?: { actionId: string };
        stepId?: string;
        stepResult?: unknown;
      };

      const validation = validateInvokeRequest(body);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: {
            message: "Invalid /api/v1/invoke request body",
            details: validation.errors ?? [],
          },
        });
        return;
      }

      const clientId = "anonymous";
      const resultKeys =
        body.result && typeof body.result === "object"
          ? Object.keys(body.result)
          : [];
      if (process.env.DEBUG_INVOKE === "1") {
        logger.debug("[a2a-server] /invoke received", {
          resultKeys,
          task: body.task?.slice(0, 50),
        });
      }

      const invokeResult = await invoke(clientId, {
        task: body.task,
        context: body.context,
        message: body.message,
        code_blocks: body.code_blocks as FileBlock[] | undefined,
        action: body.action,
        selectedAction: body.selectedAction,
        stepId: body.stepId,
        stepResult: body.stepResult,
        result: body.result as Record<string, unknown> | undefined,
      });

      const pid = invokeResult.promiseId;
      if (process.env.DEBUG_INVOKE === "1") {
        logger.debug("[a2a-server] /invoke returning promiseId", {
          promiseId: pid,
        });
      }
      res.json({
        success: true,
        data: {
          promiseId: pid,
          status: "pending",
          pollUrl: `/requests/${pid}`,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * Health check - minimal
 */
router.get("/health", (_req: Request, res: Response): void => {
  res.json({ status: "ok", mode: "stateless" });
});

export default router;
