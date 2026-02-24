import type { Neuron } from '../types/knowledge.types.js';

export const detectMassAssignmentRiskNeuron: Neuron = {
  id: 'neuron-detect-mass-assignment-risk',
  name: 'Detect Mass Assignment Risk',
  category: 'custom_pattern',
  triggers: ["$request->all()", "$request->input()", "Model::create(", "->update(", "->fill("],
  knowledge: {
    criticality: 'HIGH',
    description: 'Mass Assignment occurs when an application takes user input from a request and passes it directly to a database update/create method without filtering.',
    vulnerability_details: 'Attacker can overwrite non-fillable fields like "is_admin", "balance", or "user_id" by adding them to the payload.',
    expert_rules: [
      {
        language: 'Laravel',
        guard: 'Use $request->validated() or $request->only([...]) instead of $request->all().'
      },
      {
        language: 'TypeScript/Prisma',
        guard: 'Explicitly map fields from the request DTO to the Prisma data object.'
      }
    ],
    remediation: '1. Use explicit allowlists for inputs. 2. Implement Form Requests for validation. 3. Avoid $guarded = [] or making all fields $fillable.'
  },
  actions: [
    { type: 'inject', target: 'neuron-detect-mass-assignment-risk-context' },
    { type: 'request_files', items: ['app/Models/*.php', 'app/Http/Requests/*.php', 'src/types/*.ts'] },
  ],
  triggersRegex: true,
  triggersMode: 'any',
  priority: 8,
};
