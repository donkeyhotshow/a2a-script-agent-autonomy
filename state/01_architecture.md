# Architecture
## Components
- **Meta-Controller**: Central orchestrator managing role lifecycle and convergence
- **Role Agents**: 10 specialized roles (Strategist, Architect, Analyst, Engineer, Optimizer, Critic, Documentor, Validator, Synthesizer, Quality Controller)
- **State Pipeline**: Sequential file-based state management (00-09)
- **Conflict Resolution**: Structured critique → propose → refine cycle

## Data Flow
```
User Input → Meta-Controller → Role Execution → State Files → Convergence Check → Final Output
```

## Integration Points
- Reuse existing A2A server action system
- Leverage session storage pattern from a2a-client
- Integrate with existing logging/metrics utilities