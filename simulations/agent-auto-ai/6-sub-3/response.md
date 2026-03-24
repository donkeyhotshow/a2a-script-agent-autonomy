```json
{"step":"edit_code","message":"Creating src/routes/health.js and will mount it next turn.","execute":{"write-file":{"path":"src/routes/health.js","content":"const express = require('express');\nconst router = express.Router();\nrouter.get('/health', (_req, res) => res.json({ ok: true }));\nmodule.exports = router;\n"}},"completed":false}
```
