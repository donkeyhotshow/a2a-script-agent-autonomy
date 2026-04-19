#!/usr/bin/env python3
"""bootstrap.py — Agent OS CLI entry point.

Usage:
    python bootstrap.py run \\
        --task "драматический монолог о предательстве" \\
        --skill theatre-drama \\
        --max-revisions 3
"""
import argparse
import asyncio
import json
import os
import sys
import uuid
from pathlib import Path

# Ensure project root is on path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv  # type: ignore

load_dotenv()

from core.logger import get_logger
from core.error_handler import handle
from core.di import container
from infra.redis import RedisClient
from features.blackboard.board import Blackboard
from features.memory.manager import MemoryManager
from features.skills.loader import SkillLoader
from features.orchestrator.graph import GraphOrchestrator
from features.models import Task
from adapters.workers.script_writer.worker import ScriptWriterWorker
from adapters.workers.critic.worker import CriticWorker
from adapters.workers.judge.worker import JudgeWorker
from adapters.workers.formatter.worker import FormatterWorker

from extensions.agent_init import _10_skills as ext_skills

_log = get_logger("bootstrap")


def _load_config() -> dict:
    cfg_path = Path(__file__).parent / "config" / "core.json"
    with open(cfg_path, encoding="utf-8") as f:
        return json.load(f)


def _save_artifact(artifacts_dir: Path, task_id: str, content: str, suffix: str = "txt") -> Path:
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    out_path = artifacts_dir / f"{task_id}.{suffix}"
    out_path.write_text(content, encoding="utf-8")
    return out_path


async def _run(args: argparse.Namespace) -> int:
    cfg = _load_config()

    # Override config from CLI
    max_revisions = args.max_revisions or cfg["max_revisions"]
    skill_name = args.skill or ""
    openai_model = cfg["openai_model"]
    log_level = cfg.get("log_level", "INFO")

    _log.setLevel(log_level)
    _log.info("Agent OS starting up")

    # --- Build dependencies ---
    openai_api_key = os.environ.get("OPENAI_API_KEY", "")
    if not openai_api_key:
        _log.error("OPENAI_API_KEY is not set. Export it or add to .env")
        return 1

    from openai import AsyncOpenAI  # type: ignore

    openai_client = AsyncOpenAI(api_key=openai_api_key)

    redis = RedisClient(url=cfg["redis_url"])
    blackboard = Blackboard()
    memory = MemoryManager(
        redis=redis,
        solutions_path=cfg["solutions_path"],
        behaviour_path=cfg["behaviour_path"],
        sqlite_path=cfg["sqlite_path"],
    )
    skill_loader = SkillLoader(skills_dir=cfg["skills_dir"])

    # Register in DI container (optional — for future use)
    container.register("redis", lambda: redis)
    container.register("blackboard", lambda: blackboard)
    container.register("memory", lambda: memory)
    container.register("skill_loader", lambda: skill_loader)

    # --- Extensions: agent init ---
    await memory.setup()
    loaded_skills = await ext_skills.run(skill_loader)
    _log.info("Initialised. Skills: %s", loaded_skills)

    # --- Workers ---
    writer = ScriptWriterWorker(client=openai_client, model=openai_model)
    critic = CriticWorker(client=openai_client, model=openai_model)
    judge = JudgeWorker(client=openai_client, model=openai_model)
    formatter = FormatterWorker(client=openai_client, model=openai_model)

    # --- Orchestrator ---
    orchestrator = GraphOrchestrator(
        blackboard=blackboard,
        memory=memory,
        skill_loader=skill_loader,
        writer=writer,
        critic=critic,
        judge=judge,
        formatter=formatter,
        judge_threshold=cfg["judge_threshold"],
    )

    # --- Task ---
    task = Task(
        id=str(uuid.uuid4()),
        goal=args.task,
        skill=skill_name,
        max_revisions=max_revisions,
    )

    _log.info("Task ID: %s", task.id)
    _log.info("Goal: %s", task.goal)

    # --- Run pipeline ---
    try:
        final_state = await orchestrator.run(task)
    except Exception as exc:
        handle(exc, "bootstrap.run")
        await memory.teardown()
        return 1

    # --- Save artifacts ---
    artifacts_dir = Path(cfg["artifacts_dir"])
    formatted_art = task.latest_artifact("formatted")
    final_content = formatted_art.content if formatted_art else (final_state.draft or "")

    if final_content:
        out_path = _save_artifact(artifacts_dir, task.id, final_content)
        _log.info("Artifact saved: %s", out_path)
        print(f"\n{'='*60}")
        print(f"TASK:   {task.goal}")
        print(f"SCORE:  {final_state.judge_score}")
        print(f"STATE:  {task.state}")
        print(f"OUTPUT: {out_path}")
        print(f"{'='*60}\n")
        print(final_content)
    else:
        _log.warning("No output generated")

    # Save all intermediate artifacts
    for i, art in enumerate(task.artifacts):
        art_path = artifacts_dir / f"{task.id}_{i}_{art.type}.txt"
        try:
            art_path.write_text(art.content, encoding="utf-8")
        except OSError as exc:
            _log.warning("Failed to save intermediate artifact %s: %s", art_path, exc)

    await memory.teardown()
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="bootstrap.py",
        description="Agent OS — theatrical script generator",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    run_parser = subparsers.add_parser("run", help="Run the pipeline")
    run_parser.add_argument(
        "--task", required=True, help="Goal / task description (Russian recommended)"
    )
    run_parser.add_argument(
        "--skill", default="theatre-drama", help="Skill name (default: theatre-drama)"
    )
    run_parser.add_argument(
        "--max-revisions", type=int, default=None, help="Max revision cycles (default: from config)"
    )

    args = parser.parse_args()

    if args.command == "run":
        exit_code = asyncio.run(_run(args))
        sys.exit(exit_code)


if __name__ == "__main__":
    main()
