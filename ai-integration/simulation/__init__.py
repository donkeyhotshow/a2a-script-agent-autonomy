"""
rnj-L Simulation System

A machine learning-based simulation system that learns from rnj-1 interactions
and provides simulated responses when confidence is high.
"""

from .config import SimulationConfig, get_config, set_config
from .storage import (
    ConversationRecord, 
    VectorIndex, 
    ConversationStore,
    save_record,
    load_records,
    get_rnj1_history
)
from .prompt_manager import (
    AbstractPrompt,
    PromptConversion,
    ComplexityMetrics,
    PromptComplexityAnalyzer,
    PromptDecomposer,
    ResultComposer,
    AbstractPromptManager,
    convert_abstract_to_ollama,
    analyze_prompt_complexity,
    should_learn_from_prompt
)
from .learning_queue import (
    LearningCandidate,
    LearningQueue,
    add_learning_candidate,
    approve_candidate,
    get_pending_candidates
)

__version__ = "1.0.0"
__all__ = [
    "SimulationConfig",
    "get_config",
    "set_config",
    "ConversationRecord",
    "VectorIndex",
    "ConversationStore",
    "save_record",
    "load_records",
    "get_rnj1_history",
    "AbstractPrompt",
    "PromptConversion",
    "ComplexityMetrics",
    "PromptComplexityAnalyzer",
    "PromptDecomposer",
    "ResultComposer",
    "AbstractPromptManager",
    "convert_abstract_to_ollama",
    "analyze_prompt_complexity",
    "should_learn_from_prompt",
    "LearningCandidate",
    "LearningQueue",
    "add_learning_candidate",
    "approve_candidate",
    "get_pending_candidates",
]
