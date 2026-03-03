# A2A Client Glossary

## Core Concepts

### A2A (Agent-to-Agent)
A communication protocol and architecture for intelligent agents to interact with each other and perform complex tasks autonomously.

### Client
The frontend component that provides user interface and client-side processing capabilities. Runs in browser and communicates with the Server API.

### Server
The backend component that handles business logic, data processing, and coordinates between different agents and services.

### Session
A temporary workspace that maintains state and context for a specific user task or workflow. Sessions are managed by the Client API.

### Project
A logical grouping of files and configurations that represents a specific codebase or workspace being analyzed.

## Communication Protocol

### Action-key Shape
The required format for all `result` and `execute` objects where action parameters and results are wrapped in a key named after the action:

```json
// ✅ Correct
{ "result": { "script": { "output": "..." } } }
{ "execute": { "read-file": { "path": "..." } } }

// ❌ Incorrect
{ "result": { "content": "..." } }
{ "execute": { "action": "read-file", "file": "..." } }
```

### Actions vs AI-Actions
- **Actions**: Hardcoded, algorithmic steps with predictable execution flow
- **AI-Actions**: LLM-driven steps where the next action is determined by AI reasoning

### PromiseId
Identifier used for asynchronous operations with External AI Hub, allowing non-blocking processing of AI requests.

### Context
The persistent state that flows between Client and Server, containing task information and execution state.

## Client Components

### Client API (Port 3001)
The API layer that handles communication between Web UI and Server, manages sessions, and processes client-side operations.

### Web UI
The browser-based user interface that allows users to interact with the system, view results, and manage sessions.

### Script Runner
Client-side component that executes DSL (Domain Specific Language) scripts in a sandboxed environment.

### RAG (Retrieval-Augmented Generation)
Client-side search capability that retrieves relevant documents and code snippets to augment AI processing.

### Terminal
Client-side component that provides command-line interface capabilities for executing shell commands.

### File System Utils
Client-side utilities for file operations including reading, writing, and scanning files.

## Server Components

### Request Processor
Server component that handles incoming requests, manages queues, and coordinates task execution.

### Action Registry
Server component that manages available actions and their definitions.

### Context Manager
Server component that handles session state, context persistence, and state transitions.

### Message Service
Server component that manages communication between different parts of the system.

### Neurons
Server components that perform specific intelligent processing tasks (linting, validation, analysis).

## Data Types

### Task
A user-defined problem or request that the system needs to solve or process.

### Step
An individual operation within an action that contributes to completing the overall task.

### Execution
The current state of task processing, including which action and step are being executed.

### Result
The output or outcome of executing a specific step or action.

### Simulation
A predefined test scenario that demonstrates how the system handles specific types of tasks.

## File Types

### DSL (Domain Specific Language)
Custom scripting language used for defining complex operations and workflows.

### JSON Schema
Structured format for defining data models and validation rules.

### Markdown
Plain text formatting syntax used for documentation and prompts.

### TypeScript
Programming language used for both client and server development.

## Development Concepts

### State Management
The system's approach to maintaining and transitioning between different states during task execution.

### Error Handling
Strategies for detecting, reporting, and recovering from errors during processing.

### Caching
Techniques for storing and reusing computed results to improve performance.

### Validation
Processes for ensuring data integrity and correctness throughout the system.

## Integration Points

### External AI Hub
External service (like Ollama) that provides AI capabilities through a standardized interface.

### Database
PostgreSQL database with pgvector extension for storing structured data and vector embeddings.

### Cache/Queue
Redis-based system for caching frequently accessed data and managing task queues.

### File System
Local file system access for reading and writing project files and temporary data.

## Workflow Types

### Sequential Processing
Linear execution of steps where each step depends on the completion of the previous one.

### Batch Processing
Processing multiple items or operations together for improved efficiency.

### Hybrid Processing
Combination of sequential and batch processing strategies.

### Emergency Processing
High-priority processing mode for critical tasks that require immediate attention.

### Collaborative Processing
Team-based processing where multiple agents work together on complex tasks.

## Quality Assurance

### Test Coverage
The percentage of code that is covered by automated tests.

### Code Quality
Standards and practices for maintaining high-quality, maintainable code.

### Performance Metrics
Measurements used to evaluate the system's efficiency and responsiveness.

### Security Standards
Practices and protocols for ensuring the system's security and data protection.

## Deployment

### Development Environment
Local setup used for development and testing.

### Production Environment
Live environment where the system serves real users.

### Docker
Containerization platform used for consistent deployment across different environments.

### CI/CD
Continuous Integration and Continuous Deployment practices for automated testing and deployment.