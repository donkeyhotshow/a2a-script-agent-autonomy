import type { Neuron } from '../types/knowledge.types.js';

export const detectXssVulnerabilitiesNeuron: Neuron = {
  id: 'neuron-detect-xss-vulnerabilities',
  name: 'Detect Xss Vulnerabilities',
  category: 'custom_pattern',
  triggers: [
    "v-html", 
    "innerHTML", 
    "dangerouslySetInnerHTML", 
    "eval\\(", 
    "setTimeout\\(['\"]",
    "echo\\s+\\$",
    "{!!\\s+\\$"
  ],
  knowledge: {
    criticality: 'HIGH',
    description: 'Persistent or Reflected Cross-Site Scripting allows attackers to steal session cookies and execute arbitrary JS in user browsers.',
    vectors: [
      { element: 'v-html (Vue)', risk: 'Renders raw HTML, including <script> tags.' },
      { element: '{!! !!} (Blade)', risk: 'Bypasses Laravel auto-escaping.' },
      { element: 'innerHTML (Vanilla JS)', risk: 'Standard XSS sink.' }
    ],
    prevention_strategy: {
      rule_1: 'Filter input on arrival (Validation).',
      rule_2: 'Escape data on output (Template engines do this by default).',
      rule_3: 'Use Sanitize-HTML libraries for rich-text content.'
    },
    expert_remediation: [
      'Replace v-html with v-text or {{ }} interpolation.',
      'Use a library like DOMPurify before rendering any untrusted HTML.',
      'Implement Content Security Policy (CSP) headers to block unauthorized script execution.'
    ]
  },
  actions: [
    { type: 'inject', target: 'neuron-detect-xss-vulnerabilities-context' },
    { type: 'request_files', items: ['resources/js/**/*.vue', 'resources/views/**/*.blade.php', 'src/components/**/*.tsx'] },
  ],
  triggersRegex: true,
  triggersMode: 'any',
  priority: 9,
};
