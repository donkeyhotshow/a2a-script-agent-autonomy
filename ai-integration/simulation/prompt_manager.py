"""
Prompt Management System
Handles abstract prompts, complexity detection, decomposition, and composition
"""
import os
import json
import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime

from .config import get_config, SimulationConfig
from .storage import ConversationStore, ConversationRecord

# Setup logger
logger = logging.getLogger(__name__)


@dataclass
class AbstractPrompt:
    """Abstract prompt that can be converted to different formats"""
    id: str
    created_at: float
    abstract_text: str  # High-level intent
    context: Dict[str, Any]  # Variables, constraints, etc.
    complexity_score: float  # 0-1 complexity rating
    decomposition_steps: List[str]  # If broken down
    target_format: str  # "ollama", "openai", "anthropic", etc.
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "created_at": self.created_at,
            "abstract_text": self.abstract_text,
            "context": self.context,
            "complexity_score": self.complexity_score,
            "decomposition_steps": self.decomposition_steps,
            "target_format": self.target_format
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AbstractPrompt":
        return cls(
            id=data.get("id", ""),
            created_at=data.get("created_at", 0.0),
            abstract_text=data.get("abstract_text", ""),
            context=data.get("context", {}),
            complexity_score=data.get("complexity_score", 0.5),
            decomposition_steps=data.get("decomposition_steps", []),
            target_format=data.get("target_format", "ollama")
        )


@dataclass
class PromptConversion:
    """Result of converting abstract to concrete prompt"""
    abstract_prompt: AbstractPrompt
    concrete_prompt: str  # Actual text sent to model
    format_type: str  # "ollama", "openai", etc.
    estimated_complexity: float
    suggested_decomposition: bool


@dataclass
class ComplexityMetrics:
    """Metrics for prompt complexity"""
    length_score: float  # Based on token count
    structure_score: float  # Nested instructions, conditionals
    domain_score: float  # Technical domain indicators
    ambiguity_score: float  # Unclear or open-ended
    overall_score: float  # Weighted combination
    
    def is_complex(self, threshold: float = 0.7) -> bool:
        return self.overall_score >= threshold
    
    def is_unsuccessful_candidate(self, threshold: float = 0.6) -> bool:
        """Check if this prompt is a candidate for learning"""
        return self.overall_score >= threshold


