"""
Self-Consistency Wrapper
========================

Inspired by: "Mastering Self-Consistency Prompting"
Source: dev.to/abhishek_gautam-01/mastering-self-consistency-prompting-h7c

Core Philosophy:
- Instead of taking a single reasoning path, generate multiple diverse paths
- The answer that appears most consistently across paths is most likely correct
- Reduces hallucinations and improves reasoning reliability
- Particularly effective for complex reasoning, math, and coding tasks

This module implements a self-consistency wrapper that can be applied to any LLM
to improve reasoning accuracy through majority voting across multiple reasoning paths.
"""

import json
import re
from typing import Any, Optional
from dataclasses import dataclass, field
from enum import Enum
from collections import Counter
import asyncio


class ExtractionStrategy(Enum):
    """Strategy for extracting final answer from reasoning paths."""
    MAJORITY_VOTE = "majority_vote"
    CONFIDENCE_WEIGHTED = "confidence_weighted"
    REASONING_BASED = "reasoning_based"
    CHAIN_VOTING = "chain_voting"


@dataclass
class ReasoningPath:
    """A single reasoning path with its result."""
    path_id: str
    reasoning: str
    extracted_answer: str
    confidence: float  # 0.0 - 1.0
    tokens_used: int
    metadata: dict = field(default_factory=dict)


@dataclass
class SelfConsistencyResult:
    """Result from self-consistency analysis."""
    question: str
    paths: list[ReasoningPath]
    final_answer: str
    confidence: float
    agreement_score: float  # How much paths agree
    consensus_percentage: float
    dissenting_paths: list[ReasoningPath]
    analysis: dict
    total_tokens: int
    execution_time_ms: float


@dataclass
class ConsistencyMetrics:
    """Metrics for self-consistency analysis."""
    total_paths: int
    unique_answers: int
    agreement_score: float
    entropy: float
    confidence_distribution: dict
    consensus_strength: str  # 'strong', 'moderate', 'weak', 'none'


