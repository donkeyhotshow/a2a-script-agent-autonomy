Adding a health route. Creating src/routes/health.js and we can require it in app.

{"message": "Creating health check route at src/routes/health.js.", "action": "write-file", "params": {"path": "src/routes/health.js", "content": "const express = require('express');\nconst router = express.Router();\nrouter.get('/', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));\nmodule.exports = router;"}}
