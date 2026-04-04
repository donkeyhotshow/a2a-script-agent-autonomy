# Scaling Principles for Multi-Agent Teams

1. **Decomposition First**: Any task longer than 10 minutes must be decomposed into sub-tasks.
2. **Reviewer Independence**: Reviewers must not be the same instance as the Builder.
3. **Automated Verification**: No task is "Done" until `SubAgentVerification` passes.
4. **Dynamic Scaling**: Use `vibeScaleRegistry` to match task complexity with agent count.
5. **Context Isolation**: Each agent must have a focused context slice for its role.
