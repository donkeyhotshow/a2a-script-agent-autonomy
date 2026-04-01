#!/usr/bin/env python3
"""
Learning Queue Management Script
Manage candidates for learning and simulation
"""
import os
import sys
import argparse
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from simulation import get_config
from simulation.learning_queue import LearningQueue, LearningCandidate


def print_candidate(candidate: LearningCandidate, detailed: bool = False):
    """Print candidate information"""
    print(f"\n{'='*60}")
    print(f"ID: {candidate.id}")
    print(f"status: {candidate.status}")
    print(f"Created: {datetime.fromtimestamp(candidate.created_at).strftime('%Y-%m-%d %H:%M:%S')}")
    
    if candidate.reviewed_at:
        print(f"Reviewed: {datetime.fromtimestamp(candidate.reviewed_at).strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Reviewed by: {candidate.reviewed_by}")
    
    print(f"\nComplexity Score: {candidate.complexity_metrics.get('overall_score', 0):.3f}")
    print(f"  - Length: {candidate.complexity_metrics.get('length_score', 0):.2f}")
    print(f"  - Structure: {candidate.complexity_metrics.get('structure_score', 0):.2f}")
    print(f"  - Domain: {candidate.complexity_metrics.get('domain_score', 0):.2f}")
    print(f"  - Ambiguity: {candidate.complexity_metrics.get('ambiguity_score', 0):.2f}")
    
    print(f"\nReason: {candidate.reason}")
    
    if detailed:
        print(f"\nPrompt (first 200 chars):")
        print(f"  {candidate.concrete_prompt[:200]}...")
        print(f"\nResponse (first 200 chars):")
        print(f"  {candidate.original_response[:200]}...")
    
    if candidate.notes:
        print(f"\nNotes: {candidate.notes}")
    print(f"{'='*60}")


def cmd_list(args):
    """List candidates"""
    queue = LearningQueue()
    
    if args.status == "pending":
        candidates = queue.get_pending(limit=args.limit)
        print(f"\nPending Candidates ({len(candidates)} shown):")
    elif args.status == "approved":
        candidates = queue.get_approved(limit=args.limit)
        print(f"\nApproved Candidates ({len(candidates)} shown):")
    else:
        # Get all by checking all directories
        pending = queue.get_pending(limit=1000)
        approved = queue.get_approved(limit=1000)
        candidates = pending + approved
        print(f"\nAll Candidates ({len(candidates)} shown):")
    
    for candidate in candidates:
        print_candidate(candidate, detailed=args.detailed)


def cmd_stats(args):
    """Show queue statistics"""
    queue = LearningQueue()
    stats = queue.get_stats()
    
    print(f"\n{'='*60}")
    print("Learning Queue Statistics")
    print(f"{'='*60}")
    print(f"Pending:  {stats['pending']:4d}")
    print(f"Approved: {stats['approved']:4d}")
    print(f"Rejected: {stats['rejected']:4d}")
    print(f"Total:    {stats['total']:4d}")
    print(f"{'='*60}")


def cmd_approve(args):
    """Approve a candidate"""
    queue = LearningQueue()
    
    success = queue.approve(
        candidate_id=args.candidate_id,
        reviewed_by=args.reviewer or "manual",
        notes=args.notes
    )
    
    if success:
        print(f"\n✓ Approved candidate: {args.candidate_id[:8]}")
        if args.notes:
            print(f"  Notes: {args.notes}")
    else:
        print(f"\n✗ Could not find candidate: {args.candidate_id}")
        sys.exit(1)


def cmd_reject(args):
    """Reject a candidate"""
    queue = LearningQueue()
    
    success = queue.reject(
        candidate_id=args.candidate_id,
        reviewed_by=args.reviewer or "manual",
        notes=args.notes
    )
    
    if success:
        print(f"\n✓ Rejected candidate: {args.candidate_id[:8]}")
        if args.notes:
            print(f"  Notes: {args.notes}")
    else:
        print(f"\n✗ Could not find candidate: {args.candidate_id}")
        sys.exit(1)


