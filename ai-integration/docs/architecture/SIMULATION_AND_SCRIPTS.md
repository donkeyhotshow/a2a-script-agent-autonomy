# Simulation and Scripts Architecture Documentation

## Overview

The ai-integration module includes a sophisticated simulation system (rnj-L) and supporting scripts for training, daemon management, and utility operations. The simulation system enables intelligent response generation based on conversation history and embedding similarity.

## Core Architecture

### Simulation System (rnj-L)

The simulation system consists of three main components working together:

#### 1. Storage Layer (`storage.py`)

**Purpose**: Persistent storage for conversation records and vector indices.

**Key Classes**:
- `ConversationRecord`: Individual conversation data structure
- `VectorIndex`: FAISS index with embeddings and metadata
- `ConversationStore`: Main storage interface

**Features**:
- JSON-based conversation storage
- FAISS vector index management
- Automatic backup and recovery
- Statistics and analytics

**Storage Structure**:
```
simulation_data/
├── conversations/          # Individual conversation records
│   ├── 2024-01-01.json
│   └── 2024-01-02.json
├── index/                  # FAISS vector index
│   ├── embeddings.npy
│   ├── index.faiss
│   └── metadata.json
└── backups/                # Automatic backups
```

#### 2. Learning Layer (`learner.py`)

**Purpose**: Embedding generation and index building using ML models.

**Key Classes**:
- `EmbeddingLearner`: Manages sentence transformer models and FAISS indexing

**Features**:
- SentenceTransformer integration
- CPU-optimized embedding models
- FAISS index construction and management
- Batch processing capabilities

**Supported Models**:
- Default: `all-MiniLM-L6-v2` (lightweight, fast)
- Configurable via `SimulationConfig.embedding_model`

**Index Building Process**:
1. Load conversation records from storage
2. Generate embeddings for all prompts
3. Build FAISS index for similarity search
4. Save index and metadata to disk

#### 3. Engine Layer (`engine.py`)

**Purpose**: Core decision-making and response generation logic.

**Key Classes**:
- `SimulationEngine`: Main simulation orchestrator
- `ConfidenceScore`: Confidence assessment with detailed metrics
- `SimilarPrompt`: Similarity search results

**Confidence Calculation**:

The engine calculates simulation confidence using multiple factors:

```
confidence = w1 * similarity + w2 * coverage + w3 * recency

Where:
- similarity: Cosine similarity to nearest known prompt
- coverage: Ratio of input words covered by similar prompts
- recency: Boost for recently similar interactions
```

**Decision Flow**:
1. Receive input prompt
2. Find similar prompts via vector search
3. Calculate confidence score
4. If confidence > threshold: generate simulated response
5. Otherwise: forward to real LLM

### Configuration System (`config.py`)

**Purpose**: Centralized configuration management for simulation parameters.

**Key Settings**:
- `confidence_threshold`: Minimum confidence for simulation (default: 0.75)
- `embedding_model`: SentenceTransformer model name
- `max_history`: Maximum conversation history to consider
- `auto_update_threshold`: Records needed before auto-update
- `data_path`: Base directory for simulation data

## Scripts Architecture

### Training Scripts (`scripts/train.py`)

**Purpose**: Manual management of the simulation index.

**Commands**:

#### `build`
- Rebuilds index from all conversation history
- Time-intensive operation for large datasets
- Use when starting fresh or after major data changes

#### `update`
- Incremental update with new records only
- Faster than full rebuild
- Automatic threshold-based triggering

#### `stats`
- Display storage statistics and configuration
- Shows record counts, index status, paths

#### `backup`
- Create timestamped backup of current data
- Automatic cleanup of old backups

**Usage Examples**:
```bash
# Full rebuild
python scripts/train.py build

# Incremental update
python scripts/train.py update

# Show statistics
python scripts/train.py stats
```

### Promise Queue Daemon (`scripts/promise_queue_daemon.py`)

**Purpose**: Background processor for async promise execution.

**Key Features**:
- Polls proxy for pending promises
- Automatically executes requests against Local LLM upstream
- Retry logic with configurable attempts
- Comprehensive logging and error handling

**Operation Modes**:

#### Auto-Approve Mode (default)
- Automatically calls `/promise/<id>/execute` for pending promises
- Monitors Local LLM upstream availability
- Prevents concurrent execution conflicts

#### Report-Only Mode (`--no-auto-approve`)
- Lists pending promises without execution
- Useful for monitoring and manual control

#### Dry-Run Mode (`--dry-run`)
- Simulates execution without actual calls
- Logs what would be executed

**Configuration Options**:
- `--proxy-url`: Proxy base URL (default: localhost:11434)
- `--interval`: Poll interval in seconds
- `--timeout`: HTTP timeout for requests
- `--response-attempts`: Retry attempts for response fetching
- `--max-empty-cycles`: Stop after N empty polls

**Execution Flow**:
1. Poll `/promises/pending` for waiting promises
2. Check Local LLM upstream status
3. Execute promises via `/promise/<id>/execute`
4. Wait for completion and fetch results
5. Handle errors and retries automatically

### Utility Scripts

#### `test_promise_simulate.py`
- Simulates promise queue operations for testing
- Validates daemon behavior without real execution

#### `test_promise_daemon.py`
- Integration tests for daemon functionality
- End-to-end promise processing validation

#### `test_cleanup.py`
- Maintenance script for storage cleanup
- Removes expired or corrupted data

## Data Flow Architecture

### Training Phase

```
Conversation History → Storage → Embedding Learner → FAISS Index
       ↓
Configuration → Simulation Engine → Confidence Model
```

### Runtime Phase

```
Input Prompt → Vector Search → Similarity Scoring → Confidence Check
       ↓
   If confident: Generate Response
   If not confident: Forward to Real LLM
```

### Promise Processing

```
Client Request → Proxy → Promise Creation → Daemon Processing
       ↓
Background Execution → Response Storage → Client Notification
```

## Integration Points

### With Proxy System
- Simulation engine integrated via `simulation_handler.py`
- Promise system provides async execution framework
- Configuration shared through environment variables

### With AI Hub
- Virtual models supported through `ai_hub_config.py`
- Rule-based response generation
- Fallback mechanisms for edge cases

### With Local LLM Upstream
- Daemon manages Local LLM upstream lifecycle
- Health monitoring and automatic restart
- Load balancing and concurrency control

## Performance Considerations

### Embedding Models
- Use lightweight CPU models for production
- Consider GPU acceleration for large datasets
- Balance model size vs. accuracy requirements

### Index Management
- Incremental updates reduce rebuild frequency
- Regular backups prevent data loss
- Monitor index size and rebuild thresholds

### Memory Usage
- FAISS indices can be large for big datasets
- Implement pagination for large result sets
- Monitor embedding generation memory usage

## Monitoring and Maintenance

### Health Checks
- Index integrity validation
- Storage space monitoring
- Performance metrics collection

### Maintenance Tasks
- Regular index rebuilds
- Old backup cleanup
- Storage optimization

### Troubleshooting
- Confidence score analysis
- Index rebuild debugging
- Promise queue monitoring

## Future Extensions

### Planned Features
- Multi-language model support
- Dynamic confidence thresholds
- Advanced similarity algorithms
- Real-time index updates

### Scalability Improvements
- Distributed index storage
- Parallel embedding generation
- Caching optimizations