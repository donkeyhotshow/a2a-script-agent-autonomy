# @a2a/graph

Graph indexing and search module for A2A. Builds knowledge graphs from code projects to visualize dependencies and relationships.

## Features

- **Graph Builder**: Scans project files and extracts dependencies
- **Graph Searcher**: Search nodes by name, type, or content
- **Graph Manager**: Load, save, and manage graph data
- **Multi-language support**: PHP, JavaScript, TypeScript, Vue

## Usage

```javascript
const { createGraph } = require('@a2a/graph');

const graph = createGraph({
  projectPath: '/path/to/project'
});

// Build graph index
await graph.builder.build();

// Search graph
const results = graph.searcher.search('UserController');

// Get graph data
const data = graph.manager.getData();
```

## Graph Data Format

```javascript
{
  nodes: [
    { id: 'src/UserController.php', type: 'controller', relations: [] },
    { id: 'src/User.php', type: 'model', relations: [] }
  ],
  edges: [
    { from: 'src/UserController.php', to: 'src/User.php', type: 'uses' }
  ]
}
```

## Node Types

- `controller` - PHP controllers
- `model` - PHP/JS models
- `service` - Service classes
- `repository` - Repository classes
- `middleware` - Middleware
- `js` - JavaScript files
- `ts` - TypeScript files
- `vue` - Vue components
- `config` - Configuration files
- `doc` - Documentation
