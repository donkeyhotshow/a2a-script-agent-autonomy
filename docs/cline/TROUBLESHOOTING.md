# Cline Troubleshooting Guide

## Overview

This guide provides solutions to common issues encountered when using the Cline Documentation Review System.

## Common Issues

### 1. File System Issues

#### Problem: "File not found" errors
**Symptoms**: Errors when loading review queue or saving files
```bash
Error loading review queue: Error: ENOENT: no such file or directory
```

**Solutions**:
1. **Check directory structure**:
   ```bash
   ls -la .clinerules/
   ls -la .clinerules/reviews/
   ```

2. **Create missing directories**:
   ```bash
   mkdir -p .clinerules/reviews
   mkdir -p .clinerules/scripts
   ```

3. **Restore default review queue**:
   ```bash
   echo '{"tracking_version":"1.0.0","last_updated":"2026-03-02T00:00:00Z","total_requests":0,"pending_requests":[],"in_progress_requests":[],"completed_requests":[],"rejected_requests":[]}' > .clinerules/reviews/review-requests.json
   ```

#### Problem: Permission denied errors
**Symptoms**: Cannot read or write files
```bash
Error: EACCES: permission denied, open '.clinerules/reviews/review-requests.json'
```

**Solutions**:
1. **Check file permissions**:
   ```bash
   ls -la .clinerules/reviews/review-requests.json
   ```

2. **Fix permissions**:
   ```bash
   chmod 644 .clinerules/reviews/review-requests.json
   chmod 755 .clinerules/reviews/
   chmod 755 .clinerules/scripts/
   ```

3. **Check ownership** (Linux/macOS):
   ```bash
   sudo chown $USER:$USER .clinerules/reviews/review-requests.json
   ```

### 2. Node.js Issues

#### Problem: "Module not found" errors
**Symptoms**: Cannot load required modules
```bash
Error: Cannot find module './.clinerules/scripts/review-workflow.js'
```

**Solutions**:
1. **Check Node.js version**:
   ```bash
   node --version
   # Should be v18 or higher
   ```

2. **Verify file paths**:
   ```bash
   ls -la .clinerules/scripts/
   # Ensure all required files exist
   ```

3. **Check file permissions**:
   ```bash
   chmod 644 .clinerules/scripts/*.js
   ```

#### Problem: Syntax errors in JavaScript files
**Symptoms**: Parse errors when running scripts
```bash
SyntaxError: Unexpected token ...
```

**Solutions**:
1. **Check Node.js version compatibility**:
   ```bash
   node --version
   # Ensure it supports the syntax used
   ```

2. **Validate JavaScript syntax**:
   ```bash
   node -c .clinerules/scripts/review-workflow.js
   node -c .clinerules/scripts/documentation-manager.js
   node -c .clinerules/scripts/cli.js
   ```

3. **Check for encoding issues**:
   - Ensure files are saved with UTF-8 encoding
   - Remove any BOM (Byte Order Mark) if present

### 3. CLI Issues

#### Problem: CLI commands not working
**Symptoms**: Commands fail or show help instead of executing
```bash
node .clinerules/scripts/cli.js create docs/test.md
# Shows help instead of creating file
```

**Solutions**:
1. **Check command syntax**:
   ```bash
   node .clinerules/scripts/cli.js help
   # Verify correct usage
   ```

2. **Check file permissions**:
   ```bash
   chmod +x .clinerules/scripts/cli.js
   ```

3. **Run with explicit Node.js**:
   ```bash
   node .clinerules/scripts/cli.js create docs/test.md "Test content"
   ```

#### Problem: CLI shows "Unknown command"
**Symptoms**: Command not recognized
```bash
Unknown command: create
```

**Solutions**:
1. **Check CLI file integrity**:
   ```bash
   head -20 .clinerules/scripts/cli.js
   # Verify file structure
   ```

2. **Reinstall CLI dependencies**:
   ```bash
   npm install
   ```

3. **Check for typos in command**:
   ```bash
   node .clinerules/scripts/cli.js --help
   # Verify correct command names
   ```

### 4. Review Workflow Issues

#### Problem: Reviews not appearing in list
**Symptoms**: `list` command shows no reviews or empty results
```bash
node .clinerules/scripts/cli.js list all
# Shows no reviews
```

