"""Shared data models for agent-os."""
import uuid
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class Artifact(BaseModel):
    type: Literal["script", "feedback", "score", "formatted"]
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    goal: str
    skill: str = ""
    state: Literal["pending", "running", "revising", "done", "failed"] = "pending"
    steps: List[str] = Field(default_factory=list)
    artifacts: List[Artifact] = Field(default_factory=list)
    revision_count: int = 0
    max_revisions: int = 3
    blackboard: Dict[str, Any] = Field(default_factory=dict)

    def add_artifact(self, artifact: Artifact) -> None:
        self.artifacts.append(artifact)
        self.steps.append(f"artifact:{artifact.type}")

    def latest_artifact(self, type_: str) -> Optional[Artifact]:
        for art in reversed(self.artifacts):
            if art.type == type_:
                return art
        return None


class AgentState(BaseModel):
    """LangGraph node state — passed between graph nodes."""

    task: Task
    # Flat projections for convenience (kept in sync by nodes)
    draft: Optional[str] = None
    critic_notes: List[str] = Field(default_factory=list)
    judge_score: Optional[float] = None
    skills_loaded: List[str] = Field(default_factory=list)
    behaviour: str = ""
    similar_solutions: List[Dict[str, Any]] = Field(default_factory=list)
    error: Optional[str] = None

    class Config:
        arbitrary_types_allowed = True
