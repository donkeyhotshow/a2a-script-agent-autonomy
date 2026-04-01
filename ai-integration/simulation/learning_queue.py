"""
Learning Queue System
Manages prompts that are candidates for learning and simulation
Requires approval before being added to training data
"""
import os
import json
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime

from .config import SimulationConfig, get_config
from .storage import ConversationRecord, ConversationStore
from .prompt_manager import AbstractPrompt, ComplexityMetrics

# Setup logger
logger = logging.getLogger(__name__)


@dataclass
class LearningCandidate:
    """A prompt candidate waiting for approval to be learned"""
    id: str
    created_at: float
    abstract_prompt_id: Optional[str]
    concrete_prompt: str
    original_response: str
    complexity_metrics: Dict[str, float]
    reason: str  # Why it's a candidate
    status: str  # "pending", "approved", "rejected", "learned"
    reviewed_at: Optional[float] = None
    reviewed_by: Optional[str] = None  # Could be human or system
    notes: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "created_at": self.created_at,
            "abstract_prompt_id": self.abstract_prompt_id,
            "concrete_prompt": self.concrete_prompt,
            "original_response": self.original_response,
            "complexity_metrics": self.complexity_metrics,
            "reason": self.reason,
            "status": self.status,
            "reviewed_at": self.reviewed_at,
            "reviewed_by": self.reviewed_by,
            "notes": self.notes
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "LearningCandidate":
        return cls(
            id=data.get("id", ""),
            created_at=data.get("created_at", 0.0),
            abstract_prompt_id=data.get("abstract_prompt_id"),
            concrete_prompt=data.get("concrete_prompt", ""),
            original_response=data.get("original_response", ""),
            complexity_metrics=data.get("complexity_metrics", {}),
            reason=data.get("reason", ""),
            status=data.get("status", "pending"),
            reviewed_at=data.get("reviewed_at"),
            reviewed_by=data.get("reviewed_by"),
            notes=data.get("notes")
        )


