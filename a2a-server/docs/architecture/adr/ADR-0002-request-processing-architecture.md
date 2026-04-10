# ADR-0002: Request Processing Architecture

Status: accepted
Date: 2026-03-03

## Context

The A2A Server needs to handle multiple types of requests with different processing requirements:

1. **Synchronous requests** - Immediate responses for status checks, health checks, etc.
2. **Asynchronous requests** - Long-running processing that requires state management
3. **Real-time updates** - Streaming responses for progress tracking
4. **Action-based requests** - Client-side execution coordination
5. **LLM integration** - External AI service calls with timeout and retry handling

The system must:
- Handle concurrent requests efficiently
- Maintain request state across processing phases
- Provide real-time progress updates to clients
- Support both AI-driven and action-based workflows
- Ensure reliable processing with proper error handling and recovery

## Decision

Implement a **Phase-Based Request Processing Architecture** with the following components:

### 1. Request Lifecycle Management

**Request States:**
- `pending` - Request queued for processing
- `processing` - Currently being processed
- `completed` - Successfully finished
- `failed` - Processing failed
- `cancelled` - Request cancelled by user or system

**Request Processing Flow:**
```
Client Request → Request Service → Queue → Request Processor → Phase Machine → Completion
```

### 2. Phase-Based Processing

**Processing Phases:**
1. **Discovery** - Framework detection and project analysis
2. **Recognition** - Entity recognition and context extraction
3. **Analysis** - Graph analysis and dependency resolution
4. **Action** - Neuron activation and action execution
5. **Validation** - Result validation and quality checks
6. **Completion** - Finalization and response generation

**Phase Machine:**
- State machine managing transitions between phases
- Configurable timeouts per phase
- Automatic retry mechanisms for failed phases
- Context preservation across phase transitions

### 3. Timer-Based Processing

**Request Processor:**
- Background timer polling for pending requests
- Configurable processing interval (default: 5 seconds)
- Concurrent request processing with configurable limits
- Graceful shutdown with pending request handling

**Processing Strategy:**
- **Sequential** - One request at a time (for consistency)
- **Parallel** - Multiple requests concurrently (for performance)
- **Batch** - Group similar requests for efficiency

### 4. Action-Based Workflow

**Action Protocol:**
- `task_request` - Initial task description
- `approve_action` - User approval of proposed action
- `step_result` - Result of action step execution
- `completed` - Final completion notification

**Action Execution:**
- Client-side action execution coordination
- Server-side action orchestration
- Step-by-step progress tracking
- Error handling and rollback capabilities

### 5. LLM Integration

**LLM Provider Abstraction:**
- Support for multiple LLM providers (OpenAI, Local LLM upstream)
- Fallback mechanisms for provider unavailability
- Configurable timeouts and retry policies
- Context-aware prompt generation

**Promise-Based Integration:**
- Integration with a2a-ai-hub service
- Polling-based status checking
- Timeout and error handling
- Progress tracking and cancellation

## Consequences

### Positive

- **Scalability**: Phase-based processing allows for horizontal scaling
- **Reliability**: State machine ensures consistent processing flow
- **Observability**: Clear phase transitions enable detailed monitoring
- **Flexibility**: Different processing strategies for different request types
- **Recovery**: Automatic retry and rollback mechanisms
- **Real-time Updates**: SSE enables live progress tracking

### Trade-offs

- **Complexity**: Multi-phase processing adds architectural complexity
- **Latency**: Phase transitions may introduce processing delays
- **Resource Usage**: State preservation requires memory and storage
- **Coordination**: Multiple components need to coordinate state changes

### Implementation Requirements

- **Database Schema**: Support for request states and phase tracking
- **Timer Management**: Configurable and reliable timer implementation
- **State Machine**: Robust phase transition management
- **Error Handling**: Comprehensive error recovery mechanisms
- **Monitoring**: Metrics and logging for all processing phases

## Alternatives Considered

### 1. Event-Driven Architecture
- **Pros**: High scalability, loose coupling
- **Cons**: Complex state management, eventual consistency
- **Rejected**: Too complex for current requirements

### 2. Microservices Architecture
- **Pros**: Independent scaling, technology diversity
- **Cons**: Network complexity, deployment overhead
- **Rejected**: Overkill for current scale and team size

### 3. Single-Threaded Processing
- **Pros**: Simple implementation, no concurrency issues
- **Cons**: Poor performance, resource underutilization
- **Rejected**: Doesn't meet performance requirements

## Notes / Follow-ups

- Implement comprehensive monitoring for each processing phase
- Add circuit breakers for external service dependencies
- Consider implementing request prioritization
- Plan for horizontal scaling of request processors
- Implement proper cleanup for failed/cancelled requests
- Add metrics for processing time and success rates