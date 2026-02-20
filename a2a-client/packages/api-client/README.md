# @a2a/api-client

HTTP client for A2A server communication. Provides methods for creating task cards, managing card lifecycle, and communicating with the A2A server.

## Installation

```bash
npm install @a2a/api-client
```

## Usage

### Basic Setup

```javascript
const { ApiClient } = require('@a2a/api-client');

const client = new ApiClient({
  serverUrl: 'http://localhost:3000/v1',
  token: 'your-auth-token',      // optional
  clientId: 'your-client-id',     // optional
  timeout: 30000                   // optional, default 30s
});
```

### Creating a Task Card

```javascript
const card = await client.createCard({
  sessionId: 'session-123',
  userRequest: {
    original: 'Add email validation to User model',
    timestamp: new Date().toISOString()
  },
  sections: {
    description: {
      type: 'text',
      required: true,
      value: 'Add email validation',
      questions: ['What needs to be done?']
    },
    context: {
      type: 'file_references',
      required: true,
      value: [],
      questions: ['Which files contain relevant code?']
    }
  }
});
```

### Answering Server Questions

```javascript
const answers = {
  'question-1': 'The User model is in app/Models/User.php',
  'question-2': 'Use Laravel validation rules'
};

const response = await client.answerQuestions(cardId, answers);
```

### Reporting Command Results

```javascript
const commandResults = [
  {
    commandId: 'cmd-1',
    success: true,
    result: { files: ['app/Models/User.php'] }
  },
  {
    commandId: 'cmd-2',
    success: false,
    error: 'File not found'
  }
];

await client.reportCommands(cardId, commandResults);
```

### Error Handling

```javascript
const { ApiClient, ApiError } = require('@a2a/api-client');

try {
  const card = await client.createCard({...});
} catch (err) {
  if (err instanceof ApiError) {
    console.error(`API Error ${err.status}: ${err.message}`);
    console.error('Error data:', err.data);
  } else {
    console.error('Network or other error:', err.message);
  }
}
```

## API Reference

### ApiClient

#### Constructor Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| serverUrl | string | No | http://localhost:3000/v1 | Server base URL |
| token | string | No | - | Authentication token |
| clientId | string | No | - | Client identifier |
| timeout | number | No | 30000 | Request timeout (ms) |

#### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| createCard(card) | Object | Promise<Object> | Create new task card |
| updateCard(cardId, updates) | string, Object | Promise<Object> | Update existing card |
| answerQuestions(cardId, answers) | string, Object | Promise<Object> | Answer server questions |
| reportCommands(cardId, results) | string, Array | Promise<Object> | Report command results |
| getCard(cardId) | string | Promise<Object> | Get card status |
| cancelCard(cardId) | string | Promise<Object> | Cancel task |
| searchRAG(query, options) | string, Object | Promise<Object> | Search RAG index |
| getStatus() | - | Promise<Object> | Get server status |

### ApiError

Error class with additional properties:

| Property | Type | Description |
|----------|------|-------------|
| status | number | HTTP status code |
| data | Object | Additional error data from server |

## Data Request Format

When requesting data from systems, use this format:

```javascript
const dataRequest = {
  sessionId: 'session-123',
  userRequest: {
    original: 'How does authentication work?',
    timestamp: new Date().toISOString()
  },
  sections: {
    description: {
      type: 'text',
      value: null,
      questions: ['What do you want to know?']
    },
    context: {
      type: 'file_references',
      value: [],
      questions: ['Which files are relevant?']
    }
  }
};
```

## License

MIT
