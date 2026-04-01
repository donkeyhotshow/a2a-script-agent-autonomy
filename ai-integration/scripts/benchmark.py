#!/usr/bin/env python3
"""
Benchmark script for rnj-L simulation
Tests performance of embedding generation and similarity search
"""

import os
import sys
import time
import statistics
import argparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from simulation import get_config
from simulation.storage import ConversationStore
from simulation.learner import EmbeddingLearner
from simulation.engine import SimulationEngine


def benchmark_embeddings(num_prompts=100):
    """Benchmark embedding generation speed"""
    print(f"\n{'='*60}")
    print(f"Benchmarking Embedding Generation")
    print(f"{'='*60}")
    
    # Generate test prompts
    test_prompts = [
        f"This is test prompt number {i} with some additional text to make it realistic"
        for i in range(num_prompts)
    ]
    
    learner = EmbeddingLearner()
    
    # Warmup
    print("Warming up...")
    _ = learner.encode(["warmup prompt"], show_progress=False)
    
    # Benchmark
    print(f"Encoding {num_prompts} prompts...")
    times = []
    
    for i, prompt in enumerate(test_prompts):
        start = time.perf_counter()
        embedding = learner.encode([prompt], show_progress=False)
        elapsed = time.perf_counter() - start
        times.append(elapsed)
        
        if (i + 1) % 10 == 0:
            print(f"  Progress: {i+1}/{num_prompts}")
    
    # Statistics
    avg_time = statistics.mean(times)
    median_time = statistics.median(times)
    min_time = min(times)
    max_time = max(times)
    throughput = 1.0 / avg_time if avg_time > 0 else 0
    
    print(f"\nResults:")
    print(f"  Average:   {avg_time*1000:.2f} ms/prompt")
    print(f"  Median:    {median_time*1000:.2f} ms/prompt")
    print(f"  Min:       {min_time*1000:.2f} ms/prompt")
    print(f"  Max:       {max_time*1000:.2f} ms/prompt")
    print(f"  Throughput: {throughput:.1f} prompts/second")
    
    return avg_time * 1000  # Return in ms


def benchmark_search(index_size=1000, num_queries=100):
    """Benchmark similarity search speed"""
    print(f"\n{'='*60}")
    print(f"Benchmarking Similarity Search")
    print(f"{'='*60}")
    print(f"Index size: {index_size} vectors")
    print(f"Queries: {num_queries}")
    
    learner = EmbeddingLearner()
    
    # Create synthetic index
    print(f"\nBuilding synthetic index with {index_size} vectors...")
    synthetic_prompts = [f"Prompt {i}" for i in range(index_size)]
    
    start = time.time()
    embeddings = learner.encode(synthetic_prompts, show_progress=True)
    
    import faiss
    index = faiss.IndexFlatIP(learner.embedding_dim)
    faiss.normalize_L2(embeddings)
    index.add(embeddings)
    
    build_time = time.time() - start
    print(f"Index built in {build_time:.2f}s")
    
    # Benchmark queries
    print(f"\nRunning {num_queries} queries...")
    query_prompts = [f"Query prompt {i}" for i in range(num_queries)]
    query_embeddings = learner.encode(query_prompts, show_progress=False)
    faiss.normalize_L2(query_embeddings)
    
    times = []
    k = 5  # Find 5 nearest neighbors
    
    for i in range(num_queries):
        query = query_embeddings[i:i+1]
        
        start = time.perf_counter()
        distances, indices = index.search(query, k)
        elapsed = time.perf_counter() - start
        
        times.append(elapsed)
        
        if (i + 1) % 20 == 0:
            print(f"  Progress: {i+1}/{num_queries}")
    
    # Statistics
    avg_time = statistics.mean(times)
    median_time = statistics.median(times)
    min_time = min(times)
    max_time = max(times)
    throughput = 1.0 / avg_time if avg_time > 0 else 0
    
    print(f"\nResults:")
    print(f"  Average:   {avg_time*1000:.2f} ms/query")
    print(f"  Median:    {median_time*1000:.2f} ms/query")
    print(f"  Min:       {min_time*1000:.2f} ms/query")
    print(f"  Max:       {max_time*1000:.2f} ms/query")
    print(f"  Throughput: {throughput:.1f} queries/second")
    
    return avg_time * 1000


