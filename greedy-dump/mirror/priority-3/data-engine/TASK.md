# Task: data-engine

**Status:** pending — many scripts

**Source:** `priority-3/data-engine/`

**Scripts found:**
| File | Size | Purpose |
|------|------|---------|
| cli.js | 13KB | CLI main |
| mcp-cli.js | 17KB | MCP CLI |
| mcp-server.js | 24KB | MCP Server |
| server.cjs | 40KB | Main server |
| archive-adapter.js | 15KB | Archive adapter |
| archive-tool.js | 9.7KB | Archive tool |
| cursor-rules-generator.js | 27KB | Cursor rules |
| cursor-rules-generator-fixed.js | 27KB | Cursor rules (fixed) |
| project-file-generator.js | 7.2KB | Project file generator |
| file-receiver.js | 6.1KB | File receiver |
| simple-cli.js | 8.9KB | Simple CLI |
| simple-receiver.js | 6.1KB | Simple receiver |
| demo-smart-validation.js | 8.4KB | Validation demo |
| test-unit.cjs | 4KB | Unit tests |
| + config/, docs/, src/, scripts/, tests/ |

**Laravel:** no (Node.js ETL/data pipeline)

**Verdict:** Large project with many scripts. Candidate for A2A server actions (file processing, MCP server). Priority: high (rich script set).

**Next step:** Detailed stub needed for implementation pass.