class PromptComplexityAnalyzer:
    """Analyzes prompt complexity to detect candidates for learning"""
    
    def __init__(self, config: Optional[SimulationConfig] = None):
        self.config = config or get_config()
        
        # Complexity indicators
        self.technical_terms = {
            "algorithm", "implementation", "architecture", "optimization",
            "refactor", "debug", "performance", "scalability", "distributed",
            "microservice", "database", "cache", "async", "concurrent",
            "machine learning", "neural network", "model", "training",
            "complex", "advanced", "sophisticated", "enterprise"
        }
        
        self.structure_indicators = [
            r"if\s+.*then\s+.*else",  # Conditionals
            r"for\s+each.*do",  # Loops
            r"while\s+.*do",  # While loops
            r"step\s+\d+",  # Numbered steps
            r"first.*then.*finally",  # Multi-stage
            r"considering|taking into account|given that",  # Context
        ]
    
    def analyze(self, prompt: str) -> ComplexityMetrics:
        """
        Analyze prompt complexity across multiple dimensions
        """
        # Length score (0-1, longer = more complex)
        word_count = len(prompt.split())
        length_score = min(1.0, word_count / 200)  # Normalize to 200 words
        
        # Structure score (nested instructions, conditionals)
        structure_score = self._calculate_structure_score(prompt)
        
        # Domain score (technical terminology)
        domain_score = self._calculate_domain_score(prompt)
        
        # Ambiguity score (open-ended, unclear requirements)
        ambiguity_score = self._calculate_ambiguity_score(prompt)
        
        # Overall score (weighted)
        overall = (
            0.25 * length_score +
            0.30 * structure_score +
            0.25 * domain_score +
            0.20 * ambiguity_score
        )
        
        return ComplexityMetrics(
            length_score=length_score,
            structure_score=structure_score,
            domain_score=domain_score,
            ambiguity_score=ambiguity_score,
            overall_score=overall
        )
    
    def _calculate_structure_score(self, prompt: str) -> float:
        """Calculate structural complexity"""
        score = 0.0
        prompt_lower = prompt.lower()
        
        # Check for structural indicators
        for pattern in self.structure_indicators:
            if re.search(pattern, prompt_lower):
                score += 0.2
        
        # Check for multiple questions/tasks
        question_count = prompt.count("?") + prompt.count("how") + prompt.count("what")
        if question_count > 2:
            score += 0.3
        
        # Check for bullet points or numbered lists
        if re.search(r"(\n\s*[-*]\s|\n\s*\d+\.)", prompt):
            score += 0.2
        
        return min(1.0, score)
    
    def _calculate_domain_score(self, prompt: str) -> float:
        """Calculate technical domain complexity"""
        prompt_lower = prompt.lower()
        matches = sum(1 for term in self.technical_terms if term in prompt_lower)
        return min(1.0, matches / 3)  # 3+ terms = max score
    
    def _calculate_ambiguity_score(self, prompt: str) -> float:
        """Calculate ambiguity (higher = more ambiguous/complex)"""
        score = 0.0
        prompt_lower = prompt.lower()
        
        # Open-ended indicators
        open_indicators = ["etc", "and so on", "and more", "whatever", "etc."]
        score += sum(0.15 for ind in open_indicators if ind in prompt_lower)
        
        # Vague requirements
        vague_terms = ["good", "better", "improve", "optimize", "nice", "clean"]
        score += sum(0.1 for term in vague_terms if term in prompt_lower)
        
        # Missing context
        if len(prompt.split()) < 10:
            score += 0.3  # Very short might be underspecified
        
        return min(1.0, score)
    
    def should_learn_from_interaction(self, prompt: str, 
                                       response: str,
                                       response_time: float = 0) -> Tuple[bool, ComplexityMetrics]:
        """
        Determine if this interaction should be a learning candidate
        """
        metrics = self.analyze(prompt)
        
        # Factors indicating unsuccessful/complex:
        # 1. High complexity score
        # 2. Long response time (struggled)
        # 3. Short or generic response (didn't handle well)
        
        is_complex = metrics.is_unsuccessful_candidate()
        
        # Response quality indicators
        response_indicators = {
            "short_response": len(response.split()) < 20,
            "generic": any(word in response.lower() for word in 
                          ["i cannot", "i can't", "unable", "don't know"]),
            "slow": response_time > 5.0,  # >5 seconds
        }
        
        # Candidate if complex AND (poor response OR slow)
        should_learn = is_complex and (
            response_indicators["short_response"] or
            response_indicators["generic"] or
            response_indicators["slow"]
        )
        
        return should_learn, metrics


