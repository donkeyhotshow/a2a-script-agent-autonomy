# Health check of all services

**Purpose:** Verify that all services in the stack are running and responding.

**Steps:**

1. Check A2A Server health: `curl -s http://localhost:3000/health`
2. Check AI Integration health: `curl -s http://localhost:11434/health`
3. Check Ollama health: `curl -s http://localhost:11435/api/tags`
4. Check Client API health: `curl -s http://localhost:5173/api/a2a/projects`

**Expected output:** Each endpoint should return a successful JSON response (or at least not an error).

**Definition of done:** All four checks pass.

**Notes:** If any check fails, log the error and consider restarting the stack via `start-all.bat` (if appropriate).