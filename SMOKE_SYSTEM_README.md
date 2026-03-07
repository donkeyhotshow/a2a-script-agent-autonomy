# Smoke Testing System - Quick Start

## One Command Setup
```bash
npm run setup:smoke-system
```

This command automatically:
- Fixes smoke test (environment variables for Vite)
- Tests all services and integration
- Creates pre-release process
- Sets up automatic retrospectives
- Updates package.json
- Creates full documentation

## Available Commands After Setup

### Smoke Testing
```bash
npm run smoke-test        # Quick test (~2 min)
npm run smoke-test:full   # Full test with browser (~3 min)
```

### Pre-release Validation
```bash
npm run pre-release       # Complete validation (~5-10 min)
```

### Retrospectives & Analysis
```bash
npm run retrospective:daily    # Daily analysis
npm run retrospective:weekly   # Weekly analysis
npm run setup-retrospectives   # Setup automatic retrospectives
```

## System Architecture

```
Web UI (5173) <-> Client API (3001) <-> A2A Server (3000)
                     ^
                     |
               Infrastructure
               (PostgreSQL + Redis)
```

## Monitoring & KPIs

- Smoke test success rate: >95%
- Service startup time: <30 seconds
- SSE heartbeat: 100%
- Session persistence: 100%

---

**Created:** 2026-03-06_19-55-47
**Status:** Production Ready
