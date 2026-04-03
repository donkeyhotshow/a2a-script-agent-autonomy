# A2A System Cross-Comparison with Analogs

Purpose: Clarify system parts, their roles, and how they differ from popular agent frameworks.

---

## System Parts at a Glance

| Component | Port | Responsibility | Analogy |
|-----------|------|----------------|---------|
| **Web UI** | 5173 | Human interface, session visualization | ChatGPT web interface |
| **Client API** | 5173/api/a2a | Session lifecycle, storage, routing | OpenAI Assistants API threads |
| **A2A Server** | 3000 | Core logic, LLM orchestration, transforms | LangGraph agent runtime |
| **AI Integration** | 11434 | Provider abstraction, proxy, health | LiteLLM proxy |
| **Ollama** | 11435 | Local LLM execution | Local LLM server |

---

## Detailed Architecture Comparison

### 1. Session Management Deep Dive

| Aspect | A2A (Custom) | OpenAI Assistants API | LangGraph | Semantic Kernel |
|--------|--------------|----------------------|-----------|-----------------|
| **Storage Backend** | File-based JSON (`storage/sessions/`) | Cloud (OpenAI servers) | Configurable (SQLite/Postgres/Redis) | Memory stores (volatile) |
| **Persistence Model** | Append-only step folders | Message thread | State checkpoints | Chat history |
| **Session ID Format** | `sess_{timestamp}_{random}` + `srv_sess_*` | `thread_xxx` | Thread ID from checkpoint | Session ID |
| **Step Storage** | Explicit numbered folders (1/, 2/, 3/) | Hidden (messages only) | Checkpoints with state | Turns |
| **History Access** | Direct file read | API pagination | Checkpoint loader | Memory access |
| **Offline Replay** | `replay-session-from-disk.js` | Not possible | Possible with checkpoints | Limited |
| **Audit Trail** | Complete request/response chain | API logs | Application logs | Debug logs |
| **Retention** | Project-controlled | Vendor policy | Application-controlled | Session lifetime |

**A2A Session Folder Structure:**
```
a2a-client/storage/sessions/sess_1234567890/
├── 1/
│   ├── client-result.json       # User input
│   ├── request-to-server.json   # Payload to A2A Server
│   ├── server-response.json     # Execute/context/result
│   ├── server-promise.json      # Async pending state
│   └── messages.json            # Conversation slice
├── 2/
│   └── ...
└── session.json                 # Session metadata
```

**Key Difference:** A2A stores every step as separate JSON files for audit/debugging. Others optimize for retrieval and hide implementation details.

---

### 2. Agent Orchestration Models

#### A2A: Router + Gray Room Pattern

```
User Input
    ↓
[Router] ──→ dialog ──→ immediate response
    │
    ├──→ agent ──→ [Gray Room] ──→ LLM ──→ response
    │
    └──→ task-decomposition ──→ [Sequence Workbench]
```

**Gray Room Chain:**
```
compress_history → thinking → auto_rag_page → 
auto_read_file → clarify → [LLM call] → 
server-transforms-response → response.json
```

#### LangGraph: State Machine Pattern

```python
from langgraph.graph import StateGraph, END

builder = StateGraph(AgentState)
builder.add_node("router", router_node)
builder.add_node("agent", agent_node)
builder.add_conditional_edges(
    "router",
    lambda state: "agent" if state["requires_llm"] else "dialog",
    {"agent": "agent", "dialog": END}
)
```

#### AutoGen: Conversational Pattern

```python
from autogen import ConversableAgent, GroupChat

agent = ConversableAgent(
    name="assistant",
    llm_config={"config_list": config_list}
)
user_proxy = UserProxyAgent(name="user")
user_proxy.initiate_chat(agent, message="Task")
```

#### CrewAI: Role-Based Pattern

```python
from crewai import Agent, Task, Crew

researcher = Agent(role="Researcher", goal="Find data")
writer = Agent(role="Writer", goal="Create content")

task = Task(description="Research topic", agent=researcher)
crew = Crew(agents=[researcher, writer], tasks=[task])
```

---

### 3. State Management Comparison

| Aspect | A2A Workbench | LangGraph State | AutoGen State | Semantic Kernel |
|--------|---------------|---------------|---------------|-----------------|
| **Structure** | `context.workbench.sections` | TypedDict / Pydantic | Agent internal | Context variables |
| **UI Integration** | Native (`form`, `choices`) | External | External | External |
| **Serialization** | JSON files per step | Checkpoints | Pickle | JSON |
| **Mutability** | Append-only with transforms | Node mutations | Agent updates | Plugin updates |
| **Access Pattern** | Read current, write next | Full state per node | Message-based | Key-value |

