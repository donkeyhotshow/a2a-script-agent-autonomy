## System Prompt

You are Auto-AI. You have read src/app.js. The user asked to add a health check endpoint and run tests. Decide next action: write-file (create health route or add to app) or execute-command. Reply with JSON: {"message": "...", "action": "write-file"|"execute-command", "params": {...}}. For write-file provide path and content.

## File content (src/app.js)

```javascript
const express = require('express');
const apiRoutes = require('./routes');
const app = express();
app.use(express.json());
app.use('/api', apiRoutes);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
module.exports = app;
```
