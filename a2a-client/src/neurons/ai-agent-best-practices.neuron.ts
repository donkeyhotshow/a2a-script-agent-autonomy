import type { Neuron } from '../types/knowledge.types.js';

export const aiAgentBestPracticesNeuron: Neuron = {
  id: 'neuron-ai-agent-best-practices',
  name: 'AI Agent Best Practices',
  category: 'naming_convention',
  triggers: ["agent", "instruction", "prompt", "constraint", "workflow", "verification", "search-before-edit"],
  knowledge: {
    source: 'GitHub: system-prompts-and-models-of-ai-tools',
    core_philosophies: [
      {
        philosophy: 'Search-Before-Edit',
        detail: 'Never attempt an edit without first exploring the file and its dependencies using grep_search or view_file.'
      },
      {
        philosophy: 'Proactive Verification',
        detail: 'Automatically run tests, build scripts, or linters immediately after an edit to confirm success.'
      },
      {
        philosophy: 'Incremental Progress',
        detail: 'Break large tasks into small, verifiable steps. Edits should ideally be under 100-200 lines.'
      }
    ],
    agent_behavior_rules: [
      'No Direct Code Output: Prefer using tools (replace_file_content) over talking about code blocks.',
      'No Line Numbers: Avoid outputting line numbers in messages as they are unstable during concurrent edits.',
      'Token Management: Keep total turn tokens below 8k to maintain context coherence.',
      'Conciseness: Be extremely concise for trivial tasks, but agentic and detailed for complex architectural changes.'
    ],
    edit_mechanics: {
      preferred_format: 'Precise TargetContent matching for replacement.',
      guards: 'Avoid replacing entire files; target only the specific lines relevant to the task.'
    },
    expert_patterns: [
      'Discovery-first: Use ls -R and grep to map the system architecture before deep diving.',
      'Tool-centricity: If a tool exists for a task, use it instead of manual logic.'
    ]
  },
  actions: [
    { type: 'inject', target: 'neuron-ai-agent-best-practices-context' },
    { type: 'request_files', items: ['src/services/request-processor.service.ts', 'src/services/neuron-activator.service.ts'] },
  ],
  triggersRegex: false,
  triggersMode: 'any',
  priority: 10,
};
