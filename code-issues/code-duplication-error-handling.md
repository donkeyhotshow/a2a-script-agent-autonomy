# Code Duplication: Error Handling and Validation in Request/Service Layers

## Description
Similar patterns for error sanitization and validation in request handling, such as mapping raw errors to user-safe messages and checking for retryable errors.

## Impact
Minor overlap; could be consolidated into a shared error utility.

## Files Involved
- `a2a-server/src/services/core/request/request.service.ts` (lines 86-112): `humanizeUpstreamErrorMessage` function
- `a2a-server/src/routes/requests.routes.ts` (lines 31-37): `clientSafeErrorField` function

## Duplicated Code Blocks
Both functions use string checks and replacements to hide internal details (e.g., IP addresses, localhost references).

## Recommendation
Merge into a single `sanitizeErrorMessage` utility in `utils/errors.ts`.