def benchmark_end_to_end(num_requests=50):
    """Benchmark end-to-end simulation"""
    print(f"\n{'='*60}")
    print(f"Benchmarking End-to-End Simulation")
    print(f"{'='*60}")
    
    store = ConversationStore()
    engine = SimulationEngine()
    
    # Check if we have data
    if not engine.index or engine.index.is_empty():
        print("No index available. Please build index first.")
        print("Run: python scripts/train.py build")
        return None
    
    # Get some real prompts from history or use synthetic
    records = store.get_rnj1_history()
    if len(records) >= num_requests:
        test_prompts = [r.prompt_text for r in records[:num_requests]]
    else:
        test_prompts = [f"Test prompt {i}" for i in range(num_requests)]
    
    print(f"Testing {len(test_prompts)} prompts...")
    
    times = []
    confidences = []
    
    for i, prompt in enumerate(test_prompts):
        start = time.perf_counter()
        
        response, confidence, is_simulated = engine.process_request(prompt)
        
        elapsed = time.perf_counter() - start
        times.append(elapsed)
        confidences.append(confidence.score if confidence else 0)
        
        if (i + 1) % 10 == 0:
            print(f"  Progress: {i+1}/{len(test_prompts)}")
    
    # Statistics
    avg_time = statistics.mean(times)
    median_time = statistics.median(times)
    min_time = min(times)
    max_time = max(times)
    avg_confidence = statistics.mean(confidences)
    simulated_ratio = sum(1 for c in confidences if c >= get_config().confidence_threshold) / len(confidences)
    
    print(f"\nResults:")
    print(f"  Average latency:   {avg_time*1000:.2f} ms")
    print(f"  Median latency:    {median_time*1000:.2f} ms")
    print(f"  Min latency:       {min_time*1000:.2f} ms")
    print(f"  Max latency:       {max_time*1000:.2f} ms")
    print(f"  Avg confidence:    {avg_confidence:.3f}")
    print(f"  Simulated ratio:   {simulated_ratio*100:.1f}%")
    
    return avg_time * 1000


def main():
    parser = argparse.ArgumentParser(description="Benchmark rnj-L simulation performance")
    parser.add_argument('--embeddings', type=int, default=100, help='Number of prompts for embedding benchmark')
    parser.add_argument('--search-size', type=int, default=1000, help='Index size for search benchmark')
    parser.add_argument('--search-queries', type=int, default=100, help='Number of search queries')
    parser.add_argument('--end-to-end', type=int, default=50, help='Number of end-to-end requests')
    parser.add_argument('--all', action='store_true', help='Run all benchmarks')
    
    args = parser.parse_args()
    
    print(f"\n{'#'*60}")
    print(f"# rnj-L Simulation Benchmark")
    print(f"{'#'*60}")
    print(f"Model: {get_config().embedding_model}")
    print(f"Device: CPU (no GPU)")
    
    results = {}
    
    if args.all or args.embeddings > 0:
        results['embeddings'] = benchmark_embeddings(args.embeddings)
    
    if args.all or args.search_queries > 0:
        results['search'] = benchmark_search(args.search_size, args.search_queries)
    
    if args.all:
        results['end_to_end'] = benchmark_end_to_end(args.end_to_end)
    
    # Summary
    print(f"\n{'='*60}")
    print(f"Summary")
    print(f"{'='*60}")
    for name, value in results.items():
        if value:
            print(f"  {name:20s}: {value:6.2f} ms")
    
    print(f"\n{'#'*60}")
    print(f"# Benchmark Complete")
    print(f"{'#'*60}")


if __name__ == '__main__':
    main()
