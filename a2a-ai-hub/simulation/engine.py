"""
Simulation Engine for rnj-L
Handles confidence calculation and response generation
"""
import datetime
from typing import List, Tuple, Optional, Dict, Any
from dataclasses import dataclass

import numpy as np

from .storage import ConversationRecord, VectorIndex, ConversationStore
from .learner import EmbeddingLearner
from .config import SimulationConfig, get_config


@dataclass
class ConfidenceScore:
    """Confidence score for simulation"""
    score: float  # 0.0 to 1.0
    method: str   # Calculation method used
    nearest_distance: float  # Distance to closest known prompt
    coverage_ratio: float    # How much of input is covered
    recency_boost: float     # Boost from recent similar interactions
    details: Dict[str, Any] = None  # Additional details
    
    def __post_init__(self):
        if self.details is None:
            self.details = {}
    
    def is_confident(self, threshold: float = 0.75) -> bool:
        """Check if confidence meets threshold"""
        return self.score >= threshold


@dataclass
class SimilarPrompt:
    """A similar prompt with its similarity score"""
    record: ConversationRecord
    similarity: float
    rank: int


class SimulationEngine:
    """
    Core simulation engine that determines when to simulate
    and generates simulated responses
    """
    
    def __init__(self, config: Optional[SimulationConfig] = None):
        self.config = config or get_config()
        self.learner = EmbeddingLearner(config=self.config)
        self.store = ConversationStore(config=self.config)
        self._index: Optional[VectorIndex] = None
        self._index_loaded = False
    
    @property
    def index(self) -> Optional[VectorIndex]:
        """Lazy loading of vector index"""
        if not self._index_loaded:
            self._index = self.store.load_index()
            self._index_loaded = True
        return self._index
    
    def reload_index(self) -> None:
        """Force reload of index from disk"""
        self._index = self.store.load_index()
        self._index_loaded = True
    
    def calculate_confidence(self, prompt: str, 
                            similar_prompts: List[SimilarPrompt]) -> ConfidenceScore:
        """
        Calculate confidence score for simulating a response
        
        Formula: confidence = w1 * similarity + w2 * coverage + w3 * recency
        
        Args:
            prompt: The input prompt
            similar_prompts: List of similar prompts found
            
        Returns:
            ConfidenceScore with detailed breakdown
        """
        if not similar_prompts:
            return ConfidenceScore(
                score=0.0,
                method="no_similar_prompts",
                nearest_distance=1.0,
                coverage_ratio=0.0,
                recency_boost=0.0,
                details={"reason": "No similar prompts found in index"}
            )
        
        # Get top match
        top_match = similar_prompts[0]
        nearest_distance = 1.0 - top_match.similarity  # Convert similarity to distance
        
        # Similarity score (0-1)
        similarity_score = top_match.similarity
        
        # Coverage ratio - how many words from prompt are covered by similar prompts
        prompt_words = set(prompt.lower().split())
        covered_words = set()
        for sp in similar_prompts[:3]:  # Top 3
            sp_words = set(sp.record.prompt_text.lower().split())
            covered_words.update(prompt_words & sp_words)
        
        coverage_ratio = len(covered_words) / len(prompt_words) if prompt_words else 0.0
        
        # Recency boost - check if any similar prompts are recent
        now = datetime.datetime.now().timestamp()
        recency_boost = 0.0
        for sp in similar_prompts:
            age = now - sp.record.timestamp
            if age < self.config.recency_window:  # Within window
                # Boost based on recency (newer = higher boost)
                recency_boost = max(recency_boost, 
                                  1.0 - (age / self.config.recency_window))
        
        # Calculate weighted confidence
        confidence = (
            self.config.similarity_weight * similarity_score +
            self.config.coverage_weight * coverage_ratio +
            self.config.recency_weight * recency_boost
        )
        
        # Clamp to 0-1
        confidence = max(0.0, min(1.0, confidence))
        
        return ConfidenceScore(
            score=confidence,
            method="weighted_ensemble",
            nearest_distance=nearest_distance,
            coverage_ratio=coverage_ratio,
            recency_boost=recency_boost,
            details={
                "similarity_score": similarity_score,
                "top_match_id": top_match.record.id,
                "num_similar_prompts": len(similar_prompts),
                "top_match_similarity": top_match.similarity
            }
        )
    
    def find_similar_prompts(self, prompt: str, k: int = 5) -> List[SimilarPrompt]:
        """
        Find k most similar prompts from history
        
        Args:
            prompt: Query prompt
            k: Number of neighbors to find
            
        Returns:
            List of SimilarPrompt objects sorted by similarity (descending)
        """
        idx = self.index
        if idx is None or idx.is_empty():
            return []
        
        # Search in FAISS index
        record_ids, similarities = self.learner.search_similar(prompt, idx, k=k)
        
        # Load full records
        all_records = {r.id: r for r in self.store.get_all()}
        
        similar_prompts = []
        for rank, (record_id, similarity) in enumerate(zip(record_ids, similarities)):
            if record_id in all_records:
                similar_prompts.append(SimilarPrompt(
                    record=all_records[record_id],
                    similarity=similarity,
                    rank=rank + 1
                ))
        
        # Sort by similarity (descending)
        similar_prompts.sort(key=lambda x: x.similarity, reverse=True)
        
        return similar_prompts
    
    def generate_response(self, prompt: str, 
                         similar_prompts: List[SimilarPrompt]) -> str:
        """
        Generate simulated response based on similar historical responses
        
        Strategy: Weighted combination of top similar responses
        
        Args:
            prompt: Input prompt
            similar_prompts: List of similar prompts with their responses
            
        Returns:
            Generated response text
        """
        if not similar_prompts:
            return "[Simulation Error: No similar prompts found]"
        
        # Use top match if very high similarity (>0.9)
        if similar_prompts[0].similarity > 0.9:
            return similar_prompts[0].record.response_text
        
        # Otherwise, use weighted approach with top 3
        top_k = similar_prompts[:min(3, len(similar_prompts))]
        
        # Calculate weights based on similarity
        total_sim = sum(sp.similarity for sp in top_k)
        weights = [sp.similarity / total_sim for sp in top_k] if total_sim > 0 else [1.0/len(top_k)] * len(top_k)
        
        # Select best response based on weighted random choice (deterministic here)
        # For now, return the highest weighted response
        best_idx = weights.index(max(weights))
        selected_response = top_k[best_idx].record.response_text
        
        # Add simulation marker
        return f"[rnj-L] {selected_response}"
    
    def should_simulate(self, prompt: str) -> Tuple[bool, ConfidenceScore]:
        """
        Determine if request should be handled by simulation or real model
        
        Args:
            prompt: Input prompt
            
        Returns:
            Tuple of (should_simulate, confidence_score)
        """
        # Find similar prompts
        similar = self.find_similar_prompts(prompt, k=self.config.k_neighbors)
        
        # Calculate confidence
        confidence = self.calculate_confidence(prompt, similar)
        
        # Check threshold
        should_sim = confidence.is_confident(self.config.confidence_threshold)
        
        return should_sim, confidence
    
    def process_request(self, prompt: str) -> Tuple[str, ConfidenceScore, bool]:
        """
        Process a request through the simulation engine
        
        Args:
            prompt: Input prompt
            
        Returns:
            Tuple of (response, confidence, is_simulated)
        """
        # Check if we should simulate
        should_sim, confidence = self.should_simulate(prompt)
        
        if should_sim:
            # Find similar prompts for response generation
            similar = self.find_similar_prompts(prompt, k=self.config.k_neighbors)
            response = self.generate_response(prompt, similar)
            return response, confidence, True
        else:
            # Return empty response with confidence, indicating fallback needed
            return "", confidence, False
    
    def get_stats(self) -> Dict[str, Any]:
        """Get engine statistics"""
        idx = self.index
        return {
            "index_loaded": idx is not None,
            "index_size": len(idx) if idx else 0,
            "config": self.config.to_dict(),
            "learner": self.learner.get_stats(),
            "storage": self.store.get_stats()
        }
    
    def force_simulate(self, prompt: str) -> Tuple[str, ConfidenceScore]:
        """
        Force simulation regardless of confidence (for testing)
        
        Args:
            prompt: Input prompt
            
        Returns:
            Tuple of (response, confidence)
        """
        similar = self.find_similar_prompts(prompt, k=self.config.k_neighbors)
        confidence = self.calculate_confidence(prompt, similar)
        response = self.generate_response(prompt, similar)
        return response, confidence


def calculate_confidence(prompt: str, index: VectorIndex, 
                        config: Optional[SimulationConfig] = None) -> ConfidenceScore:
    """Standalone function to calculate confidence"""
    engine = SimulationEngine(config)
    engine._index = index
    similar = engine.find_similar_prompts(prompt)
    return engine.calculate_confidence(prompt, similar)


def should_simulate(prompt: str, config: Optional[SimulationConfig] = None) -> Tuple[bool, ConfidenceScore]:
    """Standalone function to check if should simulate"""
    engine = SimulationEngine(config)
    return engine.should_simulate(prompt)
