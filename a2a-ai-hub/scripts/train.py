#!/usr/bin/env python3
"""
Training script for rnj-L simulation
Manually rebuild or update the vector index from conversation history
"""

import os
import sys
import argparse
import time

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from simulation import get_config, set_config
from simulation.storage import ConversationStore
from simulation.learner import EmbeddingLearner, build_index_from_history, update_index_with_new_records


def print_stats(store: ConversationStore) -> None:
    """Print current storage statistics"""
    stats = store.get_stats()
    print("\n" + "=" * 50)
    print("Storage Statistics")
    print("=" * 50)
    print(f"Total records:     {stats['total_records']}")
    print(f"rnj-1 records:     {stats['rnj1_records']}")
    print(f"rnj-L records:     {stats['rnjL_records']}")
    print(f"Index exists:      {stats['index_exists']}")
    print(f"Records path:      {stats['records_path']}")
    print(f"Index path:        {stats['index_path']}")
    print("=" * 50)


def cmd_build(args):
    """Build index from all history"""
    print("\nBuilding index from all rnj-1 history...")
    print("This may take a while depending on history size.\n")
    
    start_time = time.time()
    
    try:
        index = build_index_from_history()
        
        if index:
            elapsed = time.time() - start_time
            print(f"\n✓ Index built successfully in {elapsed:.2f}s")
            print(f"  Vectors: {len(index)}")
            print(f"  Dimension: {index.embeddings.shape[1] if len(index.embeddings) > 0 else 0}")
        else:
            print("\n✗ No history found. Index not built.")
            print("  Use the proxy with rnj-1 to generate history first.")
            
    except Exception as e:
        print(f"\n✗ Error building index: {e}")
        sys.exit(1)


def cmd_update(args):
    """Update index with new records"""
    print("\nUpdating index with new records...")
    
    start_time = time.time()
    
    try:
        index = update_index_with_new_records()
        
        if index:
            elapsed = time.time() - start_time
            print(f"\n✓ Index updated successfully in {elapsed:.2f}s")
            print(f"  Total vectors: {len(index)}")
        else:
            print("\n✗ No updates needed or error occurred.")
            
    except Exception as e:
        print(f"\n✗ Error updating index: {e}")
        sys.exit(1)


def cmd_stats(args):
    """Show statistics"""
    store = ConversationStore()
    print_stats(store)
    
    # Show config
    config = get_config()
    print("\nConfiguration:")
    print(f"  Confidence threshold: {config.confidence_threshold}")
    print(f"  Embedding model:      {config.embedding_model}")
    print(f"  Max history:          {config.max_history}")
    print(f"  Auto-update threshold: {config.auto_update_threshold}")


def cmd_backup(args):
    """Create backup"""
    print("\nCreating backup...")
    
    store = ConversationStore()
    backup_path = store.backup()
    
    print(f"\n✓ Backup created: {backup_path}")
    print(f"  Size: {get_dir_size(backup_path) / 1024 / 1024:.2f} MB")


def cmd_clear(args):
    """Clear all data (DANGEROUS)"""
    if not args.force:
        print("\n⚠ WARNING: This will delete all simulation data!")
        print("  Including: records, index, and backups")
        response = input("  Type 'yes' to confirm: ")
        if response != 'yes':
            print("  Aborted.")
            return
    
    print("\nClearing all simulation data...")
    
    store = ConversationStore()
    store.clear_all()
    
    print("\n✓ All data cleared.")


def cmd_test(args):
    """Test embedding generation"""
    print(f"\nTesting embedding model: {get_config().embedding_model}")
    print("Loading model (this may take a moment)...")
    
    try:
        learner = EmbeddingLearner()
        
        # Test encoding
        test_prompts = [
            "Hello, how are you?",
            "What is machine learning?",
            "Explain quantum computing"
        ]
        
        print(f"\nEncoding {len(test_prompts)} test prompts...")
        start_time = time.time()
        
        embeddings = learner.encode(test_prompts, show_progress=True)
        
        elapsed = time.time() - start_time
        
        print(f"\n✓ Encoding successful")
        print(f"  Dimension: {learner.embedding_dim}")
        print(f"  Time: {elapsed:.3f}s ({elapsed/len(test_prompts):.3f}s per prompt)")
        print(f"  Shape: {embeddings.shape}")
        
        # Test similarity
        if len(test_prompts) >= 2:
            sim = learner.compute_similarity(test_prompts[0], test_prompts[1])
            print(f"  Similarity ('{test_prompts[0][:20]}...' vs '{test_prompts[1][:20]}...'): {sim:.3f}")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        sys.exit(1)


def get_dir_size(path):
    """Get directory size in bytes"""
    total = 0
    for dirpath, dirnames, filenames in os.walk(path):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            if os.path.exists(fp):
                total += os.path.getsize(fp)
    return total


def main():
    parser = argparse.ArgumentParser(
        description="Training and management script for rnj-L simulation",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s build              # Build index from all history
  %(prog)s update             # Update index with new records
  %(prog)s stats              # Show statistics
  %(prog)s backup             # Create backup
  %(prog)s test               # Test embedding model
  %(prog)s clear --force      # Clear all data (DANGEROUS)
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    # Build command
    build_parser = subparsers.add_parser('build', help='Build index from all history')
    
    # Update command
    update_parser = subparsers.add_parser('update', help='Update index with new records')
    
    # Stats command
    stats_parser = subparsers.add_parser('stats', help='Show statistics')
    
    # Backup command
    backup_parser = subparsers.add_parser('backup', help='Create backup')
    
    # Clear command
    clear_parser = subparsers.add_parser('clear', help='Clear all data (DANGEROUS)')
    clear_parser.add_argument('--force', action='store_true', help='Skip confirmation')
    
    # Test command
    test_parser = subparsers.add_parser('test', help='Test embedding model')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Route to command handler
    commands = {
        'build': cmd_build,
        'update': cmd_update,
        'stats': cmd_stats,
        'backup': cmd_backup,
        'clear': cmd_clear,
        'test': cmd_test,
    }
    
    commands[args.command](args)


if __name__ == '__main__':
    main()
