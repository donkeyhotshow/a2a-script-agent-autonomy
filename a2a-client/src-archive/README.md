# Archived: a2a-client/src

**Status:** Deprecated - moved to archive on 2026-03-06

## Overview

This directory contains legacy client-side code that is no longer actively used.

## Contents

| File/Directory | Description |
|----------------|-------------|
| `types.js` | Session model class (replaced by `a2a-client/packages/types`) |
| `composables/useMobile.ts` | Vue composable for mobile detection (replaced by CSS-based responsive design in `web/`) |
| `styles/mobile-responsive.css` | Mobile responsive styles (replaced by `web/css/`) |
| `utils/error-reporter.ts` | Error reporting service (functionality moved to `web/js/error-handler.js`) |

## Why Archived

These files were identified as unused artifacts:

1. **No imports found** - Searched entire `a2a-client` for imports of these files - none found
2. **Active UI elsewhere** - Working UI code is in `a2a-client/web/`
3. **Types replaced** - Session types are now in `a2a-client/packages/types/` and `a2a-client/packages/history/`

## Migration Path

- **Mobile detection**: Use CSS media queries and `web/css/utils/media.css`
- **Error handling**: Use `web/js/error-handler.js`
- **Session types**: Use `@a2a-client/types` or `@a2a-client/history` packages

## To Delete

If after 30 days no issues are found, these files can be safely deleted:

```bash
rm -rf a2a-client/src-archive
```