class LearningQueue:
    """
    Queue for managing learning candidates
    Separates detection from approval
    """
    
    def __init__(self, config: Optional[SimulationConfig] = None):
        self.config = config or get_config()
        self.queue_path = os.path.join(self.config.base_data_path, "learning_queue")
        os.makedirs(self.queue_path, exist_ok=True)
        
        # Approved candidates ready for training
        self.approved_path = os.path.join(self.queue_path, "approved")
        os.makedirs(self.approved_path, exist_ok=True)
        
        # Rejected candidates
        self.rejected_path = os.path.join(self.queue_path, "rejected")
        os.makedirs(self.rejected_path, exist_ok=True)
    
    def add_candidate(self, 
                      concrete_prompt: str,
                      original_response: str,
                      complexity_metrics: ComplexityMetrics,
                      reason: str,
                      abstract_prompt_id: Optional[str] = None) -> LearningCandidate:
        """
        Add a new candidate to the queue
        Called when complexity analyzer detects a difficult prompt
        """
        import uuid
        
        candidate = LearningCandidate(
            id=str(uuid.uuid4()),
            created_at=datetime.now().timestamp(),
            abstract_prompt_id=abstract_prompt_id,
            concrete_prompt=concrete_prompt,
            original_response=original_response,
            complexity_metrics={
                "overall_score": complexity_metrics.overall_score,
                "length_score": complexity_metrics.length_score,
                "structure_score": complexity_metrics.structure_score,
                "domain_score": complexity_metrics.domain_score,
                "ambiguity_score": complexity_metrics.ambiguity_score
            },
            reason=reason,
            status="pending"
        )
        
        # Save to queue
        self._save_candidate(candidate)
        
        print(f"[LearningQueue] Added candidate {candidate.id[:8]}...")
        print(f"  Complexity: {complexity_metrics.overall_score:.2f}")
        print(f"  Reason: {reason}")
        
        return candidate
    
    def _save_candidate(self, candidate: LearningCandidate) -> None:
        """Save candidate to appropriate directory based on status"""
        if candidate.status == "approved":
            filepath = os.path.join(self.approved_path, f"{candidate.id}.json")
        elif candidate.status == "rejected":
            filepath = os.path.join(self.rejected_path, f"{candidate.id}.json")
        else:
            filepath = os.path.join(self.queue_path, f"{candidate.id}.json")
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(candidate.to_dict(), f, indent=2, ensure_ascii=False)
    
    def approve(self, candidate_id: str, 
                reviewed_by: str = "system",
                notes: Optional[str] = None) -> bool:
        """
        Approve a candidate for learning
        Moves it to approved folder and marks for training
        """
        candidate = self._load_candidate(candidate_id)
        if not candidate:
            return False
        
        # Update status
        candidate.status = "approved"
        candidate.reviewed_at = datetime.now().timestamp()
        candidate.reviewed_by = reviewed_by
        if notes:
            candidate.notes = notes
        
        # Move to approved folder
        old_path = os.path.join(self.queue_path, f"{candidate_id}.json")
        if os.path.exists(old_path):
            os.remove(old_path)
        
        self._save_candidate(candidate)
        
        print(f"[LearningQueue] Approved candidate {candidate_id[:8]}")
        
        # Auto-add to training data if configured
        if getattr(self.config, 'auto_add_approved', False):
            self._add_to_training_data(candidate)
        
        return True
    
    def reject(self, candidate_id: str,
               reviewed_by: str = "system",
               notes: Optional[str] = None) -> bool:
        """Reject a candidate"""
        candidate = self._load_candidate(candidate_id)
        if not candidate:
            return False
        
        candidate.status = "rejected"
        candidate.reviewed_at = datetime.now().timestamp()
        candidate.reviewed_by = reviewed_by
        if notes:
            candidate.notes = notes
        
        # Move to rejected folder
        old_path = os.path.join(self.queue_path, f"{candidate_id}.json")
        if os.path.exists(old_path):
            os.remove(old_path)
        
        self._save_candidate(candidate)
        
        print(f"[LearningQueue] Rejected candidate {candidate_id[:8]}")
        return True
    
    def _load_candidate(self, candidate_id: str) -> Optional[LearningCandidate]:
        """Load candidate from any location"""
        # Check all locations
        for folder in [self.queue_path, self.approved_path, self.rejected_path]:
            filepath = os.path.join(folder, f"{candidate_id}.json")
            if os.path.exists(filepath):
                with open(filepath, 'r', encoding='utf-8') as f:
                    return LearningCandidate.from_dict(json.load(f))
        return None
    
    def _add_to_training_data(self, candidate: LearningCandidate) -> None:
        """Add approved candidate to training data"""
        store = ConversationStore(self.config)
        
        record = ConversationRecord(
            id=candidate.id,
            timestamp=candidate.created_at,
            model="rnj-1",  # Original was from rnj-1
            prompt_text=candidate.concrete_prompt,
            response_text=candidate.original_response,
            metadata={
                "learning_candidate": True,
                "complexity_score": candidate.complexity_metrics.get("overall_score"),
                "reason": candidate.reason,
                "approved_by": candidate.reviewed_by
            }
        )
        
        store.add(record)
        print(f"[LearningQueue] Added to training data: {candidate.id[:8]}")
        
        # Mark as learned
        candidate.status = "learned"
        self._save_candidate(candidate)
    
    def get_pending(self, limit: int = 20) -> List[LearningCandidate]:
        """Get pending candidates awaiting review"""
        candidates = []
        
        for filename in os.listdir(self.queue_path):
            if not filename.endswith('.json'):
                continue
            
            filepath = os.path.join(self.queue_path, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if data.get("status") == "pending":
                        candidates.append(LearningCandidate.from_dict(data))
            except Exception as e:
                logger.warning(f"Error reading pending candidate {filename}: {e}")
                continue
        
        # Sort by complexity (highest first)
        candidates.sort(
            key=lambda x: x.complexity_metrics.get("overall_score", 0),
            reverse=True
        )
        
        return candidates[:limit]
    
    def get_approved(self, limit: int = 20) -> List[LearningCandidate]:
        """Get approved candidates"""
        candidates = []
        
        for filename in os.listdir(self.approved_path):
            if not filename.endswith('.json'):
                continue
            
            filepath = os.path.join(self.approved_path, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    candidates.append(LearningCandidate.from_dict(json.load(f)))
            except Exception as e:
                logger.warning(f"Error reading approved candidate {filename}: {e}")
                continue
        
        return candidates[:limit]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get queue statistics"""
        pending = len([f for f in os.listdir(self.queue_path) if f.endswith('.json')])
        approved = len([f for f in os.listdir(self.approved_path) if f.endswith('.json')])
        rejected = len([f for f in os.listdir(self.rejected_path) if f.endswith('.json')])
        
        return {
            "pending": pending,
            "approved": approved,
            "rejected": rejected,
            "total": pending + approved + rejected
        }
    
    def auto_approve_high_complexity(self, threshold: float = 0.8) -> int:
        """
        Auto-approve candidates above complexity threshold
        Returns number approved
        """
        pending = self.get_pending(limit=1000)
        approved_count = 0
        
        for candidate in pending:
            score = candidate.complexity_metrics.get("overall_score", 0)
            if score >= threshold:
                self.approve(
                    candidate.id,
                    reviewed_by="auto_high_complexity",
                    notes=f"Auto-approved: complexity {score:.2f} >= {threshold}"
                )
                approved_count += 1
        
        return approved_count


# Convenience functions
def add_learning_candidate(prompt: str, response: str, 
                           complexity: ComplexityMetrics,
                           reason: str) -> LearningCandidate:
    """Add a candidate to learning queue"""
    queue = LearningQueue()
    return queue.add_candidate(prompt, response, complexity, reason)


def approve_candidate(candidate_id: str, notes: Optional[str] = None) -> bool:
    """Approve a candidate for learning"""
    queue = LearningQueue()
    return queue.approve(candidate_id, reviewed_by="manual", notes=notes)


def get_pending_candidates(limit: int = 20) -> List[LearningCandidate]:
    """Get pending candidates"""
    queue = LearningQueue()
    return queue.get_pending(limit)
