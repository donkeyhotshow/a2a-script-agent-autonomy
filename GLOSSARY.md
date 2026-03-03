# A2A Script Agent Glossary

## Overview

This glossary defines key terms, concepts, and components used throughout the A2A Script Agent project. The A2A (Agent-to-Agent) system is an intelligent codebase analysis platform that facilitates communication between different agent components.

## Core Concepts

### A2A (Agent-to-Agent)
A communication protocol and architecture that enables different specialized agents to collaborate on complex tasks through structured message passing and shared context.

### Agent
An autonomous software component that performs specific tasks within the A2A system. Each agent has specialized capabilities and can communicate with other agents to accomplish complex workflows.

### Action
A predefined operation that an agent can perform. Actions are categorized into two types:
- **Actions**: Server-driven, hardcoded steps with predictable execution flow
- **AI-Actions**: Dynamic steps where LLM chooses the next action

### Session
A logical grouping of related operations and interactions between agents. Sessions maintain context and state throughout the execution of a task.

### Promise
An asynchronous operation identifier (`promiseId`) used for long-running operations, particularly when interacting with external AI services.

## System Architecture

### Server (a2a-server)
The stateless backend component (port 3000) that:
- Processes requests and executes actions
- Manages database operations
- Handles authentication and authorization
- Coordinates agent interactions

### Client API (a2a-client)
The frontend component (port 3001) that:
- Provides HTTP API for web interface
- Manages client-side state and sessions
- Acts as intermediary between web UI and server
- Handles file system operations and local processing

### Web UI (a2a-client/web)
The user interface (port 5173) that:
- Provides visual interface for task management
- Displays session progress and results
- Allows user interaction with agent workflows

### External AI Hub
A proxy service (port 11434) that:
- Routes requests to Ollama (port 11435)
- Supports asynchronous operations via promiseId
- Can simulate LLM responses for testing
- Logs all AI interactions

## Protocol and Communication

### Action-Key Shape
The required format for all `result` and `execute` objects where results and parameters are wrapped in keys named after the action:

```json
// ✅ Correct
{ "result": { "script": { "output": "..." } } }
{ "execute": { "read-file": { "path": "..." } } }

// ❌ Incorrect
{ "result": { "content": "..." } }
{ "execute": { "action": "read-file", "file": "..." } }
```

### Context
Shared state that flows between agents, containing:
- Task description
- Execution state
- Historical information
- Virtual document state

### Execute
A server instruction sent to client containing:
- Action type and parameters
- Input data for the operation
- Expected output format

### Result
Client response sent back to server containing:
- Action execution results
- Status information
- Any generated data or errors

## Data Flow Components

### Simulation
A predefined test scenario that demonstrates expected system behavior. Simulations serve as the "golden standard" for comparing actual system performance.

### Request/Response
The fundamental communication pattern where:
- Client sends request with context and optional result
- Server processes and returns response with execute or final result

### SSE (Server-Sent Events)
Real-time communication protocol used for streaming updates from server to client during long-running operations.

### Batch Processing
Execution mode where multiple operations are grouped together for efficiency, particularly useful for large-scale code analysis.

## File System and Storage

### Project
A logical container for related files and configurations, identified by a unique projectId.

### Session Storage
Client-side storage for session data, typically located in `.a2a/sessions/` directory within project folders.

### Virtual Document
A conceptual document that accumulates content across multiple steps in a workflow, managed by the system.

### Tracking Files
System files that maintain audit trails and metadata about operations, located in `.clinerules/tracking/`.

## Development and Testing

### DSL (Domain-Specific Language)
Specialized scripting language used for defining complex operations and workflows within the system.

### RAG (Retrieval-Augmented Generation)
AI technique that combines information retrieval with language generation for enhanced context-aware responses.

### LLM (Large Language Model)
Artificial intelligence models used for natural language understanding and generation within the system.

### CI/CD Integration
Continuous integration and deployment pipelines that automate testing and deployment of system components.

## Configuration and Environment

### Environment Variables
Configuration parameters that control system behavior:
- `PORT` - Server port (default: 3000)
- `CLIENT_API_URL` - Client API endpoint
- `JWT_SECRET` - Authentication secret
- `ENCRYPTION_KEY` - Data encryption key