class PromptDecomposer:
    """
    Automatically decomposes complex prompts into steps
    Uses pattern matching and heuristics (can be enhanced with LLM)
    """
    
    def __init__(self, config: Optional[SimulationConfig] = None):
        self.config = config or get_config()
    
    def decompose(self, abstract_prompt: AbstractPrompt) -> List[str]:
        """
        Decompose abstract prompt into concrete steps
        Returns list of step prompts
        """
        text = abstract_prompt.abstract_text
        context = abstract_prompt.context
        
        # Check if already has numbered steps
        numbered_pattern = r"(?:step\s*\d+[.:]|^\d+[.)])\s*(.+)"
        matches = re.findall(numbered_pattern, text, re.MULTILINE | re.IGNORECASE)
        
        if matches:
            return [f"Step {i+1}: {step}" for i, step in enumerate(matches)]
        
        # Analyze and decompose by task type
        task_type = self._identify_task_type(text)
        
        if task_type == "code_generation":
            return self._decompose_code_task(text, context)
        elif task_type == "analysis":
            return self._decompose_analysis_task(text, context)
        elif task_type == "design":
            return self._decompose_design_task(text, context)
        else:
            return self._generic_decomposition(text, context)
    
    def _identify_task_type(self, text: str) -> str:
        """Identify the type of task"""
        text_lower = text.lower()
        
        code_indicators = ["code", "function", "class", "implement", "write a script",
                          "algorithm", "program", "method"]
        if any(ind in text_lower for ind in code_indicators):
            return "code_generation"
        
        analysis_indicators = ["analyze", "compare", "evaluate", "assess", 
                              "review", "examine", "study"]
        if any(ind in text_lower for ind in analysis_indicators):
            return "analysis"
        
        design_indicators = ["design", "architecture", "structure", "plan",
                            "organize", "layout", "schema"]
        if any(ind in text_lower for ind in design_indicators):
            return "design"
        
        return "general"
    
    def _decompose_code_task(self, text: str, context: Dict) -> List[str]:
        """Decompose code generation task"""
        steps = [
            f"Step 1: Analyze requirements and identify inputs/outputs for: {text[:100]}...",
            "Step 2: Design the algorithm and data structures",
            "Step 3: Write the core implementation",
            "Step 4: Add error handling and edge cases",
            "Step 5: Review and optimize the code"
        ]
        return steps
    
    def _decompose_analysis_task(self, text: str, context: Dict) -> List[str]:
        """Decompose analysis task"""
        steps = [
            f"Step 1: Define scope and objectives for: {text[:100]}...",
            "Step 2: Gather relevant information and data",
            "Step 3: Analyze each component separately",
            "Step 4: Synthesize findings",
            "Step 5: Form conclusions and recommendations"
        ]
        return steps
    
    def _decompose_design_task(self, text: str, context: Dict) -> List[str]:
        """Decompose design task"""
        steps = [
            f"Step 1: Understand requirements and constraints for: {text[:100]}...",
            "Step 2: Research existing solutions and best practices",
            "Step 3: Create high-level design",
            "Step 4: Detail component specifications",
            "Step 5: Plan implementation approach"
        ]
        return steps
    
    def _generic_decomposition(self, text: str, context: Dict) -> List[str]:
        """Generic decomposition for unknown task types"""
        # Split by sentences or logical parts
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
        
        if len(sentences) <= 1:
            # Too short to decompose meaningfully
            return [f"Task: {text}"]
        
        steps = []
        for i, sentence in enumerate(sentences[:5]):  # Max 5 steps
            steps.append(f"Step {i+1}: {sentence}")
        
        return steps


class ResultComposer:
    """
    Composes results from multiple steps into final response
    """
    
    def __init__(self, config: Optional[SimulationConfig] = None):
        self.config = config or get_config()
    
    def compose(self, step_results: List[str], original_prompt: str) -> str:
        """
        Combine step results into coherent final response
        """
        if not step_results:
            return "[Error: No step results to compose]"
        
        if len(step_results) == 1:
            return step_results[0]
        
        # Analyze results for coherence
        composed = self._intelligent_compose(step_results, original_prompt)
        
        return composed
    
    def _intelligent_compose(self, results: List[str], original: str) -> str:
        """Intelligently combine results"""
        # Remove redundant headers
        cleaned = []
        for result in results:
            # Remove step headers if present
            cleaned_text = re.sub(r"^Step \d+[:.)]\s*", "", result, flags=re.IGNORECASE)
            cleaned.append(cleaned_text.strip())
        
        # Join with appropriate connectors
        if len(cleaned) <= 3:
            # Short sequence - simple join
            return "\n\n".join(cleaned)
        
        # Longer sequence - structured composition
        introduction = cleaned[0]
        body = "\n\n".join(cleaned[1:-1])
        conclusion = cleaned[-1]
        
        composed = f"{introduction}\n\n{body}\n\n{conclusion}"
        
        return composed