**A2A Workbench Structure:**
```json
{
  "context": {
    "workbench": {
      "sections": {
        "current_task": "Implement feature X",
        "files": ["src/foo.ts"],
        "notes": [{"id": "n1", "content": "Important note"}],
        "sequence": {
          "predictions": [...],
          "completed": [...]
        }
      }
    }
  }
}
```

**LangGraph State:**
```python
class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    next_agent: str
    current_task: str
```

---

### 4. Communication Protocols

#### A2A Protocol (Custom)

**Request Flow:**
```
client-result.json → [transforms] → request.md → [LLM]
                                           ↓
response.md → [transforms] → server-response.json
```

**Action-Key Shape:**
```json
// Execute
{
  "execute": {
    "script": {
      "command": "npm test",
      "workingDir": "${context.projectRoot}"
    }
  }
}

// Result
{
  "result": {
    "read-file": {
      "path": "src/main.ts",
      "content": "..."
    }
  }
}
```

**Async Pattern:**
```bash
POST /api/a2a/sessions/{id}/next      # Submit (ack only)
GET  /api/a2a/sessions/{id}/async     # Poll until settled
```

#### MCP (Model Context Protocol)

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "read_file",
    "arguments": {"path": "/tmp/file.txt"}
  }
}
```

#### OpenAI Assistants API

```python
from openai import OpenAI

client = OpenAI()
thread = client.beta.threads.create()
run = client.beta.threads.runs.create(
    thread_id=thread.id,
    assistant_id="asst_xxx",
    instructions="Process this"
)
# Poll for completion
while run.status in ["queued", "in_progress"]:
    run = client.beta.threads.runs.retrieve(
        thread_id=thread.id,
        run_id=run.id
    )
```

#### Google A2A Protocol

```json
{
  "jsonrpc": "2.0",
  "method": "tasks/send",
  "params": {
    "id": "task-123",
    "sessionId": "session-456",
    "acceptedOutputModes": ["text"],
    "message": {
      "role": "user",
      "parts": [{"text": "Hello"}]
    }
  }
}
```

---

### 5. Storage Architecture Deep Dive

| System | Storage Type | Query Capability | Backup/Restore | Scale Limits |
|--------|--------------|------------------|----------------|--------------|
| **A2A** | JSON files (flat) | File glob, custom scanners | Git, zip | Disk size |
| **LangGraph** | SQLite/Postgres | SQL queries | Database backup | DB capacity |
| **LlamaIndex** | Vector stores (Chroma, Pinecone) | Semantic search | Index export | Vector DB limits |
| **OpenAI** | Proprietary | API pagination | Not applicable | Rate limits |

**A2A RAG Implementation:**
```typescript
// packages/rag/src/rag-service.ts
const results = await ragService.search({
  query: "How to configure Ollama?",
  corpus: ["docs/**/*.md"],
  algorithm: "bm25",  // or "vector"
  limit: 5
});
```

**LangChain RAG:**
```python
from langchain.vectorstores import Chroma
from langchain.embeddings import OpenAIEmbeddings

vectorstore = Chroma.from_documents(
    documents,
    OpenAIEmbeddings()
)
retriever = vectorstore.as_retriever()
```

---

### 6. LLM Integration Patterns

| System | Provider Abstraction | Request Format | Response Handling | Model Switching |
|--------|---------------------|----------------|-------------------|-----------------|
| **A2A** | AI Integration proxy | `request.md` (full context) | Transforms → JSON | `llmModel` in context |
| **LiteLLM** | Drop-in replacement | OpenAI-compatible | Direct proxy | Model parameter |
| **LangChain** | Provider classes | Structured prompts | Output parsers | Model classes |
| **Semantic Kernel** | Kernel + plugins | Prompt templates | Result objects | Model selection |

**A2A Request Preparation:**
```markdown
<!-- request.md generated from transforms -->
## System
You are a helpful coding assistant.

## Context
- Project: ${context.projectRoot}
- Current task: ${context.workbench.sections.current_task}

## History
[Previous turns]

