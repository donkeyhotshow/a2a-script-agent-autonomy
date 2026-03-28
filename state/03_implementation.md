# Implementation
## Core Module: meta-controller.ts
- Role registry and lifecycle management
- State file generation (00-09)
- Convergence detection algorithm

## Role Definitions
1. Strategist-Decomposer → 00_scope.md
2. Architect-Systemist → 01_architecture.md
3. Analyst-Requirements → 02_requirements.md
4. Engineer-Implementation → 03_implementation.md
5. Optimizer → 04_optimization.md
6. Critic-Auditor → 05_audit.md
7. Documentor → 06_documentation.md
8. Validator-Goals → 07_validation.md
9. Synthesizer → 08_final.md
10. Quality-Controller → 09_quality_gate.md

## Execution Pattern
- Each role reads previous state files
- Generates/updates its corresponding state file
- Triggers next role automatically