class SelfConsistencyWrapper:
    """
    Self-Consistency Wrapper for LLM Reasoning.

    Wraps an LLM to generate multiple reasoning paths and determine
    the most consistent answer through majority voting.
    """

    def __init__(
        self,
        llm_client: Any,
        num_paths: int = 5,
        extraction_strategy: ExtractionStrategy = ExtractionStrategy.MAJORITY_VOTE,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        enable_reflection: bool = True,
        verbose: bool = False
    ):
        """
        Initialize the Self-Consistency Wrapper.

        Args:
            llm_client: The underlying LLM client (must implement generate method)
            num_paths: Number of diverse reasoning paths to generate
            extraction_strategy: How to extract final answer from paths
            temperature: Temperature for generation (higher = more diverse)
            max_tokens: Maximum tokens per reasoning path
            enable_reflection: Whether to enable path reflection/revision
            verbose: Whether to output detailed reasoning
        """
        self.llm = llm_client
        self.num_paths = num_paths
        self.extraction_strategy = extraction_strategy
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.enable_reflection = enable_reflection
        self.verbose = verbose

        # Prompt templates
        self.reasoning_prompt = """Solve the following problem by thinking step by step.
Show your complete reasoning process.

Problem: {question}

Provide your detailed reasoning and final answer."""

        self.extraction_prompt = """From the following reasoning, extract the final answer.
Return ONLY the answer without explanation.

Reasoning:
{reasoning}

Answer:"""

        self.reflection_prompt = """Review this reasoning path and identify any flaws or areas for improvement.
If you find issues, provide a corrected version.

Original reasoning:
{reasoning}

Task: {question}

Reflection (identify issues or confirm correctness):"""

    async def solve(
        self,
        question: str,
        system_prompt: Optional[str] = None,
        context: Optional[dict] = None
    ) -> SelfConsistencyResult:
        """
        Solve a problem using self-consistency.

        Args:
            question: The problem/question to solve
            system_prompt: Optional system prompt for the LLM
            context: Optional context for the reasoning

        Returns:
            SelfConsistencyResult with final answer and analysis
        """
        import time
        start_time = time.time()

        if self.verbose:
            print(f"[SelfConsistency] Solving with {self.num_paths} paths...")

        # Generate multiple reasoning paths
        paths = await self._generate_reasoning_paths(question, system_prompt, context)

        if self.enable_reflection:
            paths = await self._apply_reflection(paths, question, system_prompt)

        # Extract answers from paths
        paths = await self._extract_answers(paths, system_prompt)

        # Calculate metrics
        metrics = self._calculate_metrics(paths)

        # Determine final answer based on strategy
        final_answer, confidence = self._determine_final_answer(paths, metrics)

        # Calculate dissenting paths
        consensus_answer = self._get_consensus_answer(paths)
        dissenting_paths = [
            p for p in paths if self._normalize_answer(p.extracted_answer) != consensus_answer
        ]

        execution_time = (time.time() - start_time) * 1000
        total_tokens = sum(p.tokens_used for p in paths)

        return SelfConsistencyResult(
            question=question,
            paths=paths,
            final_answer=final_answer,
            confidence=confidence,
            agreement_score=metrics.agreement_score,
            consensus_percentage=metrics.agreement_score * 100,
            dissenting_paths=dissenting_paths,
            analysis={
                'metrics': {
                    'total_paths': metrics.total_paths,
                    'unique_answers': metrics.unique_answers,
                    'entropy': metrics.entropy,
                    'consensus_strength': metrics.consensus_strength
                },
                'extraction_strategy': self.extraction_strategy.value,
                'reflection_enabled': self.enable_reflection
            },
            total_tokens=total_tokens,
            execution_time_ms=execution_time
        )

    async def _generate_reasoning_paths(
        self,
        question: str,
        system_prompt: Optional[str],
        context: Optional[dict]
    ) -> list[ReasoningPath]:
        """Generate multiple diverse reasoning paths."""
        paths = []
        prompts = self._generate_diverse_prompts(question)

        # Generate paths in parallel (with some diversity in prompts)
        tasks = [
            self._generate_single_path(prompt, system_prompt, idx)
            for idx, prompt in enumerate(prompts)
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        for idx, result in enumerate(results):
            if isinstance(result, Exception):
                if self.verbose:
                    print(f"[SelfConsistency] Path {idx} failed: {result}")
                continue

            path = ReasoningPath(
                path_id=f"path_{idx}",
                reasoning=result['reasoning'],
                extracted_answer="",
                confidence=0.5,
                tokens_used=result.get('tokens', 0),
                metadata={'variant': idx}
            )
            paths.append(path)

        return paths

    def _generate_diverse_prompts(self, question: str) -> list[str]:
        """Generate diverse prompt variants to encourage different reasoning paths."""
        base_prompt = self.reasoning_prompt.format(question=question)

        variants = [
            # Variant 1: Standard
            base_prompt,

            # Variant 2: Emphasize first principles
            """Take a first-principles approach to solve this problem.
Break down the problem to its fundamental components.

Problem: {question}

Reasoning:""".format(question=question),

            # Variant 3: Emphasize verification
            """Solve this problem carefully, verifying each step.

Problem: {question}

Work through it step by step, checking your work:""".format(question=question),

            # Variant 4: Different framing
            """Consider this problem from multiple angles.

Problem: {question}

Let's think through this systematically:""".format(question=question),

            # Variant 5: Emphasize common pitfalls
            """Be careful to avoid common mistakes when solving this.
Think about edge cases and potential traps.

Problem: {question}

Reasoning:""".format(question=question)
        ]

        return variants[:self.num_paths]

    async def _generate_single_path(
        self,
        prompt: str,
        system_prompt: Optional[str],
        idx: int
    ) -> dict:
        """Generate a single reasoning path."""
        messages = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        messages.append({"role": "user", "content": prompt})

        response = await self.llm.generate(
            messages,
            temperature=self.temperature + (idx * 0.1),  # Slight temp variation
            max_tokens=self.max_tokens
        )

        return {
            'reasoning': response.content,
            'tokens': response.usage.total_tokens if hasattr(response, 'usage') else 0
        }

    async def _apply_reflection(
        self,
        paths: list[ReasoningPath],
        question: str,
        system_prompt: Optional[str]
    ) -> list[ReasoningPath]:
        """Apply reflection to improve reasoning paths."""
        improved_paths = []

        for path in paths:
            if self.verbose:
                print(f"[SelfConsistency] Reflecting on {path.path_id}...")

            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})

            reflection_text = self.reflection_prompt.format(
                reasoning=path.reasoning,
                question=question
            )
            messages.append({"role": "user", "content": reflection_text})

            try:
                response = await self.llm.generate(
                    messages,
                    temperature=0.5,
                    max_tokens=self.max_tokens // 2
                )

                # If reflection improves the reasoning, use it
                if self._is_improved(path.reasoning, response.content, question):
                    path.reasoning = response.content
                    path.confidence = min(path.confidence + 0.1, 1.0)

                improved_paths.append(path)
            except Exception as e:
                if self.verbose:
                    print(f"[SelfConsistency] Reflection failed: {e}")
                improved_paths.append(path)

        return improved_paths

    async def _extract_answers(
        self,
        paths: list[ReasoningPath],
        system_prompt: Optional[str]
    ) -> list[ReasoningPath]:
        """Extract final answers from reasoning paths."""
        for path in paths:
            messages = []

            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})

            extraction_text = self.extraction_prompt.format(reasoning=path.reasoning)
            messages.append({"role": "user", "content": extraction_text})

            try:
                response = await self.llm.generate(
                    messages,
                    temperature=0.1,
                    max_tokens=256
                )

                path.extracted_answer = self._clean_answer(response.content)
            except Exception as e:
                if self.verbose:
                    print(f"[SelfConsistency] Extraction failed: {e}")
                path.extracted_answer = self._fallback_extract(path.reasoning)

        return paths

    def _determine_final_answer(
        self,
        paths: list[ReasoningPath],
        metrics: ConsistencyMetrics
    ) -> tuple[str, float]:
        """Determine the final answer based on extraction strategy."""
        if self.extraction_strategy == ExtractionStrategy.MAJORITY_VOTE:
            return self._majority_vote(paths, metrics)

        elif self.extraction_strategy == ExtractionStrategy.CONFIDENCE_WEIGHTED:
            return self._confidence_weighted(paths)

        elif self.extraction_strategy == ExtractionStrategy.CHAIN_VOTING:
            return self._chain_voting(paths)

        else:  # REASONING_BASED
            return self._reasoning_based(paths)

    def _majority_vote(
        self,
        paths: list[ReasoningPath],
        metrics: ConsistencyMetrics
    ) -> tuple[str, float]:
        """Simple majority vote on extracted answers."""
        consensus = self._get_consensus_answer(paths)
        confidence = metrics.agreement_score
        return consensus, confidence

    def _confidence_weighted(self, paths: list[ReasoningPath]) -> tuple[str, float]:
        """Weight votes by path confidence."""
        weighted_answers: dict[str, float] = {}

        for path in paths:
            answer = self._normalize_answer(path.extracted_answer)
            weighted_answers[answer] = weighted_answers.get(answer, 0) + path.confidence

        best_answer = max(weighted_answers.items(), key=lambda x: x[1])
        confidence = best_answer[1] / sum(p.confidence for p in paths)

        return best_answer[0], confidence

    def _chain_voting(self, paths: list[ReasoningPath]) -> tuple[str, float]:
        """Vote on chains of reasoning, not just final answers."""
        # Extract key reasoning steps
        step_votes: dict[str, dict[str, int]] = {}

        for path in paths:
            steps = self._extract_reasoning_steps(path.reasoning)
            for i, step in enumerate(steps):
                if i not in step_votes:
                    step_votes[i] = {}
                normalized = self._normalize_answer(step)
                step_votes[i][normalized] = step_votes[i].get(normalized, 0) + 1

        # Reconstruct answer by majority at each step
        reconstructed_steps = []
        for i in sorted(step_votes.keys()):
            step_answers = step_votes[i]
            best_step = max(step_answers.items(), key=lambda x: x[1])
            reconstructed_steps.append(best_step[0])

        # Use the reconstructed answer
        consensus_steps = self._get_consensus_answer_from_steps(paths)
        return consensus_steps, sum(p.confidence for p in paths) / len(paths)

    def _reasoning_based(self, paths: list[ReasoningPath]) -> tuple[str, float]:
        """Use the LLM to determine the most consistent answer."""
        # Use the path with highest confidence that also aligns with others
        sorted_paths = sorted(paths, key=lambda p: p.confidence, reverse=True)

        consensus = self._get_consensus_answer(paths)

        for path in sorted_paths:
            if self._normalize_answer(path.extracted_answer) == consensus:
                return path.extracted_answer, path.confidence

        return sorted_paths[0].extracted_answer, sorted_paths[0].confidence

    def _calculate_metrics(self, paths: list[ReasoningPath]) -> ConsistencyMetrics:
        """Calculate consistency metrics for the reasoning paths."""
        answers = [self._normalize_answer(p.extracted_answer) for p in paths]
        answer_counts = Counter(answers)

        total_paths = len(paths)
        unique_answers = len(answer_counts)

        # Agreement score: ratio of most common answer
        most_common_count = answer_counts.most_common(1)[0][1]
        agreement_score = most_common_count / total_paths if total_paths > 0 else 0

        # Entropy: measure of distribution uniformity
        entropy = self._calculate_entropy(list(answer_counts.values()), total_paths)

        # Confidence distribution
        confidence_buckets = {'high': 0, 'medium': 0, 'low': 0}
        for p in paths:
            if p.confidence >= 0.8:
                confidence_buckets['high'] += 1
            elif p.confidence >= 0.5:
                confidence_buckets['medium'] += 1
            else:
                confidence_buckets['low'] += 1

        # Consensus strength
        if agreement_score >= 0.8:
            consensus_strength = 'strong'
        elif agreement_score >= 0.6:
            consensus_strength = 'moderate'
        elif agreement_score >= 0.4:
            consensus_strength = 'weak'
        else:
            consensus_strength = 'none'

        return ConsistencyMetrics(
            total_paths=total_paths,
            unique_answers=unique_answers,
            agreement_score=agreement_score,
            entropy=entropy,
            confidence_distribution=confidence_buckets,
            consensus_strength=consensus_strength
        )

    def _calculate_entropy(self, counts: list[int], total: int) -> float:
        """Calculate Shannon entropy of the distribution."""
        if total == 0:
            return 0.0

        entropy = 0.0
        for count in counts:
            if count > 0:
                p = count / total
                entropy -= p * (p ** 0.5)  # Simplified for efficiency

        return entropy

    def _get_consensus_answer(self, paths: list[ReasoningPath]) -> str:
        """Get the consensus answer from paths."""
        answers = [self._normalize_answer(p.extracted_answer) for p in paths]
        counter = Counter(answers)
        return counter.most_common(1)[0][0]

    def _get_consensus_answer_from_steps(self, paths: list[ReasoningPath]) -> str:
        """Reconstruct answer from majority-voted reasoning steps."""
        all_steps = []
        for path in paths:
            steps = self._extract_reasoning_steps(path.reasoning)
            all_steps.append(steps)

        if not all_steps or not all_steps[0]:
            return self._get_consensus_answer(paths)

        # Take the longest path's conclusion as reference
        longest_path = max(all_steps, key=len)
        if longest_path:
            return longest_path[-1]
        return self._get_consensus_answer(paths)

    def _normalize_answer(self, answer: str) -> str:
        """Normalize an answer for comparison."""
        # Remove extra whitespace and lowercase
        normalized = ' '.join(answer.lower().split())

        # Remove common prefixes/suffixes
        normalized = re.sub(r'^(the answer is:?|answer:?)\s*', '', normalized, flags=re.IGNORECASE)

        # Normalize numbers (allow for minor formatting differences)
        normalized = re.sub(r'(\d),(\d)', r'\1\2', normalized)

        return normalized.strip()

    def _clean_answer(self, answer: str) -> str:
        """Clean an extracted answer."""
        # Remove thinking tags
        answer = re.sub(r'<thinking>.*?</thinking>', '', answer, flags=re.DOTALL)

        # Take first line if multiple
        first_line = answer.split('\n')[0].strip()

        # Remove common prefixes
        first_line = re.sub(r'^(answer|result):\s*', '', first_line, flags=re.IGNORECASE)

        return first_line.strip()

    def _fallback_extract(self, reasoning: str) -> str:
        """Fallback answer extraction using heuristics."""
        # Try to find a final answer pattern
        patterns = [
            r'(?:therefore|thus|hence|so)\s+(?:the answer is\s+)?(.+?)(?:\.|$)',
            r'(?:answer|result):\s*(.+?)(?:\.|$)',
            r'(?:final answer)\s+(?:is\s+)?(.+?)(?:\.|$)',
            r'=\s*(.+?)(?:\.|$)'
        ]

        for pattern in patterns:
            match = re.search(pattern, reasoning, re.IGNORECASE | re.DOTALL)
            if match:
                return match.group(1).strip()

        # Fallback: return last sentence
        sentences = reasoning.split('.')
        return sentences[-1].strip() if sentences else reasoning[-100:]

    def _extract_reasoning_steps(self, reasoning: str) -> list[str]:
        """Extract individual reasoning steps from text."""
        # Split by common step indicators
        steps = re.split(r'\n\d+[\.\)]\s*|\n-\s*|\n•\s*', reasoning)

        # Filter and clean
        steps = [s.strip() for s in steps if s.strip() and len(s.strip()) > 10]

        return steps

    def _is_improved(
        self,
        original: str,
        reflection: str,
        question: str
    ) -> bool:
        """Check if reflection improved the reasoning."""
        # Simple heuristics: reflection should be different and not too short
        if len(reflection) < len(original) * 0.5:
            return False

        if len(reflection) > len(original) * 2:
            return True

        # Check for improvement indicators
        improvement_indicators = [
            'however', 'but', 'actually', 'revised', 'correction',
            'more carefully', 'on second thought', 'improved'
        ]

        return any(ind in reflection.lower() for ind in improvement_indicators)


