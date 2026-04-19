"""LangGraph DAG orchestrator.

Graph:
  START → skill_retrieval → planner → writer → critic → judge
        ↑                                                  |
        |  (score < threshold AND revision < max)          |
        +--------------------------------------------------+
        |  (score >= threshold OR revision >= max)
        ↓
     formatter → memory_save → END
"""
import asyncio
import json
from typing import Any, Dict

from langgraph.graph import StateGraph, END  # type: ignore

from core.logger import get_logger
from core.error_handler import WorkerError, handle
from features.models import AgentState, Artifact, Task
from features.blackboard.board import Blackboard
from features.memory.manager import MemoryManager
from features.skills.loader import SkillLoader
from adapters.workers.script_writer.worker import ScriptWriterWorker
from adapters.workers.critic.worker import CriticWorker
from adapters.workers.judge.worker import JudgeWorker
from adapters.workers.formatter.worker import FormatterWorker
from infra.sandbox import run_with_timeout

_log = get_logger("orchestrator.graph")


class GraphOrchestrator:
    """Builds and runs the LangGraph pipeline."""

    def __init__(
        self,
        blackboard: Blackboard,
        memory: MemoryManager,
        skill_loader: SkillLoader,
        writer: ScriptWriterWorker,
        critic: CriticWorker,
        judge: JudgeWorker,
        formatter: FormatterWorker,
        judge_threshold: float = 7.0,
    ) -> None:
        self._bb = blackboard
        self._memory = memory
        self._skill_loader = skill_loader
        self._writer = writer
        self._critic = critic
        self._judge = judge
        self._formatter = formatter
        self._threshold = judge_threshold
        self._graph = self._build_graph()

    # ------------------------------------------------------------------
    # Graph construction
    # ------------------------------------------------------------------

    def _build_graph(self) -> Any:
        g: StateGraph = StateGraph(AgentState)

        g.add_node("skill_retrieval", self._node_skill_retrieval)
        g.add_node("planner", self._node_planner)
        g.add_node("writer", self._node_writer)
        g.add_node("critic", self._node_critic)
        g.add_node("judge", self._node_judge)
        g.add_node("formatter", self._node_formatter)
        g.add_node("memory_save", self._node_memory_save)

        g.set_entry_point("skill_retrieval")
        g.add_edge("skill_retrieval", "planner")
        g.add_edge("planner", "writer")
        g.add_edge("writer", "critic")
        g.add_edge("critic", "judge")
        g.add_conditional_edges(
            "judge",
            self._route_after_judge,
            {"revise": "writer", "finish": "formatter"},
        )
        g.add_edge("formatter", "memory_save")
        g.add_edge("memory_save", END)

        return g.compile()

    def _route_after_judge(self, state: AgentState) -> str:
        score = state.judge_score or 0.0
        revision = state.task.revision_count
        max_rev = state.task.max_revisions
        if score < self._threshold and revision < max_rev:
            _log.info("Route → revise (score=%.1f < %.1f, rev=%d/%d)", score, self._threshold, revision, max_rev)
            return "revise"
        _log.info("Route → finish (score=%.1f, rev=%d/%d)", score, self._threshold, revision, max_rev)
        return "finish"

    # ------------------------------------------------------------------
    # Nodes
    # ------------------------------------------------------------------

    async def _node_skill_retrieval(self, state: AgentState) -> Dict:
        _log.info("Node: skill_retrieval")
        skill_name = state.task.skill
        skill = None
        if skill_name:
            skill = self._skill_loader.load_by_name(skill_name)
        if skill is None and state.task.goal:
            matches = self._skill_loader.search_by_trigger(state.task.goal)
            skill = matches[0] if matches else None

        skills_loaded: list = []
        skill_body = ""
        if skill:
            skills_loaded = [skill.name]
            skill_body = skill.body
            await self._bb.set("skills_loaded", skills_loaded)
            _log.info("Skill loaded: %s", skill.name)
        else:
            _log.warning("No skill matched for goal: %s", state.task.goal)

        state.task.blackboard["skill_body"] = skill_body
        return {"skills_loaded": skills_loaded}

    async def _node_planner(self, state: AgentState) -> Dict:
        _log.info("Node: planner")
        # Load behaviour
        behaviour = await self._memory.load_behaviour()
        await self._bb.set("behaviour", behaviour)

        # Find similar solutions
        similar = await self._memory.find_similar_solutions(state.task.goal)
        _log.info("Planner: found %d similar solutions", len(similar))

        return {"behaviour": behaviour, "similar_solutions": similar}

    async def _node_writer(self, state: AgentState) -> Dict:
        _log.info("Node: writer (revision=%d)", state.task.revision_count)
        artifact = await run_with_timeout(
            self._writer.execute(state), timeout=90.0, context="writer"
        )
        state.task.add_artifact(artifact)
        await self._bb.set("draft", artifact.content)
        return {"draft": artifact.content}

    async def _node_critic(self, state: AgentState) -> Dict:
        _log.info("Node: critic")
        artifact = await run_with_timeout(
            self._critic.execute(state), timeout=60.0, context="critic"
        )
        state.task.add_artifact(artifact)
        # Parse notes from bullet-list format
        notes = [
            line.lstrip("- ").strip()
            for line in artifact.content.splitlines()
            if line.strip().startswith("-")
        ]
        await self._bb.set("critic_notes", notes)
        return {"critic_notes": notes}

    async def _node_judge(self, state: AgentState) -> Dict:
        _log.info("Node: judge")
        artifact = await run_with_timeout(
            self._judge.execute(state), timeout=60.0, context="judge"
        )
        state.task.add_artifact(artifact)
        data = json.loads(artifact.content)
        score = float(data.get("score", 0.0))
        await self._bb.set("judge_score", score)
        # Increment revision counter for next potential cycle
        state.task.revision_count += 1
        return {"judge_score": score}

    async def _node_formatter(self, state: AgentState) -> Dict:
        _log.info("Node: formatter")
        artifact = await run_with_timeout(
            self._formatter.execute(state), timeout=60.0, context="formatter"
        )
        state.task.add_artifact(artifact)
        state.task.state = "done"
        return {"draft": artifact.content}

    async def _node_memory_save(self, state: AgentState) -> Dict:
        _log.info("Node: memory_save")
        final_art = state.task.latest_artifact("formatted") or state.task.latest_artifact("script")
        draft_text = final_art.content if final_art else (state.draft or "")
        score = state.judge_score

        await asyncio.gather(
            self._memory.save_solution(
                task_id=state.task.id,
                goal=state.task.goal,
                score=score or 0.0,
                draft=draft_text,
            ),
            self._memory.save_episode(
                task_id=state.task.id,
                goal=state.task.goal,
                score=score,
                draft=draft_text,
            ),
        )
        _log.info("Memory saved for task %s", state.task.id)
        return {}

    # ------------------------------------------------------------------
    # Public run
    # ------------------------------------------------------------------

    async def run(self, task: Task) -> AgentState:
        """Execute the full pipeline for *task*. Returns final AgentState."""
        initial = AgentState(task=task)
        _log.info("Starting pipeline for task %s: %s", task.id, task.goal)
        task.state = "running"
        try:
            result = await self._graph.ainvoke(initial)
            # LangGraph returns a dict; reconstruct AgentState with only known fields
            if isinstance(result, dict):
                known_fields = AgentState.model_fields.keys()
                filtered = {k: v for k, v in result.items() if k in known_fields and k != "task"}
                result = AgentState(task=task, **filtered)
        except Exception as exc:
            handle(exc, "orchestrator.run")
            task.state = "failed"
            raise
        _log.info("Pipeline complete. state=%s score=%s", task.state, result.judge_score)
        return result
