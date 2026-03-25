# invoke-form-confirmation

Documents **`FormRequestProcessor`** (`form_submission` + `form_id`) routing from `determineRequestType` in `request-processor.service.ts`. Uses the built-in **`confirmation`** form (`form-request-processor.ts`).

Golden mirrors the invoke **context + execute.message** shape after `normalizeServerInvokeResponse` (no extra top-level processor fields).
