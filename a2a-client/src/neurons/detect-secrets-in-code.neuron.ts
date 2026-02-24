import type { Neuron } from '../types/knowledge.types.js';

export const detectSecretsInCodeNeuron: Neuron = {
  id: 'neuron-detect-secrets-in-code',
  name: 'Detect Secrets In Code',
  category: 'custom_pattern',
  triggers: [
    "password\\s*[:=]", 
    "secret\\s*[:=]", 
    "api_key\\s*[:=]", 
    "token\\s*[:=]",
    "sk_live_[0-9a-zA-Z]{24}", // Stripe
    "AIza[0-9A-Za-z-_]{35}", // Google API
    "sq0csp-[0-9A-Za-z-_]{43}", // Square
    "access_key_reset",
    "db_password"
  ],
  knowledge: {
    criticality: 'CRITICAL',
    description: 'Exposure of credentials in source code leads to full system compromise.',
    compliance: ['PCI-DSS', 'SOC2', 'GDPR'],
    expert_rules: [
      {
        type: 'Entropy Analysis',
        detail: 'High-entropy strings (random-looking) in assignment context are likely keys.'
      },
      {
        type: 'Contextual Check',
        detail: 'Check if the file is a configuration file (.env, config.php) vs. executable code.'
      }
    ],
    remediation_steps: [
      {
        step: 1,
        title: 'Immediate Neutralization',
        action: 'Revoke the compromised secret in the provider dashboard (AWS, Stripe, etc.).'
      },
      {
        step: 2,
        title: 'Secret Migration',
        action: 'Move the secret to an environment variable or a managed secret store.'
      },
      {
        step: 3,
        title: 'History Cleaning',
        action: 'Use tools like BFG Repo-Cleaner or git-filter-repo to remove the secret from git history.'
      },
      {
        step: 4,
        title: 'Access Audit',
        action: 'Review logs to see if the secret was used by unauthorized actors since exposure.'
      }
    ],
    best_practices: [
      'Use .env for local development.',
      'Use AWS Secrets Manager, GitHub Secrets, or HashiCorp Vault for production.',
      'Implement pre-commit hooks (e.g., husky + secret-lint) to prevent future leaks.'
    ]
  },
  actions: [
    { type: 'inject', target: 'neuron-detect-secrets-in-code-context' },
    { type: 'request_files', items: ['.env', 'config/*.php', 'src/config/*.ts', '**/settings.py'] },
  ],
  triggersRegex: true,
  triggersMode: 'any',
  priority: 10,
};
