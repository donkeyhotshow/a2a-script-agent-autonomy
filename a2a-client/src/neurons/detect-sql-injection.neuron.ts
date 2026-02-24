import type { Neuron } from '../types/knowledge.types.js';

export const detectSqlInjectionNeuron: Neuron = {
  id: 'neuron-detect-sql-injection',
  name: 'Detect Sql Injection',
  category: 'custom_pattern',
  triggers: [
    "whereRaw", 
    "DB::raw", 
    "selectRaw", 
    "orderByRaw", 
    "havingRaw", 
    "\\$query\\s*\\.\\s*raw",
    "mysql_query",
    "pg_query"
  ],
  knowledge: {
    criticality: 'HIGH',
    description: 'Direct concatenation of user input into SQL queries allows attackers to bypass authentication and dump databases.',
    vulnerability_mechanics: 'User input is interpreted as part of the SQL command rather than data.',
    safe_alternatives: [
      {
        language: 'PHP/Laravel',
        unsafe: '->whereRaw("email = " . $request->email)',
        safe: '->where("email", $request->email) or ->whereRaw("email = ?", [$request->email])'
      },
      {
        language: 'TypeScript/Prisma',
        unsafe: 'prisma.$queryRawUnsafe(`SELECT * FROM User WHERE email = ${email}`)',
        safe: 'prisma.$queryRaw`SELECT * FROM User WHERE email = ${email}` (using tagged templates)'
      }
    ],
    remediation: [
      'ALWAYS use prepared statements or parameter binding.',
      'Use ORM/Query Builder features instead of raw SQL where possible.',
      'Sanitize and validate identifiers (table/column names) against a whitelist if they must be dynamic.'
    ]
  },
  actions: [
    { type: 'inject', target: 'neuron-detect-sql-injection-context' },
    { type: 'request_files', items: ['app/**/*.php', 'src/**/*.ts', 'src/repositories/*.ts'] },
  ],
  triggersRegex: true,
  triggersMode: 'any',
  priority: 9,
};