**Solutions**:
1. **Check review queue file**:
   ```bash
   cat .clinerules/reviews/review-requests.json
   # Verify file contains review data
   ```

2. **Create test review**:
   ```bash
   node .clinerules/scripts/cli.js create docs/test.md "Test content"
   ```

3. **Check for JSON syntax errors**:
   ```bash
   node -e "console.log(JSON.parse(require('fs').readFileSync('.clinerules/reviews/review-requests.json', 'utf8')))"
   ```

#### Problem: Review status not updating
**Symptoms**: Reviews stay in "pending" status
```bash
node .clinerules/scripts/cli.js status 123456
# Shows status: pending even after completion
```

**Solutions**:
1. **Check review ID**:
   ```bash
   node .clinerules/scripts/cli.js list all
   # Verify review ID exists
   ```

2. **Manually update status**:
   ```bash
   # Edit .clinerules/reviews/review-requests.json
   # Change "status": "pending" to "status": "completed"
   ```

3. **Restart review workflow**:
   ```bash
   # Delete and recreate review queue
   rm .clinerules/reviews/review-requests.json
   node .clinerules/scripts/cli.js test
   ```

### 5. Integration Issues

#### Problem: CI/CD pipeline failures
**Symptoms**: Pipeline fails when running Cline commands
```bash
npm run docs:check
# Fails in CI environment
```

**Solutions**:
1. **Check Node.js version in CI**:
   ```yaml
   # In GitHub Actions
   - name: Setup Node.js
     uses: actions/setup-node@v3
     with:
       node-version: '18'
   ```

2. **Install dependencies**:
   ```yaml
   - name: Install dependencies
     run: npm ci
   ```

3. **Check file permissions**:
   ```yaml
   - name: Fix permissions
     run: chmod +x .clinerules/scripts/*.js
   ```

4. **Add error handling**:
   ```yaml
   - name: Check documentation
     run: |
       if [ -f .clinerules/reviews/review-requests.json ]; then
         node .clinerules/scripts/cli.js report
       else
         echo "No reviews found"
       fi
   ```

#### Problem: Package.json scripts not working
**Symptoms**: npm scripts fail
```bash
npm run docs:create docs/test.md
# Fails with error
```

**Solutions**:
1. **Check script syntax**:
   ```json
   {
     "scripts": {
       "docs:create": "node .clinerules/scripts/cli.js create"
     }
   }
   ```

2. **Run script directly**:
   ```bash
   node .clinerules/scripts/cli.js create docs/test.md
   ```

3. **Check npm configuration**:
   ```bash
   npm config list
   ```

## Debug Mode

### Enable Debug Logging

1. **Create debug wrapper**:
   ```javascript
   // debug-cli.js
   const DocumentationReviewCLI = require('./.clinerules/scripts/cli.js');
   
   class DebugCLI extends DocumentationReviewCLI {
     async run() {
       console.log('🔍 Debug mode enabled');
       console.log('📋 Arguments:', process.argv.slice(2));
       
       try {
         await super.run();
       } catch (error) {
         console.error('❌ Error occurred:', error.message);
         console.error('Stack trace:', error.stack);
         throw error;
       }
     }
   }
   
   const cli = new DebugCLI();
   cli.run();
   ```

2. **Run with debug**:
   ```bash
   node debug-cli.js create docs/test.md "Test content"
   ```

### Manual Debugging

1. **Check file contents**:
   ```javascript
   // debug.js
   const fs = require('fs');
   
   console.log('🔍 Debugging review queue...');
   try {
     const queue = JSON.parse(fs.readFileSync('.clinerules/reviews/review-requests.json', 'utf8'));
     console.log('✅ Review queue loaded successfully');
     console.log('📊 Total requests:', queue.total_requests);
     console.log('📋 Pending requests:', queue.pending_requests.length);
   } catch (error) {
     console.error('❌ Failed to load review queue:', error.message);
   }
   ```

2. **Run debug script**:
   ```bash
   node debug.js
   ```

## Performance Issues

### Problem: Slow operations
**Symptoms**: Commands take too long to execute