### Configuration Files
- `.env` - Environment configuration
- `package.json` - Project dependencies and scripts
- `tsconfig.json` - TypeScript configuration

## Workflow Types

### Sequential Processing
Linear execution where each step completes before the next begins, ensuring quality but potentially slower.

### Batch Processing
Grouped execution of multiple operations for efficiency, suitable for large-scale tasks.

### Hybrid Processing
Combination of sequential and batch processing, balancing quality and performance.

### Emergency Processing
Rapid execution mode for critical tasks requiring immediate attention.

### Collaborative Processing
Team-based execution where multiple agents work together on different aspects of a task.

## Quality and Monitoring

### Quality Thresholds
Configurable metrics that determine acceptable quality levels for:
- Completion rate
- Accuracy score
- Organization score

### Decision Engine
Intelligent system component that makes automated decisions based on context and predefined rules.

### State Management
System for tracking and persisting application state across operations and sessions.

### Error Recovery
Mechanisms for detecting, handling, and recovering from errors during agent operations.

## Integration Points

### Database
PostgreSQL database with pgvector extension for storing structured data and vector embeddings.

### Redis
In-memory data store used for caching and queue management.

### BullMQ
Queue management system for handling background tasks and job processing.

### Prisma
Database ORM (Object-Relational Mapping) for TypeScript applications.

## Development Tools

### TypeScript
Primary programming language providing type safety and enhanced development experience.

### Node.js
JavaScript runtime environment for server-side execution.

### Express
Web framework for building HTTP APIs and middleware.

### Vitest
Testing framework for JavaScript/TypeScript applications.

### ESLint
Code linting tool for maintaining code quality and consistency.

### Prettier
Code formatting tool for consistent code style.

## Project Structure

### Packages
Modular components within the client system:
- `api-client` - HTTP client for server communication
- `agent` - Agent implementation
- `fs-utils` - File system utilities
- `rag` - RAG functionality
- `script-runner` - Script execution engine
- `terminal` - Terminal interface
- `types` - Shared TypeScript definitions

### Documentation
- `docs/` - Project documentation
- `docs/new-request-flow/` - Protocol and architecture docs
- `docs/architecture/` - System architecture documentation
- `docs/simulations/` - Simulation documentation

### Simulations
Test scenarios demonstrating system capabilities:
- `fix-vue-imports` - Vue.js import fixing workflow
- `dialog` - Interactive dialog system
- `coder` - Code generation and analysis
- `task-decomposition` - Task breakdown workflows

## Security and Authentication

### JWT (JSON Web Token)
Authentication mechanism for securing API endpoints and user sessions.

### Encryption
Data protection using configurable encryption keys for sensitive information.

### Authentication
User and agent identity verification system.

### Authorization
Permission system controlling access to resources and operations.

## Performance and Scalability

### Memory Management
Efficient handling of system resources and memory usage optimization.

### Processing Efficiency
Optimization techniques for improving operation speed and resource utilization.

### Scalability
System design principles enabling growth in users, data, and complexity.

### Caching
Performance optimization through strategic data storage and retrieval.

## Error Handling and Recovery

### Graceful Degradation
System behavior when components fail, maintaining partial functionality.

### Manual Intervention
Human oversight and control mechanisms for critical operations.

### Emergency Stop
Immediate termination capability for halting problematic operations.

### Rollback
System recovery mechanisms for reverting changes when errors occur.

## Future Enhancements

### Advanced Analytics
Sophisticated metrics and trend analysis for system optimization.

### Integration Extensions
Additional external system integrations (Jira, Confluence, etc.).

### Performance Optimization
Enhanced caching and processing optimizations for large-scale deployments.

### User Experience
Improved interface design and interaction patterns.

## Usage Examples

### Basic Workflow
```bash
# Start new workflow
node .clinerules/scripts/workflow-engine.js --start --priority medium

# Check status
node .clinerules/scripts/workflow-engine.js --status

# Generate report
node .clinerules/scripts/workflow-engine.js --report --format markdown
```

### API Usage
```typescript
// Create new session
POST /api/sessions
{ projectId: "proj_123", task: "Fix Vue imports" }

// Execute next step
POST /api/sessions/:id/next
{ mode: "auto" }
```

This glossary serves as a comprehensive reference for understanding the A2A Script Agent system architecture, components, and terminology.