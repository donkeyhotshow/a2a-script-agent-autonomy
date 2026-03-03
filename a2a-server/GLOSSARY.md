# A2A Server Glossary

## Core Architecture

### A2A (Agent-to-Agent)
Communication protocol and architecture enabling intelligent agents to interact autonomously for complex task execution.

### Server
Backend component handling business logic, data processing, and coordination between agents and external services.

### Stateless Architecture
Server design principle where no session state is stored between requests, ensuring scalability and reliability.

### RESTful API
Representational State Transfer API design pattern used for HTTP-based communication with clients.

### Async Protocol
Asynchronous communication protocol using promise-based operations for non-blocking task execution.

## Database & Storage

### PostgreSQL
Primary relational database system used for structured data storage and management.

### pgvector
PostgreSQL extension providing vector storage and similarity search capabilities for AI embeddings.

### Redis
In-memory data structure store used for caching, session management, and task queuing.

### Prisma ORM
Object-Relational Mapping tool providing type-safe database access and schema management.

### BullMQ
Redis-based queue system for managing background jobs and task processing.

## Processing Components

### Request Processor
Core component handling incoming requests, managing execution queues, and coordinating task processing.

### Action Registry
System component managing available actions, their definitions, and execution parameters.

### Action Executor
Component responsible for executing specific actions and managing their lifecycle.

### Context Manager
Service handling session state, context persistence, and state transitions during task execution.

### Message Service
Component managing communication between different system parts and external services.

### Neurons
Specialized processing units performing specific intelligent tasks (linting, validation, analysis).

## AI & Machine Learning

### LLM (Large Language Model)
AI models like those from Ollama used for natural language processing and code analysis.

### External AI Hub
External service interface (typically Ollama) providing AI capabilities through standardized endpoints.

### RAG (Retrieval-Augmented Generation)
AI technique combining information retrieval with language generation for enhanced responses.

### Embeddings
Vector representations of text or code used for semantic search and similarity analysis.

### Plexe Local CPU Solutions
Local AI processing solutions optimized for CPU-based inference without requiring GPUs.

## Protocol & Communication

### Action-key Shape
Required format for `result` and `execute` objects where action parameters are wrapped in action-named keys:

```json
// ✅ Correct
{ "result": { "script": { "output": "..." } } }
{ "execute": { "read-file": { "path": "..." } } }
```

### PromiseId
Identifier for asynchronous operations with External AI Hub, enabling non-blocking AI request processing.

### Context Propagation
Mechanism ensuring context flows unchanged between Client and Server requests.

### DSL (Domain Specific Language)
Custom scripting language for defining complex operations and workflows executed by clients.

## Security & Authentication

### JWT (JSON Web Token)
Standard for creating access tokens representing user identity and permissions.

### RBAC (Role-Based Access Control)
Security model controlling access based on user roles and permissions.

### API Keys
Authentication mechanism for programmatic access to server APIs.

### 2FA (Two-Factor Authentication)
Security process requiring two different authentication methods for access.

### Audit Logging
System for tracking and recording security events and user actions.

## Development & Operations

### TypeScript
Primary programming language providing type safety and enhanced development experience.

### Express.js
Web application framework providing the foundation for the server API.

### Node.js
JavaScript runtime environment powering the server application.

### Docker
Containerization platform ensuring consistent deployment across environments.

### Docker Compose
Tool for defining and running multi-container Docker applications.

## Monitoring & Observability

### Health Checks
Endpoints and mechanisms for monitoring system status and availability.

### Metrics Collection
System for gathering performance and operational data for monitoring.

### Logging
Structured logging system for debugging, monitoring, and auditing.

### Error Handling
Comprehensive strategies for detecting, reporting, and recovering from errors.

## Data Models

### Session
Temporary workspace maintaining state and context for specific user tasks or workflows.

### Project
Logical grouping of files and configurations representing a specific codebase being analyzed.

### Task
User-defined problem or request that the system needs to solve or process.

### Step
Individual operation within an action contributing to overall task completion.

### Execution
Current state of task processing, including active action and step information.

### Result
Output or outcome of executing a specific step or action.

## Workflow Management

### Sequential Processing
Linear execution where each step depends on completion of the previous step.

### Batch Processing
Processing multiple items together for improved efficiency and throughput.

### Hybrid Processing
Combination of sequential and batch processing strategies.

### Emergency Processing
High-priority processing mode for critical tasks requiring immediate attention.

### Collaborative Processing
Multi-agent processing where different components work together on complex tasks.

## Integration Points

### Git Integration
System capabilities for working with Git repositories and version control.

### File System Access
Server access to local file systems for reading and writing project files.

### External Services
Integration capabilities with third-party services and APIs.

### WebSockets
Real-time communication protocol for live updates and interactive features.

## Performance & Scalability

### Caching Strategies
Techniques for storing and reusing computed results to improve response times.

### Load Balancing
Distribution of workloads across multiple computing resources.

### Resource Management
Optimization of system resources including memory, CPU, and storage.

### Queue Management
Efficient handling of task queues and background job processing.

## Development Practices

### CI/CD (Continuous Integration/Continuous Deployment)
Automated processes for testing and deploying code changes.

### Code Quality Standards
Practices and tools ensuring high-quality, maintainable code.

### Testing Strategies
Comprehensive testing approaches including unit, integration, and end-to-end tests.

### Documentation Standards
Guidelines for maintaining clear, comprehensive system documentation.

## Configuration & Environment

### Environment Variables
Configuration mechanism for managing application settings across different environments.

### Configuration Management
System for managing application configuration and feature flags.

### Migration System
Database schema evolution and data migration management.

### Seed Data
Initial data used for development, testing, and demonstration purposes.