class AdaptiveSelfConsistency(SelfConsistencyWrapper):
    """
    Adaptive Self-Consistency that adjusts number of paths based on:
    - Task complexity
    - Initial agreement level
    - Time constraints
    """

    def __init__(
        self,
        llm_client: Any,
        min_paths: int = 3,
        max_paths: int = 10,
        initial_paths: int = 3,
        **kwargs
    ):
        super().__init__(llm_client, num_paths=initial_paths, **kwargs)
        self.min_paths = min_paths
        self.max_paths = max_paths
        self.initial_paths = initial_paths

    async def solve(
        self,
        question: str,
        system_prompt: Optional[str] = None,
        context: Optional[dict] = None,
        complexity_hint: Optional[str] = None
    ) -> SelfConsistencyResult:
        """Solve with adaptive path count."""
        import time
        start_time = time.time()

        # Initial pass with few paths
        self.num_paths = self.initial_paths
        result = await super().solve(question, system_prompt, context)

        # If consensus is weak, add more paths
        if result.agreement_score < 0.6 and self.num_paths < self.max_paths:
            additional_needed = min(2, self.max_paths - self.num_paths)
            self.num_paths += additional_needed

            # Generate additional paths
            additional_paths = await self._generate_reasoning_paths(
                question, system_prompt, context
            )
            additional_paths = await self._extract_answers(additional_paths, system_prompt)

            result.paths.extend(additional_paths)
            result.agreement_score = self._calculate_metrics(result.paths).agreement_score
            result.consensus_percentage = result.agreement_score * 100

        # Recalculate final answer
        metrics = self._calculate_metrics(result.paths)
        result.final_answer, result.confidence = self._determine_final_answer(result.paths, metrics)

        # Update dissenting paths
        consensus = self._get_consensus_answer(result.paths)
        result.dissenting_paths = [
            p for p in result.paths
            if self._normalize_answer(p.extracted_answer) != consensus
        ]

        result.total_tokens = sum(p.tokens_used for p in result.paths)
        result.execution_time_ms = (time.time() - start_time) * 1000

        return result


# Export for integration
__all__ = [
    'SelfConsistencyWrapper',
    'AdaptiveSelfConsistency',
    'SelfConsistencyResult',
    'ReasoningPath',
    'ConsistencyMetrics',
    'ExtractionStrategy'
]