## Request
Implement the feature described above.
```

**LangChain Prompt:**
```python
from langchain.prompts import ChatPromptTemplate

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful coding assistant."),
    ("human", "Task: {task}")
])
```

---

## Unique A2A Concepts Explained

### 1. Gray Room (Server-Side Pre-Processing)

**Purpose:** Execute LLM calls server-side before client response, enabling complex workflows without client awareness.

**Chain Steps:**
1. `compress_history` - Summarize long conversations
2. `thinking` - Internal reasoning (optional)
3. `auto_rag_page` - Automatic context retrieval
4. `auto_read_file` - Automatic file inspection
5. `clarify` - Ask user for missing info

**Comparison:**
- **LangGraph:** Interrupt nodes (client-side aware)
- **AutoGen:** Human-in-loop (explicit)
- **A2A:** Gray Room (transparent to client)

---

### 2. Action-Key Shape

**Constraint:** Single action type per execute/result object.

```json
// ✅ CORRECT - A2A
{
  "execute": {
    "script": {
      "command": "ls -la",
      "workingDir": "/project"
    }
  }
}

// ❌ WRONG - A2A (would be rejected)
{
  "execute": {
    "action": "script",
    "command": "ls -la"
  }
}

// ❌ WRONG - A2A (multiple actions)
{
  "execute": {
    "script": {...},
    "read-file": {...}
  }
}
```

**Other Frameworks:**
```python
# OpenAI Functions
tools = [
    {"type": "function", "function": {"name": "script", ...}},
    {"type": "function", "function": {"name": "read_file", ...}}
]

# LangChain
tools = [script_tool, read_file_tool]
```

---

### 3. Router Dialog (Two-Beat Pattern)

**Beat A: Task Collection**
```json
{
  "execute": {
    "form": {
      "title": "New Task",
      "fields": [{"name": "task", "type": "text"}]
    }
  }
}
```

**Beat B: Pipeline Selection**
```json
{
  "execute": {
    "form": {
      "title": "Select Pipeline",
      "choices": [
        {"id": "dialog", "label": "Quick Dialog", "type": "dialog"},
        {"id": "agent", "label": "Agent Mode", "type": "agent"},
        {"id": "task-decomposition", "label": "Break Down", "type": "task"}
      ]
    }
  }
}
```

**Other Frameworks:**
- **LangGraph:** Conditional edges (code-defined)
- **AutoGen:** GroupChat (dynamic)
- **CrewAI:** Fixed task delegation

---

### 4. Workbench (UI-Annotated State)

**Structure:**
```typescript
interface WorkbenchSections {
  current_task?: string;        // Active task description
  files?: string[];             // Referenced files
  notes?: Note[];               // Key observations
  sequence?: Sequence;          // Task predictions
  grayRoom?: GrayRoomState;     // Gray room metadata
  batch?: BatchState;           // Multi-file operations
  slots?: Slot[];               // UI slots
}
```

**Comparison:**
- **LangGraph:** TypedDict (code-only)
- **LlamaIndex:** Node metadata (index-focused)
- **A2A:** Workbench (UI-first, annotated)

---

## Performance Characteristics

| Metric | A2A | LangGraph | OpenAI Assistants |
|--------|-----|-----------|-------------------|
| **Cold Start** | ~2s (local) | ~1s (in-memory) | ~500ms (cloud) |
| **Step Latency** | Disk I/O bound | Memory bound | Network bound |
| **Throughput** | Single node | Single node | Scales with API |
| **Memory** | Low (streaming disk) | Medium (state in RAM) | N/A (external) |
| **Concurrent Sessions** | 100s (file system) | 1000s (async) | Unlimited (cloud) |

---

## Security Model

| Aspect | A2A | LangGraph | OpenAI |
|--------|-----|-----------|--------|
| **Data Residency** | Local only | Configurable | OpenAI servers |
| **Encryption** | At-rest (optional), in-transit (TLS) | Application-defined | TLS to cloud |
| **Auth** | JWT (SKIP_AUTH in dev) | Application-defined | API keys |
| **Sandbox** | Script execution (configurable) | Code execution (risk) | No execution |
| **Audit** | Full request/response files | Application logs | API logs |

---

## Developer Experience

| Aspect | A2A | LangGraph | AutoGen | CrewAI |
|--------|-----|-----------|---------|--------|
| **Debugging** | File inspection, replay | Breakpoints, logging | Logging | Logging |
| **Testing** | Simulations (golden files) | Unit tests | Unit tests | Unit tests |
| **Hot Reload** | `start-all.bat` restart | Module reload | Module reload | Module reload |
| **Docs** | Extensive ADRs | API docs + tutorials | API docs | Tutorials |
| **IDE Support** | TypeScript, strict | Python, mypy | Python | Python |

---

## Testing Strategy Comparison

### A2A: Golden Simulations

```
simulations/
├── sync/
│   ├── agent/1/
│   │   ├── request.json
│   │   ├── response.json
│   │   ├── request.md
│   │   └── response.md
│   └── dialog/1/
└── async/
    └── promise-lifecycle/1/
