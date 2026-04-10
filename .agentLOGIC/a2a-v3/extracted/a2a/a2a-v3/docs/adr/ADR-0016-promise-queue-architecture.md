# ADR-0016: Promise Queue Architecture

Status: accepted
Date: 2026-03-06

## Context

The system needs to handle asynchronous AI processing that can take significant time (seconds to minutes), while maintaining responsive user interactions. Without proper async handling:

- UI blocks during AI processing
- Multiple concurrent requests cause resource contention
- No progress indication for long-running tasks
- Difficult cancellation and timeout management
- Race conditions between user actions and AI responses

The project needed an architecture to handle asynchronous task processing with proper queuing, progress tracking, and resource management.

## Decision

Implement a promise-based queue architecture with daemon workers for asynchronous task processing.

### Core Components

**Promise Queue:**
- FIFO queue for incoming async tasks
- Priority levels for different task types
- Configurable concurrency limits
- Timeout and cancellation support

**Daemon Workers:**
- Background processes that poll the queue
- Configurable worker pools
- Health monitoring and auto-restart
- Resource usage limits

**Promise States:**
```javascript
enum PromiseState {
  PENDING = 'pending',     // Queued, waiting for processing
  PROCESSING = 'processing', // Currently being handled by worker
  COMPLETED = 'completed',   // Successfully finished
  FAILED = 'failed',        // Processing failed
  CANCELLED = 'cancelled',  // User or system cancelled
  TIMEOUT = 'timeout'       // Exceeded time limits
}
```

### Queue Processing Flow

```
User Request → Promise Creation → Queue → Worker Processing → Result Storage → Notification
```

**Key Features:**
- **Non-blocking**: User requests return immediately with promise ID
- **Progress Tracking**: Real-time progress updates via consistent HTTP notifications
- **Cancellation**: Users can cancel queued or processing tasks
- **Timeout Handling**: Automatic cleanup of stale promises
- **Resource Limits**: Configurable concurrent processing limits

## Consequences

### Positive
- **Responsive UI**: No blocking during AI processing
- **Scalability**: Handle multiple concurrent users
- **Progress Visibility**: Users see task progress in real-time
- **Resource Control**: Prevent system overload
- **Fault Tolerance**: Isolated failures don't affect other tasks

### Negative
- **Architectural Complexity**: Additional queue management layer
- **Operational Overhead**: Daemon processes to manage and monitor
- **Latency**: Queue wait times for busy systems
- **State Management**: Additional state to track across components

### Trade-offs
- **Responsiveness vs Complexity**: Async processing adds complexity for better UX
- **Resource Usage vs Throughput**: Worker pools balance resource usage and processing capacity
- **Consistency vs Availability**: Queue isolation improves availability at cost of consistency complexity

## Notes / Follow-ups

### Completed
- ✅ Promise queue implementation
- ✅ Daemon worker architecture
- ✅ Progress tracking via real-time notifications
- ✅ Cancellation and timeout handling
- ✅ Resource limit configuration
- ✅ Integration with existing request flow

### Future Enhancements
- Add priority queues for different task types
- Implement distributed queue for horizontal scaling
- Add queue analytics and monitoring
- Consider Redis/external queue systems
- Add batch processing capabilities
