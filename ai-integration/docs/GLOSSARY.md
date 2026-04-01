# AI Integration Glossary

## Overview

This glossary defines key terms and concepts specific to the AI Integration module (ai-integration) of the A2A Script Agent project.

## Core Concepts

### Proxy (Ollama Proxy)
A service that intercepts and logs requests to Ollama LLM, operating on port 11434 by default. It forwards requests to the actual Ollama instance (port 11435) while providing additional features like logging, simulation, and model mapping.

### LLM Provider
A generic interface for connecting to various Large Language Model services:
- **OpenAI** - OpenAI API compatible models
- **Ollama** - Local LLM deployment
- **HuggingFace** - HuggingFace inference endpoints

### Promise (Async Promise)
An asynchronous operation identifier (`promiseId`) used for long-running LLM operations. Allows clients to submit requests and retrieve results later via polling.

### Model Mapping
Configuration that maps user-facing model names to actual provider endpoints. Enables flexible routing and abstraction over different LLM backends.

### Simulation Mode
A feature that allows the proxy to simulate LLM responses based on learned patterns from historical data (e.g., learning from rnj-1 model and simulating rnj-L responses).

## Components

### Proxy Handler
Core component that processes incoming requests, routes them to appropriate LLM providers, and manages responses.

### Router
Component responsible for selecting the appropriate LLM provider based on model mapping configuration and request parameters.

### Ollama Manager
Service that automatically starts and stops the Ollama process based on usage patterns (idle timeout).

### Caching Layer
System for caching LLM responses to reduce redundant API calls and improve performance.

### Metrics Collection
System for tracking proxy performance, including request counts, response times, and error rates.

## Configuration

### AI_HUB_CONFIG
JSON configuration file that defines model mappings, routing rules, and simulation parameters.

### Environment Variables
- `PROXY_PORT` - Proxy listener port (default: 11434)
- `OLLAMA_HOST` - Target Ollama host (default: http://localhost:11435)
- `SIMULATION_ENABLED` - Enable ML simulation mode
- `OLLAMA_AUTO_START` - Auto-start Ollama on demand

## API Endpoints

### `/health` - Liveness Probe
Basic health check endpoint.

### `/health/ollama` - Ollama Availability
Detailed Ollama status including availability and idle time.

### `/v1/chat/completions` - OpenAI Compatible API
OpenAI Chat Completions API endpoint for LLM interactions.

### `/promises/pending` - Promise Queue
Endpoint for checking pending async operations.

## Architecture

```
Client Request → Proxy (11434) → Router → LLM Provider
                                      ↓
                              [Model Mapping]
                                      ↓
                              [Cache Layer]
                                      ↓
                              [Ollama/HuggingFace/OpenAI]
```
