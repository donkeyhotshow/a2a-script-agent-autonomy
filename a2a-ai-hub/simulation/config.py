"""
Configuration for rnj-L simulation system
"""
import os
from dataclasses import dataclass, field
from typing import Dict, Any


@dataclass
class SimulationConfig:
    """Configuration for the rnj-L simulation system"""
    
    # Confidence threshold for simulation (0.0 to 1.0)
    # If confidence >= threshold, use simulation; otherwise use real model
    confidence_threshold: float = 0.75
    
    # Embedding model to use (lightweight, CPU-optimized)
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    
    # Maximum number of records to keep in history
    max_history: int = 10000
    
    # Paths for simulation data
    base_data_path: str = field(default_factory=lambda: os.environ.get(
        'SIMULATION_DATA_PATH', 'simulation_data'
    ))
    
    # FAISS index file
    @property
    def vector_index_path(self) -> str:
        return os.path.join(self.base_data_path, "vector_index.faiss")
    
    # Records directory
    @property
    def records_path(self) -> str:
        return os.path.join(self.base_data_path, "records")
    
    # Configuration file
    @property
    def config_path(self) -> str:
        return os.path.join(self.base_data_path, "config.json")
    
    # Backup directory
    @property
    def backup_path(self) -> str:
        return os.path.join(self.base_data_path, "backups")
    
    # Model name to simulate
    target_model: str = "rnj-1"
    
    # Simulated model name
    simulated_model: str = "rnj-L"
    
    # Whether to fallback to real model on simulation errors
    fallback_on_error: bool = True
    
    # Similarity metric: "cosine", "euclidean", or "dot"
    similarity_metric: str = "cosine"
    
    # Number of similar prompts to consider for response generation
    k_neighbors: int = 5
    
    # Auto-update index after N new records
    auto_update_threshold: int = 100
    
    # Weights for confidence calculation
    similarity_weight: float = 0.6
    coverage_weight: float = 0.3
    recency_weight: float = 0.1
    
    # Recency boost window in seconds (24 hours)
    recency_window: float = 86400
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dictionary"""
        return {
            "confidence_threshold": self.confidence_threshold,
            "embedding_model": self.embedding_model,
            "max_history": self.max_history,
            "base_data_path": self.base_data_path,
            "target_model": self.target_model,
            "simulated_model": self.simulated_model,
            "fallback_on_error": self.fallback_on_error,
            "similarity_metric": self.similarity_metric,
            "k_neighbors": self.k_neighbors,
            "auto_update_threshold": self.auto_update_threshold,
            "similarity_weight": self.similarity_weight,
            "coverage_weight": self.coverage_weight,
            "recency_weight": self.recency_weight,
            "recency_window": self.recency_window,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SimulationConfig":
        """Create config from dictionary"""
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})
    
    def save(self) -> None:
        """Save configuration to file"""
        import json
        os.makedirs(self.base_data_path, exist_ok=True)
        with open(self.config_path, 'w', encoding='utf-8') as f:
            json.dump(self.to_dict(), f, indent=2, ensure_ascii=False)
    
    @classmethod
    def load(cls) -> "SimulationConfig":
        """Load configuration from file or create default"""
        import json
        config_path = os.environ.get('SIMULATION_DATA_PATH', 'simulation_data')
        full_path = os.path.join(config_path, "config.json")
        
        if os.path.exists(full_path):
            with open(full_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return cls.from_dict(data)
        return cls()


# Global config instance
_config: SimulationConfig = None


def get_config() -> SimulationConfig:
    """Get global configuration instance"""
    global _config
    if _config is None:
        _config = SimulationConfig.load()
    return _config


def set_config(config: SimulationConfig) -> None:
    """Set global configuration instance"""
    global _config
    _config = config
