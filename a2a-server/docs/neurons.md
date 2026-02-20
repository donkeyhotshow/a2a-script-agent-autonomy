# Neurons — CLI, Types, request_files

**Index:** [docs/README.md](../../docs/README.md) | [neurons-catalog.md](neurons-catalog.md)

---

## CLI

| Command | Description |
|---------|--------------|
| `npm run neurons:list` | List all neurons, triggers, actions |
| `npm run neurons:validate` | Validate structure, inject targets, dependsOn |
| `npm run neurons:test <file>` | Test activation on a file |
| `npm run neurons:doc` | Generate `docs/neurons-catalog.md` |

### Examples

```bash
cd a2a-server
npm run neurons:list
npm run neurons:validate
npm run neurons:test app/Models/User.php
npm run neurons:doc
```

---

## Types

### Neuron

```typescript
interface Neuron {
  id: string;
  name: string;
  category: NeuronCategory;
  triggers: string[];
  knowledge: NeuronKnowledge;
  actions?: NeuronAction[];
  dependsOn?: string[];
  conflictsWith?: string[];
  triggersMode?: 'any' | 'all';
  triggersRegex?: boolean;
  priority?: number;  // 1-10, default 5
}
```

### NeuronAction

- `{ type: 'inject', target: string }` — inject context block
- `{ type: 'request_files', items: string[] }` — paths, masks, or terms

### Triggers

- **any** (default): at least one trigger must match
- **all**: all triggers must match
- **triggersRegex**: treat each trigger as regex pattern

---

## request_files

Neurons can request files via `request_files` action. Items are free-format: paths, glob masks, or semantic terms. Client resolves.

```typescript
actions: [
  { type: 'inject', target: 'neuron-context-eloquent' },
  { type: 'request_files', items: ['database/migrations/*', 'app/Models/*.php'] },
]
```

Flow: `activateNeurons` → `resolveRequestFiles` → `context.request_files` → client.

---

## dependsOn / conflictsWith

- **dependsOn**: activate only if listed neurons are already activated
- **conflictsWith**: do not activate if any listed neuron is activated
