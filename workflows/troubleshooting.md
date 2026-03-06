# Troubleshooting Guide

> **Common issues and their solutions**

## Quick Diagnosis

### System Health Check

```bash
# Check all services at once
.\scripts\setup-complete-smoke-system.ps1

# Individual service checks
curl http://localhost:3000/health    # A2A Server
curl http://localhost:3001/health    # Client API
curl http://localhost:5173/          # Web UI
curl http://localhost:11435/health   # AI Integration
curl http://localhost:11434/api/tags # Ollama
```

### CLI Testing Framework

```bash
cd a2a-client/tester

# Quick system status
node cli.js status

# Test CLI-Web communication
node cli.js send ping

# Monitor for errors
node cli.js monitor --filter error
```

## Common Issues

### 1. Requests Stuck in "pending" Status

**Symptoms:**
- API returns `promiseId` but status never changes
- Tasks appear to hang indefinitely

**Causes & Solutions:**

**Cause: Promise daemon not running**
```bash
# Check if daemon is running
curl http://localhost:11435/daemon/status

# Start daemon manually
cd ai-integration
python scripts/start_promise_daemon.py
```

**Cause: AI Integration proxy not accessible**
```bash
# Test proxy health
curl http://localhost:11435/health

# Check Ollama availability
curl http://localhost:11434/api/tags
```

**Cause: Port conflicts**
```bash
# Check what's using ports
netstat -ano | findstr "3000\|3001\|5173\|11435\|11434"
```

### 2. Web UI Not Loading

**Symptoms:**
- Browser shows connection errors
- Web UI unresponsive to commands

**Causes & Solutions:**

**Cause: Vite dev server not running**
```bash
cd a2a-client
npm run dev
```

**Cause: Port already in use**
```bash
# Kill process on port 5173
netstat -ano | findstr 5173
taskkill /PID <PID> /F
```

**Cause: CORS issues**
```bash
# Check Vite proxy configuration in a2a-client/vite.config.js
# Should proxy /api to http://localhost:3001
```

### 3. CLI Commands Not Working

**Symptoms:**
- `node cli.js` commands fail
- "Connection refused" errors

**Causes & Solutions:**

**Cause: Client API server not running**
```bash
cd a2a-client/packages/sdk
npm run dev
```

**Cause: Wrong API URL**
```bash
# Specify correct URL
node cli.js status --api-url http://localhost:3001

# Or set environment variable
$env:A2A_API_URL = "http://localhost:3001"
node cli.js status
```

**Cause: Node.js dependencies not installed**
```bash
cd a2a-client/tester
npm install
```

### 4. Database Connection Issues

**Symptoms:**
- Server logs show connection errors
- Requests fail with database errors

**Causes & Solutions:**

**Cause: PostgreSQL not running**
```bash
# Start database
docker-compose up -d postgres

# Check database health
docker exec a2a-server-postgres pg_isready -U postgres
```

**Cause: Wrong connection string**
```bash
# Check environment variables in a2a-server/.env
DATABASE_URL=postgresql://postgres:password@localhost:5433/a2a_server
```

**Cause: Database not initialized**
```bash
cd a2a-server
npm run db:migrate
npm run db:seed
```

### 5. AI Integration Problems

**Symptoms:**
- LLM requests fail
- Simulations don't work

**Causes & Solutions:**

**Cause: Ollama not running**
```bash
# Start Ollama service
ollama serve

# Pull required model
ollama pull qwen3:8b
```

**Cause: Wrong model name**
```bash
# Check available models
curl http://localhost:11434/api/tags

# Update configuration in a2a-server/.env
OLLAMA_MODEL=qwen3:8b
```

**Cause: Proxy configuration issues**
```bash
# Test proxy directly
curl -X POST http://localhost:11435/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen3:8b","prompt":"test"}'
```

### 6. Session State Issues

**Symptoms:**
- Sessions not persisting
- Data lost on page refresh

**Causes & Solutions:**

**Cause: Server storage unavailable**
```bash
# Check API server is running
curl http://localhost:3001/api/storage/health
```

**Cause: Session store not initialized**
```javascript
// Check browser console for errors
// SessionStore should initialize automatically
```

**Cause: Server storage quota exceeded**
```bash
# Check server logs for storage errors
# Clear old sessions via API
curl -X DELETE http://localhost:3001/api/storage/sessions/old
```

### 7. SSE/WebSocket Connection Issues

**Symptoms:**
- Real-time updates not working
- Commands appear to send but have no effect

**Causes & Solutions:**

**Cause: Firewall blocking connections**
```bash
# Check firewall rules for ports 3001-3002
# Disable firewall temporarily for testing
```

**Cause: Browser security policies**
```bash
# Try different browser
# Check browser developer tools for mixed content warnings
```

**Cause: Connection limits exceeded**
```bash
# Check number of active connections
curl http://localhost:3001/api/tester/status
```

### 8. Performance Issues

**Symptoms:**
- Slow response times
- High memory usage
- UI freezing

**Causes & Solutions:**

**Cause: Memory leaks**
```bash
# Monitor memory usage
# Check browser dev tools memory tab
# Restart services periodically
```

**Cause: Too many concurrent requests**
```bash
# Check rate limiting
curl http://localhost:3000/api/v1/queue/metrics
```

**Cause: Large session data**
```javascript
// Clear session history in browser
SessionStore.clearStorage();
```

## Advanced Diagnostics

### Log Analysis

```bash
# Server logs
tail -f a2a-server/logs/combined.log

# Client API logs
tail -f a2a-client/packages/sdk/logs/app.log

# AI Integration logs
tail -f ai-integration/proxy/logs/access.log
```

### Network Debugging

```bash
# Monitor network traffic
tcpdump -i lo0 port 3000 or port 3001 or port 5173

# Check DNS resolution
nslookup localhost
```

### Database Debugging

```bash
# Connect to database
docker exec -it a2a-server-postgres psql -U postgres -d a2a_server

# Check table sizes
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

# Check recent requests
SELECT id, "promiseId", status, "createdAt"
FROM requests
ORDER BY "createdAt" DESC
LIMIT 10;
```

## Emergency Procedures

### Complete System Reset

```bash
# Stop all services
docker-compose down

# Clear all data
docker volume rm a2a-server_postgres_data
rm -rf a2a-client/web/localStorage
rm -rf ai-integration/proxy/promises/
rm -rf ai-integration/proxy/results/

# Restart from scratch
npm run dev
```

### Database Recovery

```bash
# Backup current database
docker exec a2a-server-postgres pg_dump -U postgres a2a_server > backup.sql

# Drop and recreate
npm run db:reset

# Restore if needed
docker exec -i a2a-server-postgres psql -U postgres -d a2a_server < backup.sql
```

## Getting Help

1. **Check logs** - Enable debug logging and check all service logs
2. **Run diagnostics** - Use the CLI testing framework for systematic checks
3. **Isolate components** - Test each service individually
4. **Check versions** - Ensure all dependencies are up to date
5. **Community support** - Check project issues and documentation

## Prevention

- **Regular backups** - Backup database and configurations weekly
- **Monitor resources** - Set up alerts for high CPU/memory usage
- **Keep updated** - Regularly update dependencies and models
- **Test regularly** - Run full test suite before deployments