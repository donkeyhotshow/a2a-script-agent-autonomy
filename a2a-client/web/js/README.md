# Web UI Components

This directory contains JavaScript components for the A2A Client web interface.

## Components

### Virtual Explorer (`virtual-explorer.js`)

Virtualized file tree for large projects with efficient rendering.

```javascript
// Initialize
VirtualExplorer.init({ itemHeight: 28 });

// Set file data
VirtualExplorer.setFiles([
  'app/Models/User.php',
  'app/Services/UserService.php',
  'resources/views/users/index.vue',
]);

// Filter files
VirtualExplorer.filterFiles('User');

// Handle selection
VirtualExplorer.onSelect = (path) => {
  console.log('Selected:', path);
};

// Handle open
VirtualExplorer.onOpen = (path) => {
  // Open in editor
};

// Get stats
const stats = VirtualExplorer.getStats();
// { totalFiles: 1000, visibleFiles: 50, expandedDirs: 5 }
```

**Features:**
- Virtual scrolling for 100k+ files
- Tree structure with expand/collapse
- Keyboard navigation (arrows, enter, backspace)
- Ctrl+F to focus filter
- File type icons

### Monaco Editor (`monaco-editor.js`)

Code editor with syntax highlighting.

```javascript
// Initialize
await MonacoEditor.init({
  containerId: 'editorContent',
  theme: 'vs-dark',
  fontSize: 14,
  minimap: true,
});

// Open file
await MonacoEditor.openFile('UserService.php', phpCode);

// Get content
const content = MonacoEditor.getValue();

// Set content
MonacoEditor.setValue('new content');

// Insert at cursor
MonacoEditor.insertText('// Inserted text');

// Format document
MonacoEditor.formatDocument();

// Go to line
MonacoEditor.goToLine(42);

// Find
MonacoEditor.find('createUser');

// Replace
MonacoEditor.replace('oldText', 'newText');

// Save
await MonacoEditor.save();

// Check dirty state
if (MonacoEditor.isDirty()) {
  // Unsaved changes
}

// Listen for events
document.addEventListener('editor:change', (e) => {
  console.log('Content changed:', e.detail);
});

document.addEventEvent('editor:save', (e) => {
  console.log('Save:', e.detail);
});
```

**Supported Languages:**
- JavaScript/TypeScript
- Vue (SFC)
- PHP
- Python
- Ruby
- Java
- Go
- Rust
- C/C++
- HTML/CSS
- JSON/YAML
- SQL
- And more...

**Configuration Options:**

| Option | Default | Description |
|--------|---------|-------------|
| containerId | editorContent | Container element ID |
| theme | vs-dark | Theme (vs, vs-dark, hc-black) |
| fontSize | 14 | Font size |
| minimap | true | Show minimap |
| lineNumbers | true | Show line numbers |
| wordWrap | off | Word wrap mode |
| tabSize | 2 | Tab size |

## HTML Integration

```html
<!-- File Explorer Container -->
<div id="fileExplorer" style="height: 300px; overflow-y: auto;">
  <div id="fileTree"></div>
</div>

<!-- Filter Input -->
<input type="text" id="fileFilter" placeholder="Filter files..." />

<!-- Editor Container -->
<div id="editorContainer" style="height: 500px;">
  <div id="editorHeader" style="height: 30px;"></div>
  <div id="editorContent" style="height: calc(100% - 30px);"></div>
</div>
```

## Keyboard Shortcuts

### Virtual Explorer
- `Ctrl+F` - Focus filter
- `Arrow Up/Down` - Navigate files
- `Enter` - Open selected file
- `Backspace` - Go to parent directory

### Monaco Editor
- `Ctrl+F` - Find
- `Ctrl+H` - Replace
- `Ctrl+G` - Go to line
- `Ctrl+S` - Save
- `Shift+Alt+F` - Format document
- `Ctrl+Shift+P` - Command palette
