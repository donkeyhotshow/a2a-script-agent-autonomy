# @a2a/embedding - Embedding Client Module

> Provides embedding generation for semantic search using Ollama, OpenAI, Cohere, or Voyage AI.

## Features

- **Multiple providers**: Ollama (local)
- **Batch processing**: Efficient embedding of multiple texts
- **Caching**: In-memory and file-based caching
- **Deterministic fallback**: For testing without API keys

## Installation

```bash
npm install @a2a/embedding
```

## Quick Start

```javascript
const { createEmbeddingClient } = require('@a2a/embedding');

// Using Ollama (local)
const client = createEmbeddingClient({
  provider: 'ollama',
  baseUrl: 'http://localhost:11434',
  model: 'nomic-embed-text',
});

// Generate embedding
const embedding = await client.embed('Hello world');
```

## Providers

### Ollama (Local)

```javascript
const client = createEmbeddingClient({
  provider: 'ollama',
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  model: 'nomic-embed-text', // or bge-m3, bge-small
});
```

## Usage

### Single Embedding

```javascript
const embedding = await client.embed('UserService handles user operations');
// Returns: number[] (vector)
```

### Batch Embedding

```javascript
const texts = [
  'class UserService',
  'function createUser',
  'function deleteUser',
];

const embeddings = await client.embedBatch(texts);
// Returns: number[][]
```

### Caching

```javascript
const client = createEmbeddingClient({
  provider: 'ollama',
  cacheFile: './embeddings-cache.json', // Persist to file
});

// Embeddings are cached automatically
const emb1 = await client.embed('Hello');
const emb2 = await client.embed('Hello'); // Uses cache
```

### Check Availability

```javascript
const available = await client.isAvailable();
if (available) {
  console.log('Provider is ready');
}
```

### List Models

```javascript
const models = await client.listModels();
console.log(models); // ['nomic-embed-text', 'bge-m3', ...]
```

## Configuration

| Option    | Type   | Default          | Description                                    |
|-----------|--------|------------------|------------------------------------------------|
| provider  | string | ollama           | Provider: ollama, openai, cohere, voyage, mock |
| baseUrl   | string | provider default | Custom API URL                                 |
| model     | string | provider default | Model name                                     |
| apiKey    | string | env              | API key                                        |
| cacheFile | string | null             | Cache file path                                |
| batchSize | number | 100              | Batch size for API calls                       |
| timeout   | number | 60000            | Request timeout (ms)                           |

## Environment Variables

```bash
# Ollama
OLLAMA_BASE_URL=http://localhost:11434

# OpenAI
OPENAI_API_KEY=sk-...

# Cohere
COHERE_API_KEY=...

# Voyage AI
VOYAGE_API_KEY=...
```

## Models

### Ollama

- nomic-embed-text (768d)
- mxbai-embed-large (1536d)
- bge-m3 (1024d)
- bge-large (1024d)
- bge-small (384d)

### OpenAI

- text-embedding-3-small (1536d)
- text-embedding-3-large (3072d)
- text-embedding-ada-002 (1536d)

### Cohere

- embed-multilingual-v3.0 (1024d)
- embed-english-v3.0 (1024d)

### Voyage AI

- voyage-code-2 (1536d)
- voyage-law-2 (1024d)

## API Reference

### createEmbeddingClient(config)

Creates an embedding client.

```javascript
const client = createEmbeddingClient({
  provider: 'ollama',
  model: 'nomic-embed-text',
});
```

### client.embed(text)

Generate embedding for single text.

```javascript
const embedding = await client.embed('Hello world');
```

### client.embedBatch(texts)

Generate embeddings for multiple texts.

```javascript
const embeddings = await client.embedBatch(['text1', 'text2', 'text3']);
```

### client.isAvailable()

Check if provider is available.

```javascript
const available = await client.isAvailable();
```

### client.listModels()

List available models.

```javascript
const models = await client.listModels();
```

## License

MIT