```

**Validation:**
```bash
npm run sim:lint -- --all
npm run sim:validate -- --all --step-contract
```

### LangGraph: Unit Tests

```python
from langgraph.test import assert_graph_equal

def test_agent_flow():
    result = app.invoke({"messages": ["Hello"]})
    assert "response" in result
```

### OpenAI: Integration Tests

```python
def test_assistant():
    run = client.beta.threads.runs.create(...)
    assert run.status == "completed"
```

---

## When to Use What

| Use Case | Recommendation | Rationale |
|----------|----------------|-----------|
| **Full local control** | A2A | No vendor lock-in, full audit trail |
| **Quick prototype** | OpenAI Assistants | Hosted, fast setup |
| **Complex multi-agent** | AutoGen or LangGraph | Native patterns, battle-tested |
| **Task crews** | CrewAI | Role-based design, clear ownership |
| **RAG-heavy** | LlamaIndex | Built for retrieval, many integrations |
| **Universal proxy** | LiteLLM | Drop-in replacement for any app |
| **Enterprise integration** | Semantic Kernel | Microsoft ecosystem, enterprise patterns |
| **Research/experimentation** | LangGraph | Flexible, academic backing |
| **Production reliability** | A2A | Simulations as contracts, deterministic |

---

## Migration Paths

### From OpenAI Assistants to A2A

**Challenge:** Thread-based → Step-based

**Mapping:**
| Assistants | A2A |
|------------|-----|
| Thread | Session folder |
| Message | `messages.json` slice |
| Run | `server-response.json` |
| Tool call | `execute` action |
| Tool output | `result` action |

**Code Example:**
```python
# Before: OpenAI
thread = client.beta.threads.create()
run = client.beta.threads.runs.create(
    thread_id=thread.id,
    assistant_id="asst_xxx"
)

# After: A2A Client API
curl -X POST http://localhost:5173/api/a2a/sessions \
  -d '{"mode": "agent", "task": "..."}'
```

### From LangGraph to A2A

**Challenge:** State graph → Workbench sections

**Mapping:**
| LangGraph | A2A |
|-----------|-----|
| Node | `execution.step` |
| Edge | Router choice |
| State | `context.workbench.sections` |
| Interrupt | Gray Room `clarify` |
| Checkpoint | Step folder |

**Code Example:**
```python
# Before: LangGraph
builder.add_node("process", process_node)
builder.add_edge("process", END)

# After: A2A
# Node becomes execution.step
# Edge becomes router choice
```

### From AutoGen to A2A

**Challenge:** Multi-agent → Single orchestrator

**Note:** A2A multi-agent is planned (ADR-0038). Current: single orchestrator with `dialog`/`agent`/`task-decomposition`.

---

## Protocol Comparison: Detailed

| Feature | A2A Custom | Google A2A | MCP | OpenAI |
|---------|-----------|-----------|-----|--------|
| **Base** | HTTP/JSON | JSON-RPC | JSON-RPC | HTTP/JSON |
| **Streaming** | Polling | Streaming | SSE | Streaming |
| **Tools** | Action-Key | Skills | Tools | Functions |
| **State** | Workbench | Agent Card | Context | Threads |
| **Human Loop** | Gray Room | Native | Native | Runs |
| **Async** | Promise ID | Task ID | Request ID | Run ID |

---

## Summary

A2A is designed for:

1. **Observability** - Every step on disk, inspectable, replayable
2. **Local-first** - Runs without cloud dependencies
3. **Explicit contracts** - Simulations as golden standard
4. **Operator control** - Manual LLM mode, interrupt hooks
5. **Deterministic debugging** - File-based state, deterministic replay

**Trade-offs:**
- More moving parts than hosted solutions
- Disk I/O vs in-memory performance
- Learning curve for unique concepts (Gray Room, Action-Key)

**Benefits:**
- Full visibility and control
- No vendor lock-in
- Audit-compliant (every action logged)
- Works offline
- Extensible through transforms