class AbstractPromptManager:
    """
    Main manager for abstract prompt layer
    Coordinates complexity analysis, decomposition, and composition
    """
    
    def __init__(self, config: Optional[SimulationConfig] = None):
        self.config = config or get_config()
        self.analyzer = PromptComplexityAnalyzer(config)
        self.decomposer = PromptDecomposer(config)
        self.composer = ResultComposer(config)
        self.store = ConversationStore(config)
        
        # Storage for abstract prompts
        self.abstract_prompts_path = os.path.join(
            self.config.base_data_path, "abstract_prompts"
        )
        os.makedirs(self.abstract_prompts_path, exist_ok=True)
    
    def convert_to_ollama(self, abstract_text: str, context: Dict = None) -> PromptConversion:
        """
        Convert abstract prompt to Ollama-compatible concrete prompt
        """
        if context is None:
            context = {}
        
        # Create abstract prompt object
        import uuid
        abstract = AbstractPrompt(
            id=str(uuid.uuid4()),
            created_at=datetime.now().timestamp(),
            abstract_text=abstract_text,
            context=context,
            complexity_score=0.0,  # Will be calculated
            decomposition_steps=[],
            target_format="ollama"
        )
        
        # Analyze complexity
        metrics = self.analyzer.analyze(abstract_text)
        abstract.complexity_score = metrics.overall_score
        
        # Decide on decomposition
        if metrics.is_complex():
            abstract.decomposition_steps = self.decomposer.decompose(abstract)
            concrete = self._format_decomposed_for_ollama(abstract)
        else:
            concrete = self._format_simple_for_ollama(abstract_text, context)
        
        # Save abstract prompt
        self._save_abstract_prompt(abstract)
        
        return PromptConversion(
            abstract_prompt=abstract,
            concrete_prompt=concrete,
            format_type="ollama",
            estimated_complexity=metrics.overall_score,
            suggested_decomposition=len(abstract.decomposition_steps) > 0
        )
    
    def _format_simple_for_ollama(self, text: str, context: Dict) -> str:
        """Format simple prompt for Ollama"""
        # Add context if available
        if context:
            context_str = "\n".join([f"{k}: {v}" for k, v in context.items()])
            return f"Context:\n{context_str}\n\nTask: {text}"
        return text
    
    def _format_decomposed_for_ollama(self, abstract: AbstractPrompt) -> str:
        """Format decomposed prompt for Ollama"""
        steps_text = "\n".join([
            f"{i+1}. {step}" for i, step in enumerate(abstract.decomposition_steps)
        ])
        
        return f"""Task: {abstract.abstract_text}

Please complete this in the following steps:
{steps_text}

Provide detailed output for each step."""
    
    def _save_abstract_prompt(self, abstract: AbstractPrompt) -> None:
        """Save abstract prompt to storage"""
        filename = f"abstract_{int(abstract.created_at)}_{abstract.id}.json"
        filepath = os.path.join(self.abstract_prompts_path, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(abstract.to_dict(), f, indent=2, ensure_ascii=False)
    
    def get_learning_candidates(self, limit: int = 10) -> List[AbstractPrompt]:
        """Get prompts marked as learning candidates"""
        candidates = []
        
        for filename in os.listdir(self.abstract_prompts_path):
            if not filename.endswith('.json'):
                continue
            
            filepath = os.path.join(self.abstract_prompts_path, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    abstract = AbstractPrompt.from_dict(data)
                    
                    # Check if marked as candidate
                    if abstract.context.get("learning_candidate", False):
                        candidates.append(abstract)
            except Exception as e:
                logger.warning(f"Error processing abstract prompt {filename}: {e}")
                continue
        
        # Sort by complexity score (highest first)
        candidates.sort(key=lambda x: x.complexity_score, reverse=True)
        return candidates[:limit]
    
    def mark_for_learning(self, prompt_id: str) -> bool:
        """Mark a prompt as approved for learning"""
        for filename in os.listdir(self.abstract_prompts_path):
            if not filename.endswith('.json'):
                continue
            
            filepath = os.path.join(self.abstract_prompts_path, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                    if data.get("id") == prompt_id:
                        data["context"]["learning_candidate"] = True
                        data["context"]["approved_for_learning"] = True
                        data["context"]["approved_at"] = datetime.now().isoformat()
                        
                        with open(filepath, 'w', encoding='utf-8') as f:
                            json.dump(data, f, indent=2, ensure_ascii=False)
                        return True
            except Exception as e:
                logger.warning(f"Error marking prompt for learning {filename}: {e}")
                continue
        
        return False


# Convenience functions
def convert_abstract_to_ollama(abstract_text: str, context: Dict = None) -> str:
    """Convert abstract prompt to Ollama format"""
    manager = AbstractPromptManager()
    conversion = manager.convert_to_ollama(abstract_text, context)
    return conversion.concrete_prompt


def analyze_prompt_complexity(prompt: str) -> ComplexityMetrics:
    """Analyze prompt complexity"""
    analyzer = PromptComplexityAnalyzer()
    return analyzer.analyze(prompt)


def should_learn_from_prompt(prompt: str, response: str, response_time: float = 0) -> bool:
    """Check if prompt should be learning candidate"""
    analyzer = PromptComplexityAnalyzer()
    should_learn, _ = analyzer.should_learn_from_interaction(prompt, response, response_time)
    return should_learn
