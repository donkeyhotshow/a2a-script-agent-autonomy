# ADR-0004: LLM Integration Strategy

Status: accepted
Date: 2026-03-03

## Context

The A2A Server needs to integrate with Large Language Models (LLMs) for:
- **Intelligent request processing** - Understanding and analyzing user requests
- **Context-aware responses** - Generating relevant and accurate responses
- **Entity recognition** - Identifying and extracting meaningful information
- **Code generation** - Creating and modifying code based on requirements
- **Natural language processing** - Understanding and generating human-like text

The integration must:
- Support multiple LLM providers for flexibility and redundancy
- Handle varying response times and potential timeouts
- Manage API rate limits and costs effectively
- Provide fallback mechanisms for reliability
- Maintain security and data privacy
- Enable easy switching between providers

## Decision

Implement a **Provider-Abstraction Strategy** with the following components:

### 1. LLM Provider Abstraction

**Provider Interface:**
```typescript
interface LLMProvider {
  call(input: LLMInput): Promise<LLMResponse>
  getCapabilities(): ProviderCapabilities
  isAvailable(): Promise<boolean>
}
```

**Supported Providers:**
- **OpenAI** - GPT-4, GPT-3.5 with full feature support
- **Local LLM upstream** - Local LLMs with a2a-ai-hub service
- **Placeholder** - Mock responses for development/testing

**Provider Selection Strategy:**
- **Priority-based** selection with fallback chain
- **Health-check** based provider availability
- **Cost-aware** selection for budget optimization
- **Performance-based** selection for response time optimization

### 2. LLM Adapter Architecture

**LLM Adapter:**
- **Provider-agnostic interface** for consistent usage
- **Request/response transformation** for different provider formats
- **Error handling and retry logic** for reliability
- **Caching mechanism** for repeated requests
- **Rate limiting** to prevent API abuse

**Configuration Management:**
```typescript
interface LLMConfig {
  provider: 'openai' | 'compat_llm' | 'placeholder'
  openai?: {
    apiKey: string
    model: string
    timeout: number
    maxRetries: number
  }
  compat_llm?: {
    baseUrl: string
    model: string
    timeout: number
  }
  fallback: string[]
  cache?: {
    enabled: boolean
    ttl: number
  }
}
```

### 3. Promise-Based Integration

**a2a-ai-hub Service Integration:**
- **Promise creation** for long-running LLM calls
- **Polling mechanism** for status checking
- **Progress tracking** for user feedback
- **Timeout handling** for stuck requests
- **Cancellation support** for user-initiated stops

**Promise Flow:**
```
LLM Request → Create Promise → Poll Status → Get Response → Process Result
```

**Error Handling:**
- **Timeout detection** with configurable limits
- **Network error recovery** with exponential backoff
- **Provider-specific error mapping** for consistent handling
- **Graceful degradation** to fallback providers

### 4. Context Management

**Context Injection:**
- **Project context** - Frameworks, dependencies, structure
- **Conversation history** - Previous interactions and decisions
- **Entity context** - Recognized entities and relationships
- **User preferences** - Style, format, and quality preferences

**Context Optimization:**
- **Token usage optimization** to reduce costs
- **Relevant context filtering** to improve response quality
- **Context compression** for long conversations
- **Context expiration** to prevent memory leaks

### 5. Caching Strategy

**Cache Layers:**
- **In-memory cache** for immediate reuse
- **Database cache** for persistent storage
- **Distributed cache** for multi-instance deployments

**Cache Keys:**
- **Input hash** - Hash of LLM input for cache lookup
- **Context hash** - Hash of relevant context
- **Provider identifier** - Ensure provider-specific responses

**Cache Invalidation:**
- **Time-based** expiration
- **Context change** invalidation
- **Provider change** invalidation
- **Manual** cache clearing

### 6. Monitoring and Observability

**Metrics Collection:**
- **Response times** per provider
- **Success/failure rates** for reliability tracking
- **Token usage** for cost monitoring
- **Cache hit rates** for performance optimization

**Logging Strategy:**
- **Request/response logging** for debugging
- **Provider selection** logging for transparency
- **Error details** for troubleshooting
- **Performance metrics** for optimization

**Alerting:**
- **Provider unavailability** alerts
- **High error rates** notifications
- **Cost threshold** warnings
- **Performance degradation** alerts

## Consequences

### Positive

- **Flexibility**: Easy to switch between providers
- **Reliability**: Fallback mechanisms ensure service availability
- **Cost Control**: Multiple providers allow cost optimization
- **Performance**: Caching and optimization reduce response times
- **Observability**: Comprehensive monitoring and logging
- **Security**: Provider abstraction enables secure credential management

### Trade-offs

- **Complexity**: Multiple providers increase system complexity
- **Latency**: Abstraction layer may add slight overhead
- **Maintenance**: Multiple integrations require ongoing maintenance
- **Testing**: Need to test multiple provider scenarios

### Implementation Requirements

- **Provider implementations** for each supported LLM
- **Configuration management** for provider settings
- **Error handling** for provider-specific issues
- **Monitoring setup** for performance and reliability
- **Security measures** for API key management
- **Testing framework** for provider scenarios

## Alternatives Considered

### 1. Single Provider Strategy
- **Pros**: Simpler implementation, consistent behavior
- **Cons**: Vendor lock-in, single point of failure
- **Rejected**: Lacks flexibility and redundancy

### 2. Direct API Integration
- **Pros**: Maximum control, no abstraction overhead
- **Cons**: Tight coupling, difficult to switch providers
- **Rejected**: Reduces flexibility and maintainability

### 3. Microservice Architecture
- **Pros**: Independent scaling, technology diversity
- **Cons**: Network complexity, deployment overhead
- **Rejected**: Overkill for current requirements

## Notes / Follow-ups

- Implement comprehensive testing for all provider scenarios
- Set up monitoring and alerting for LLM service health
- Establish cost monitoring and budget alerts
- Plan for adding new LLM providers as they become available
- Implement proper security measures for API key management
- Consider implementing request queuing for rate limit management
- Add performance optimization based on usage patterns