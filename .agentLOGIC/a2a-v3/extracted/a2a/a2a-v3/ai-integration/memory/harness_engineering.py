"""
Harness Engineering System
=========================

Inspired by: "Harness Engineering: The Concept I Didn't Know I Needed"
Source: dev.to/techwithhari/harness-engineering-the-concept-i-didnt-know-i-needed-5nf

Core Philosophy:
- Smart system design that lets an agent stay on track across sessions
- Verify its own work and actually finish what it started
- Cross-session continuity with self-verification mechanisms
- State persistence and checkpoint management

This module implements the "harness" - a structural framework that keeps
autonomous agents aligned with their goals and enables reliable completion
of multi-session tasks.
"""

import json
import uuid
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Optional
from dataclasses import dataclass, field, asdict
from pathlib import Path


class TaskStatus(Enum):
    """Status of a task in the harness system."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    VERIFYING = "verifying"
    BLOCKED = "blocked"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"


class VerificationStatus(Enum):
    """Status of task verification."""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    PASSED = "passed"
    FAILED = "failed"
    NEEDS_REVISION = "needs_revision"


@dataclass
class Checkpoint:
    """A checkpoint for task state preservation."""
    checkpoint_id: str
    task_id: str
    timestamp: str
    state_snapshot: dict
    progress_summary: str
    next_steps: list[str]
    blockers: list[str] = field(default_factory=list)
    verified: bool = False


@dataclass
class VerificationResult:
    """Result of task verification."""
    verification_id: str
    task_id: str
    timestamp: str
    checks_performed: list[str]
    passed_checks: list[str]
    failed_checks: list[str]
    confidence_score: float  # 0.0 - 1.0
    issues_found: list[str]
    recommendations: list[str]
    status: VerificationStatus


@dataclass
class HarnessTask:
    """A task managed by the harness system."""
    task_id: str
    original_goal: str
    description: str
    status: TaskStatus
    created_at: str
    updated_at: str
    deadline: Optional[str] = None
    checkpoints: list[Checkpoint] = field(default_factory=list)
    verification_history: list[VerificationResult] = field(default_factory=list)
    subtasks: list[dict] = field(default_factory=list)
    completed_subtasks: list[str] = field(default_factory=list)
    current_step: int = 0
    total_steps: int = 0
    metadata: dict = field(default_factory=dict)
    error_log: list[str] = field(default_factory=list)


class HarnessEngineering:
    """
    Harness Engineering System for AI Agents.

    Provides:
    - Cross-session task persistence
    - Self-verification checkpoints
    - Automatic progress tracking
    - State recovery mechanisms
    - Goal alignment verification
    """

    def __init__(self, storage_path: str = "./data/harness"):
        """
        Initialize the Harness Engineering System.

        Args:
            storage_path: Directory for storing harness state files
        """
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        self.tasks_file = self.storage_path / "harness_tasks.json"
        self.checkpoints_dir = self.storage_path / "checkpoints"
        self.verification_dir = self.storage_path / "verification"

        self.checkpoints_dir.mkdir(exist_ok=True)
        self.verification_dir.mkdir(exist_ok=True)

        self._tasks: dict[str, HarnessTask] = {}
        self._load_state()

    def _load_state(self) -> None:
        """Load persisted harness state from disk."""
        if self.tasks_file.exists():
            try:
                with open(self.tasks_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for task_data in data.get('tasks', []):
                        checkpoints = [
                            Checkpoint(**cp) for cp in task_data.get('checkpoints', [])
                        ]
                        verification_history = [
                            VerificationResult(**vr) for vr in task_data.get('verification_history', [])
                        ]
                        task_data['checkpoints'] = checkpoints
                        task_data['verification_history'] = verification_history
                        self._tasks[task_data['task_id']] = HarnessTask(**task_data)
            except (json.JSONDecodeError, TypeError) as e:
                print(f"Warning: Failed to load harness state: {e}")
                self._tasks = {}

    def _save_state(self) -> None:
        """Persist harness state to disk."""
        tasks_data = []
        for task in self._tasks.values():
            task_dict = asdict(task)
            task_dict['status'] = task.status.value
            for vr in task_dict.get('verification_history', []):
                if hasattr(vr, 'status'):
                    vr['status'] = vr.status.value if isinstance(vr.status, Enum) else vr['status']
            tasks_data.append(task_dict)

        with open(self.tasks_file, 'w', encoding='utf-8') as f:
            json.dump({'tasks': tasks_data, 'last_updated': datetime.now().isoformat()}, f, indent=2)

    def create_task(
        self,
        goal: str,
        description: str = "",
        deadline: Optional[str] = None,
        subtasks: Optional[list[dict]] = None
    ) -> HarnessTask:
        """
        Create a new harness-managed task.

        Args:
            goal: The primary goal/objective
            description: Detailed task description
            deadline: Optional deadline in ISO format
            subtasks: Optional list of subtask definitions

        Returns:
            The created HarnessTask
        """
        task_id = f"harness_{uuid.uuid4().hex[:12]}"
        now = datetime.now().isoformat()

        task = HarnessTask(
            task_id=task_id,
            original_goal=goal,
            description=description,
            status=TaskStatus.PENDING,
            created_at=now,
            updated_at=now,
            deadline=deadline,
            subtasks=subtasks or [],
            total_steps=len(subtasks) if subtasks else 0
        )

        self._tasks[task_id] = task
        self._save_state()

        return task

    def start_task(self, task_id: str) -> HarnessTask:
        """
        Mark a task as in progress.

        Args:
            task_id: The task to start

        Returns:
            The updated task
        """
        if task_id not in self._tasks:
            raise ValueError(f"Task {task_id} not found")

        task = self._tasks[task_id]
        task.status = TaskStatus.IN_PROGRESS
        task.updated_at = datetime.now().isoformat()

        # Create initial checkpoint
        self.create_checkpoint(
            task_id=task_id,
            state_snapshot=self._capture_state(task),
            progress_summary=f"Task started: {task.original_goal}",
            next_steps=self._get_next_steps(task),
            blockers=[]
        )

        self._save_state()
        return task

    def create_checkpoint(
        self,
        task_id: str,
        state_snapshot: dict,
        progress_summary: str,
        next_steps: list[str],
        blockers: Optional[list[str]] = None
    ) -> Checkpoint:
        """
        Create a checkpoint for task state preservation.

        Args:
            task_id: The task to checkpoint
            state_snapshot: Current state data
            progress_summary: Human-readable progress summary
            next_steps: Planned next steps
            blockers: Any current blockers

        Returns:
            The created checkpoint
        """
        if task_id not in self._tasks:
            raise ValueError(f"Task {task_id} not found")

        checkpoint = Checkpoint(
            checkpoint_id=f"cp_{uuid.uuid4().hex[:12]}",
            task_id=task_id,
            timestamp=datetime.now().isoformat(),
            state_snapshot=state_snapshot,
            progress_summary=progress_summary,
            next_steps=next_steps,
            blockers=blockers or []
        )

        self._tasks[task_id].checkpoints.append(checkpoint)

        # Persist checkpoint to disk
        checkpoint_file = self.checkpoints_dir / f"{checkpoint.checkpoint_id}.json"
        with open(checkpoint_file, 'w', encoding='utf-8') as f:
            json.dump(asdict(checkpoint), f, indent=2)

        return checkpoint

    def verify_task(self, task_id: str) -> VerificationResult:
        """
        Perform self-verification on a task.

        Args:
            task_id: The task to verify

        Returns:
            VerificationResult with detailed check results
        """
        if task_id not in self._tasks:
            raise ValueError(f"Task {task_id} not found")

        task = self._tasks[task_id]
        task.status = TaskStatus.VERIFYING
        task.updated_at = datetime.now().isoformat()

        # Perform verification checks
        checks = self._run_verification_checks(task)

        result = VerificationResult(
            verification_id=f"verify_{uuid.uuid4().hex[:12]}",
            task_id=task_id,
            timestamp=datetime.now().isoformat(),
            checks_performed=checks['performed'],
            passed_checks=checks['passed'],
            failed_checks=checks['failed'],
            confidence_score=checks['confidence'],
            issues_found=checks['issues'],
            recommendations=checks['recommendations'],
            status=VerificationStatus.PASSED if not checks['failed'] else VerificationStatus.FAILED
        )

        task.verification_history.append(result)

        # Update task status based on verification
        if result.status == VerificationStatus.PASSED:
            task.status = TaskStatus.COMPLETED
        elif result.status == VerificationStatus.NEEDS_REVISION:
            task.status = TaskStatus.BLOCKED
        else:
            task.status = TaskStatus.IN_PROGRESS

        self._save_state()
        return result

    def _run_verification_checks(self, task: HarnessTask) -> dict:
        """
        Run verification checks on a task.

        Returns:
            Dictionary with check results
        """
        performed = []
        passed = []
        failed = []
        issues = []
        recommendations = []

        # Check 1: Goal alignment
        performed.append("goal_alignment")
        if task.completed_subtasks or task.current_step > 0:
            passed.append("goal_alignment")
        else:
            failed.append("goal_alignment")
            issues.append("No progress made on task")
            recommendations.append("Begin working on subtasks or update progress")

        # Check 2: Checkpoint consistency
        performed.append("checkpoint_consistency")
        if len(task.checkpoints) > 0:
            latest_cp = task.checkpoints[-1]
            if not latest_cp.blockers:
                passed.append("checkpoint_consistency")
            else:
                failed.append("checkpoint_consistency")
                issues.append(f"Active blockers: {latest_cp.blockers}")
                recommendations.append("Resolve blockers before continuing")
        else:
            failed.append("checkpoint_consistency")
            issues.append("No checkpoints created - state not preserved")
            recommendations.append("Create checkpoints at key milestones")

        # Check 3: Error rate
        performed.append("error_rate")
        if len(task.error_log) == 0:
            passed.append("error_rate")
        elif len(task.error_log) < 3:
            issues.append(f"{len(task.error_log)} errors encountered")
            recommendations.append("Review error log and address recurring issues")
        else:
            failed.append("error_rate")
            issues.append(f"High error count: {len(task.error_log)} errors")
            recommendations.append("Investigate root causes of errors")

        # Check 4: Progress pace
        performed.append("progress_pace")
        if task.deadline:
            deadline = datetime.fromisoformat(task.deadline)
            elapsed = datetime.now() - datetime.fromisoformat(task.created_at)
            expected_progress = elapsed.total_seconds() / (deadline - datetime.fromisoformat(task.created_at)).total_seconds()
            actual_progress = len(task.completed_subtasks) / max(task.total_steps, 1)

            if actual_progress >= expected_progress * 0.8:
                passed.append("progress_pace")
            else:
                issues.append("Progress is behind schedule")
                recommendations.append("Increase work pace or adjust deadline")

        # Calculate confidence score
        confidence = len(passed) / len(performed) if performed else 0.0

        return {
            'performed': performed,
            'passed': passed,
            'failed': failed,
            'confidence': confidence,
            'issues': issues,
            'recommendations': recommendations
        }

    def recover_task_state(self, task_id: str) -> Optional[dict]:
        """
        Recover the state of a task from its checkpoints.

        Args:
            task_id: The task to recover

        Returns:
            The recovered state or None if no checkpoints exist
        """
        if task_id not in self._tasks:
            raise ValueError(f"Task {task_id} not found")

        task = self._tasks[task_id]

        if not task.checkpoints:
            return None

        # Get the most recent checkpoint
        latest_checkpoint = task.checkpoints[-1]

        return {
            'task': asdict(task),
            'checkpoint': asdict(latest_checkpoint),
            'recovery_timestamp': datetime.now().isoformat()
        }

    def update_progress(
        self,
        task_id: str,
        completed_subtask: Optional[str] = None,
        error: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> HarnessTask:
        """
        Update task progress.

        Args:
            task_id: The task to update
            completed_subtask: ID of completed subtask
            error: Optional error message
            metadata: Optional metadata updates

        Returns:
            The updated task
        """
        if task_id not in self._tasks:
            raise ValueError(f"Task {task_id} not found")

        task = self._tasks[task_id]
        task.updated_at = datetime.now().isoformat()

        if completed_subtask:
            task.completed_subtasks.append(completed_subtask)
            task.current_step = len(task.completed_subtasks)

            # Create progress checkpoint
            self.create_checkpoint(
                task_id=task_id,
                state_snapshot=self._capture_state(task),
                progress_summary=f"Completed: {completed_subtask}. Progress: {task.current_step}/{task.total_steps}",
                next_steps=self._get_next_steps(task),
                blockers=task.checkpoints[-1].blockers if task.checkpoints else []
            )

        if error:
            task.error_log.append(f"{datetime.now().isoformat()}: {error}")

        if metadata:
            task.metadata.update(metadata)

        self._save_state()
        return task

    def get_task_status(self, task_id: str) -> Optional[dict]:
        """
        Get comprehensive task status.

        Args:
            task_id: The task to check

        Returns:
            Status dictionary or None if not found
        """
        if task_id not in self._tasks:
            return None

        task = self._tasks[task_id]

        return {
            'task_id': task.task_id,
            'goal': task.original_goal,
            'status': task.status.value,
            'progress': f"{task.current_step}/{task.total_steps}",
            'progress_percent': (task.current_step / max(task.total_steps, 1)) * 100,
            'checkpoints': len(task.checkpoints),
            'verifications': len(task.verification_history),
            'errors': len(task.error_log),
            'created': task.created_at,
            'updated': task.updated_at,
            'deadline': task.deadline,
            'last_checkpoint': asdict(task.checkpoints[-1]) if task.checkpoints else None,
            'latest_verification': asdict(task.verification_history[-1]) if task.verification_history else None
        }

    def list_tasks(self, status: Optional[TaskStatus] = None) -> list[dict]:
        """
        List all tasks, optionally filtered by status.

        Args:
            status: Optional status filter

        Returns:
            List of task status dictionaries
        """
        tasks = list(self._tasks.values())

        if status:
            tasks = [t for t in tasks if t.status == status]

        return [self.get_task_status(t.task_id) for t in tasks]

    def _capture_state(self, task: HarnessTask) -> dict:
        """Capture current task state for checkpointing."""
        return {
            'status': task.status.value,
            'current_step': task.current_step,
            'completed_subtasks': list(task.completed_subtasks),
            'metadata': dict(task.metadata),
            'timestamp': datetime.now().isoformat()
        }

    def _get_next_steps(self, task: HarnessTask) -> list[str]:
        """Determine next steps for a task."""
        next_steps = []

        for i, subtask in enumerate(task.subtasks):
            if subtask.get('id') not in task.completed_subtasks:
                next_steps.append(subtask.get('description', f"Step {i + 1}"))
                if len(next_steps) >= 3:
                    break

        return next_steps

    def analyze_cross_session_patterns(self) -> dict:
        """
        Analyze patterns across all tasks for self-improvement.

        Returns:
            Analysis results with insights and recommendations
        """
        total_tasks = len(self._tasks)
        completed_tasks = len([t for t in self._tasks.values() if t.status == TaskStatus.COMPLETED])
        failed_tasks = len([t for t in self._tasks.values() if t.status == TaskStatus.FAILED])
        blocked_tasks = len([t for t in self._tasks.values() if t.status == TaskStatus.BLOCKED])

        # Analyze error patterns
        all_errors = []
        for task in self._tasks.values():
            all_errors.extend(task.error_log)

        # Analyze verification patterns
        avg_confidence = 0.0
        verification_count = 0
        for task in self._tasks.values():
            for vr in task.verification_history:
                avg_confidence += vr.confidence_score
                verification_count += 1

        avg_confidence = avg_confidence / verification_count if verification_count > 0 else 0.0

        # Calculate success rate
        success_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0.0

        return {
            'summary': {
                'total_tasks': total_tasks,
                'completed': completed_tasks,
                'failed': failed_tasks,
                'blocked': blocked_tasks,
                'success_rate': round(success_rate, 2)
            },
            'error_analysis': {
                'total_errors': len(all_errors),
                'common_patterns': self._find_error_patterns(all_errors)
            },
            'verification_insights': {
                'total_verifications': verification_count,
                'average_confidence': round(avg_confidence * 100, 2),
                'confidence_trend': 'stable'  # Could be enhanced with time-series analysis
            },
            'recommendations': self._generate_improvement_recommendations(
                success_rate, avg_confidence, all_errors
            )
        }

    def _find_error_patterns(self, errors: list[str]) -> list[str]:
        """Identify common error patterns."""
        patterns = []

        # Simple pattern detection (could be enhanced with ML)
        error_keywords = {
            'timeout': 'Timeout errors - consider increasing timeouts or optimizing operations',
            'connection': 'Connection errors - check network reliability and retry logic',
            'authentication': 'Authentication errors - verify credentials and session management',
            'validation': 'Validation errors - improve input validation and error handling',
            'memory': 'Memory errors - optimize resource usage or increase memory limits'
        }

        for keyword, description in error_keywords.items():
            matching = [e for e in errors if keyword.lower() in e.lower()]
            if len(matching) >= 2:
                patterns.append(f"{description} ({len(matching)} occurrences)")

        return patterns

    def _generate_improvement_recommendations(
        self,
        success_rate: float,
        avg_confidence: float,
        errors: list[str]
    ) -> list[str]:
        """Generate recommendations for system improvement."""
        recommendations = []

        if success_rate < 70:
            recommendations.append(
                "Success rate below 70% - consider breaking complex tasks into smaller subtasks"
            )

        if avg_confidence < 0.7:
            recommendations.append(
                "Verification confidence low - implement more frequent checkpoints"
            )

        if len(errors) > 10:
            recommendations.append(
                "High error count detected - review error handling and add retry logic"
            )

        if not recommendations:
            recommendations.append("System performing well - continue current approach")

        return recommendations


# Export for integration with other modules
__all__ = [
    'HarnessEngineering',
    'HarnessTask',
    'Checkpoint',
    'VerificationResult',
    'TaskStatus',
    'VerificationStatus'
]
