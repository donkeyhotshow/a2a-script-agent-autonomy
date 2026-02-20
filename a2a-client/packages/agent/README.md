# @a2a/agent

A2A Agent - Main agent logic for processing user requests and executing server commands. This package handles the complete workflow from receiving a user request to executing commands from the server.

**Important**: This agent does NOT make requests to LLM - all AI work happens on the server. The agent is responsible for:
- Receiving user requests
- Filling out task cards
- Executing commands from the server

## Installation

```bash
npm install @a2a/agent
```

## Usage

### Basic Setup

```javascript
const { A2AAgent } = require('@a2a/agent');

const agent = new A2AAgent({
  serverUrl: 'http://localhost:3000/v1',
  projectPath: '/path/to/your/project',
  token: 'your-auth-token',      // optional
  userId: 'user-123'             // optional
});
```

### Processing a User Request

```javascript
// Process a request
const result = await agent.processRequest('Add email validation to User model');

// Handle different response types
switch (result.type) {
  case 'questions':
    console.log('Server needs more info:', result.questions);
    // Ask user and then call agent.answerQuestions()
    break;
    
  case 'task_created':
    console.log('Task created:', result.task);
    break;
    
  case 'processing':
    console.log('Task is being processed...');
    break;
    
  case 'completed':
    console.log('Task completed:', result.result);
    break;
    
  case 'error':
    console.error('Error:', result.error);
    break;
}
```

### Answering Questions

```javascript
// After receiving 'questions' response
const answers = {
  'What needs to be done?': 'Add email validation to the User model',
  'Which files contain relevant code?': ['app/Models/User.php']
};

const response = await agent.answerQuestions(answers);
```

### Executing Commands Manually

```javascript
// Execute commands from server
const commands = [
  {
    id: 'cmd-1',
    type: 'search_rag',
    params: {
      query: 'email validation',
      options: { limit: 5 }
    }
  },
  {
    id: 'cmd-2',
    type: 'read_file',
    params: {
      path: 'app/Models/User.php'
    }
  }
];

const results = await agent.executeCommands(commands);
console.log(results);
```

## Command Types

The agent can execute the following command types:

| Command | Description | Parameters |
|---------|-------------|------------|
| `read_file` | Read file content | `path` |
| `write_file` | Write file content | `path`, `content` |
| `apply_patch` | Apply git patch | `patch`, `path` |
| `git_add` | Add to git staging | `path` |
| `git_commit` | Commit changes | `message` |
| `git_checkout` | Switch branch | `branch` |
| `run_test` | Run test file | `path` |
| `index_files` | Index project files | `force` |
| `search_rag` | Search RAG index | `query`, `options` |
| `show_message` | Show message | `message` |
| `request_confirmation` | Request confirmation | `message` |

## Data Request Format

When the agent requests data from systems, it uses this format:

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

## Command Execution Format

Commands from the server follow this format:

```javascript
const command = {
  id: 'cmd-001',
  type: 'search_rag',
  params: {
    query: 'валидация email',
    options: {
      limit: 10,
      type: 'class'
    }
  }
};
```

### Response Format

```javascript
const response = {
  commandId: 'cmd-001',
  success: true,
  results: [
    {
      chunk: {
        filePath: 'app/Models/User.php',
        type: 'class',
        name: 'User',
        content: '...'
      },
      score: 25.5,
      highlights: ['...']
    }
  ]
};
```

## API Reference

### A2AAgent

#### Constructor Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| serverUrl | string | No | http://localhost:3000/v1 | A2A server URL |
| projectPath | string | Yes | - | Path to project directory |
| token | string | No | - | Authentication token |
| userId | string | No | anonymous | User identifier |

#### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| processRequest(request) | string | Promise<Object> | Process user request |
| answerQuestions(answers) | Object | Promise<Object> | Answer server questions |
| executeCommands(commands) | Array | Promise<Array> | Execute server commands |
| initSession() | - | Promise<string> | Initialize new session |

### CardManager

Manages task card lifecycle:

```javascript
const { CardManager } = require('@a2a/agent');

const manager = new CardManager();
const card = manager.createCard({
  sessionId: 'session-123',
  user: { id: 'user-1' },
  project: { path: '/project', type: 'laravel' },
  request: { raw: 'Add feature' }
});
```

### FileSystem

File operations:

```javascript
const { FileSystem } = require('@a2a/agent');

const fs = new FileSystem({ projectPath: '/project' });
const content = await fs.readFile('app/Models/User.php');
```

### GitOps

Git operations:

```javascript
const { GitOps } = require('@a2a/agent');

const git = new GitOps('/project');
await git.add('app/Models/User.php');
await git.commit('Add email validation');
```

## Project Type Detection

The agent automatically detects project types:

- **Laravel**: Checks for `artisan` file
- **Vue**: Checks for `vue.config.js`
- **React**: Checks for `src/App.jsx` or `src/App.tsx`
- **Node**: Checks for `package.json`
- **Unknown**: Default fallback

## License

MIT