**Solutions**:
1. **Enable caching**:
   ```javascript
   class OptimizedReviewWorkflow extends ReviewWorkflow {
     constructor() {
       super();
       this.cache = new Map();
     }
     
     async loadReviewQueue() {
       if (this.cache.has('queue')) {
         return this.cache.get('queue');
       }
       
       const queue = await super.loadReviewQueue();
       this.cache.set('queue', queue);
       return queue;
     }
   }
   ```

2. **Optimize file operations**:
   ```javascript
   // Use synchronous operations for small files
   const queue = JSON.parse(fs.readFileSync('.clinerules/reviews/review-requests.json', 'utf8'));
   ```

3. **Reduce I/O operations**:
   ```javascript
   // Batch multiple operations
   async function batchOperations() {
     const queue = await workflow.loadReviewQueue();
     
     // Perform multiple operations on queue
     // ...
     
     await workflow.saveReviewQueue(queue);
   }
   ```

## Recovery Procedures

### Complete System Reset

1. **Backup existing data**:
   ```bash
   cp -r .clinerules .clinerules.backup
   ```

2. **Remove corrupted files**:
   ```bash
   rm -rf .clinerules
   ```

3. **Restore from backup or recreate**:
   ```bash
   mkdir -p .clinerules/reviews .clinerules/scripts
   echo '{"tracking_version":"1.0.0","last_updated":"2026-03-02T00:00:00Z","total_requests":0,"pending_requests":[],"in_progress_requests":[],"completed_requests":[],"rejected_requests":[]}' > .clinerules/reviews/review-requests.json
   ```

4. **Test system**:
   ```bash
   node .clinerules/scripts/test-review-workflow.js
   ```

### Partial Recovery

1. **Restore specific files**:
   ```bash
   # Restore review queue
   echo '{"tracking_version":"1.0.0","last_updated":"2026-03-02T00:00:00Z","total_requests":0,"pending_requests":[],"in_progress_requests":[],"completed_requests":[],"rejected_requests":[]}' > .clinerules/reviews/review-requests.json
   
   # Restore scripts from backup
   cp .clinerules.backup/scripts/*.js .clinerules/scripts/
   ```

2. **Verify integrity**:
   ```bash
   node .clinerules/scripts/test-review-workflow.js
   ```

## Support

### Getting Help

1. **Check logs**:
   ```bash
   # Check system logs
   ls -la .clinerules/logs/
   
   # View recent logs
   tail -f .clinerules/logs/review-operations.log
   ```

2. **Run diagnostics**:
   ```bash
   # Create diagnostic script
   node -e "
   const fs = require('fs');
   console.log('🔍 System Diagnostics');
   console.log('Node.js version:', process.version);
   console.log('Platform:', process.platform);
   console.log('Review queue exists:', fs.existsSync('.clinerules/reviews/review-requests.json'));
   console.log('Scripts directory exists:', fs.existsSync('.clinerules/scripts/'));
   "
   ```

3. **Contact support**:
   - Check system documentation in `docs/`
   - Review integration guide in `docs/INTEGRATION-GUIDE.md`
   - Run test suite: `node .clinerules/scripts/test-review-workflow.js`

### Common Error Codes

| Error Code | Description | Solution |
|------------|-------------|----------|
| ENOENT | File not found | Check file paths and permissions |
| EACCES | Permission denied | Fix file/directory permissions |
| EISDIR | Is a directory | Check file vs directory usage |
| JSON_PARSE_ERROR | Invalid JSON | Validate JSON syntax |
| MODULE_NOT_FOUND | Missing dependency | Install required modules |

### Prevention Tips

1. **Regular backups**:
   ```bash
   # Create backup script
   # backup.sh
   tar -czf cline-backup-$(date +%Y%m%d).tar.gz .clinerules/
   ```

2. **Monitor disk space**:
   ```bash
   df -h .clinerules/
   ```

3. **Check file integrity**:
   ```bash
   # Verify all required files exist
   ls -la .clinerules/scripts/
   ls -la .clinerules/reviews/
   ```

4. **Test regularly**:
   ```bash
   # Add to cron or scheduled tasks
   node .clinerules/scripts/test-review-workflow.js
   ```

This troubleshooting guide covers the most common issues with the Cline Documentation Review System. If problems persist, consult the system documentation or create a detailed issue report with error messages and steps to reproduce.