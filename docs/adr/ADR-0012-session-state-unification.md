# ADR-0012: Session State Unification

Status: accepted
Date: 2026-03-06

## Context

The Web UI component previously had a fragmented state management approach with multiple managers (SessionManager, SessionViewModel, SessionSync) creating complex event chains and synchronization issues. State was distributed across different components with inconsistent update patterns, leading to:

- Race conditions between UI updates and server state
- Complex event propagation chains (Manager → ViewModel → Sync → UI)
- Inconsistent state across different parts of the application
- Difficult debugging and testing due to state fragmentation
- Memory leaks from improper cleanup of event listeners

The project needed a unified approach to session state management that would serve as a single source of truth while maintaining real-time synchronization with server updates.

## Decision

Implement a unified SessionStore as the single source of truth for all session-related state, consolidating previously fragmented state management into one centralized store.

### Key Components

1. **SessionStore** (`session-store.js`) - Core state container with:
   - Unified state structure with all session data
   - Event emitter for UI subscriptions
   - Computed properties for derived state
   - Batch update methods for server responses

2. **TransportManager** (`transport-manager.js`) - Unified transport layer handling HTTP with automatic fallback

3. **SessionSync V2** (`session-sync-v2.js`) - Direct bridge between transport and store

4. **Legacy Adapters** (`session-store-adapters.js`) - Backward compatibility layer

### State Structure

```javascript
_state: {
    sessionId: string | null,
    projectId: string | null,
    messages: Message[], // conversation history (max 200)
    execute: object | null, // current execute object
    context: object, // full server context
    status: 'idle' | 'created' | 'active' | 'waiting' | 'completed' | 'error',
    pendingForm: object | null,
    lastError: object | null
}
```

## Consequences

### Positive
- **Simplified Architecture**: Single event chain instead of complex manager hierarchies
- **Improved Reliability**: Consistent state across all UI components
- **Better Performance**: Reduced redundant state updates and event propagation
- **Easier Testing**: Centralized state makes testing deterministic
- **Memory Safety**: Proper cleanup and no circular references

### Negative
- **Migration Complexity**: Required updating all existing UI components to use new store
- **Breaking Changes**: Legacy APIs deprecated, requiring adapter layer
- **Increased Bundle Size**: Additional abstraction layer

### Trade-offs
- **Consistency vs Complexity**: Unified store adds abstraction but ensures consistency
- **Performance vs Maintainability**: Slight performance overhead for better maintainability
- **Migration Effort vs Long-term Benefits**: Initial cost for ongoing reliability gains

## Notes / Follow-ups

### Completed
- ✅ SessionStore core implementation
- ✅ TransportManager unification
- ✅ Legacy adapter layer
- ✅ UI component migration
- ✅ Testing and validation

### Future Enhancements
- Consider immutable state updates for better performance
- Add state persistence middleware
- Implement optimistic updates for better UX
- Add state validation schemas
- Consider Redux/MobX alternatives for complex state logic