def cmd_auto_approve(args):
    """Auto-approve high complexity candidates"""
    queue = LearningQueue()
    
    print(f"\nAuto-approving candidates with complexity >= {args.threshold}...")
    
    count = queue.auto_approve_high_complexity(threshold=args.threshold)
    
    print(f"\n✓ Auto-approved {count} candidates")


def cmd_test_detection(args):
    """Test complexity detection on a prompt"""
    from simulation.prompt_manager import PromptComplexityAnalyzer
    
    analyzer = PromptComplexityAnalyzer()
    
    print(f"\nAnalyzing prompt complexity...")
    print(f"Prompt: {args.prompt[:100]}...")
    
    metrics = analyzer.analyze(args.prompt)
    
    print(f"\n{'='*60}")
    print("Complexity Analysis")
    print(f"{'='*60}")
    print(f"Overall Score:  {metrics.overall_score:.3f}")
    print(f"  Length:       {metrics.length_score:.3f}")
    print(f"  Structure:    {metrics.structure_score:.3f}")
    print(f"  Domain:       {metrics.domain_score:.3f}")
    print(f"  Ambiguity:    {metrics.ambiguity_score:.3f}")
    print(f"{'='*60}")
    
    if metrics.is_complex():
        print("Result: COMPLEX (would be candidate for learning)")
    else:
        print("Result: SIMPLE (normal processing)")


def main():
    parser = argparse.ArgumentParser(
        description="Manage learning queue for rnj-L simulation",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s list --status pending           # List pending candidates
  %(prog)s list --detailed                # List with full details
  %(prog)s stats                          # Show statistics
  %(prog)s approve <id> --notes "Good"    # Approve candidate
  %(prog)s reject <id> --notes "Too specific"  # Reject candidate
  %(prog)s auto-approve --threshold 0.8   # Auto-approve high complexity
  %(prog)s test "Create a complex..."     # Test complexity detection
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    # List command
    list_parser = subparsers.add_parser('list', help='List candidates')
    list_parser.add_argument('--status', choices=['pending', 'approved', 'all'], 
                             default='pending', help='Filter by status')
    list_parser.add_argument('--limit', type=int, default=20, help='Maximum to show')
    list_parser.add_argument('--detailed', action='store_true', help='Show full details')
    
    # Stats command
    stats_parser = subparsers.add_parser('stats', help='Show statistics')
    
    # Approve command
    approve_parser = subparsers.add_parser('approve', help='Approve a candidate')
    approve_parser.add_argument('candidate_id', help='Candidate ID to approve')
    approve_parser.add_argument('--reviewer', help='Who is reviewing')
    approve_parser.add_argument('--notes', help='Approval notes')
    
    # Reject command
    reject_parser = subparsers.add_parser('reject', help='Reject a candidate')
    reject_parser.add_argument('candidate_id', help='Candidate ID to reject')
    reject_parser.add_argument('--reviewer', help='Who is reviewing')
    reject_parser.add_argument('--notes', help='Rejection notes')
    
    # Auto-approve command
    auto_parser = subparsers.add_parser('auto-approve', help='Auto-approve high complexity')
    auto_parser.add_argument('--threshold', type=float, default=0.8, 
                          help='Complexity threshold for auto-approval')
    
    # Test detection command
    test_parser = subparsers.add_parser('test', help='Test complexity detection')
    test_parser.add_argument('prompt', help='Prompt to analyze')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Route to command handler
    commands = {
        'list': cmd_list,
        'stats': cmd_stats,
        'approve': cmd_approve,
        'reject': cmd_reject,
        'auto-approve': cmd_auto_approve,
        'test': cmd_test_detection,
    }
    
    commands[args.command](args)


if __name__ == '__main__':
    main()
