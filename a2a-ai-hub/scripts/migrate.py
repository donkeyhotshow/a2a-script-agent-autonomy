#!/usr/bin/env python3
"""
Migration script for rnj-L simulation data
Handles version upgrades and data format changes
"""

import os
import sys
import json
import shutil
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from simulation import get_config, __version__


def get_current_version():
    """Get current data version from config"""
    config_path = get_config().config_path
    
    if os.path.exists(config_path):
        with open(config_path, 'r') as f:
            data = json.load(f)
            return data.get('version', '0.0.0')
    return '0.0.0'


def set_version(version):
    """Set data version in config"""
    config = get_config()
    config.save()
    
    # Reload and add version
    with open(config.config_path, 'r') as f:
        data = json.load(f)
    
    data['version'] = version
    
    with open(config.config_path, 'w') as f:
        json.dump(data, f, indent=2)


def migrate_0_0_0_to_1_0_0():
    """Migration from 0.0.0 to 1.0.0"""
    print("Migrating from 0.0.0 to 1.0.0...")
    
    config = get_config()
    
    # Ensure all directories exist
    os.makedirs(config.records_path, exist_ok=True)
    os.makedirs(config.backup_path, exist_ok=True)
    
    # Check for old proxy_logs format and migrate if needed
    proxy_logs = Path('proxy_logs')
    if proxy_logs.exists():
        print(f"  Found proxy_logs at {proxy_logs.absolute()}")
        print("  Note: proxy_logs are kept separate from simulation_data")
    
    print("  ✓ Migration complete")


def check_and_migrate():
    """Check current version and run necessary migrations"""
    current = get_current_version()
    target = __version__
    
    print(f"\nCurrent data version: {current}")
    print(f"Target version: {target}")
    
    if current == target:
        print("  ✓ Already up to date")
        return
    
    migrations = [
        ('0.0.0', '1.0.0', migrate_0_0_0_to_1_0_0),
    ]
    
    for from_ver, to_ver, migrate_func in migrations:
        if current == from_ver:
            print(f"\nRunning migration {from_ver} → {to_ver}...")
            try:
                migrate_func()
                set_version(to_ver)
                current = to_ver
                print(f"  ✓ Migrated to {to_ver}")
            except Exception as e:
                print(f"  ✗ Migration failed: {e}")
                raise
    
    if current != target:
        print(f"\n⚠ Warning: Could not reach target version {target}")
        print(f"  Current version: {current}")
    else:
        print(f"\n✓ All migrations complete. At version {target}")


def backup_before_migration():
    """Create backup before migration"""
    print("\nCreating pre-migration backup...")
    
    from simulation.storage import ConversationStore
    store = ConversationStore()
    backup_path = store.backup()
    
    print(f"  ✓ Backup created: {backup_path}")
    return backup_path


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Migrate rnj-L simulation data")
    parser.add_argument('--skip-backup', action='store_true', help='Skip pre-migration backup')
    parser.add_argument('--version', action='store_true', help='Show current version and exit')
    
    args = parser.parse_args()
    
    if args.version:
        print(f"System version: {__version__}")
        print(f"Data version: {get_current_version()}")
        return
    
    print(f"{'='*60}")
    print(f"rnj-L Simulation Migration Tool")
    print(f"{'='*60}")
    
    if not args.skip_backup:
        backup_before_migration()
    
    try:
        check_and_migrate()
    except Exception as e:
        print(f"\n✗ Migration failed: {e}")
        sys.exit(1)
    
    print(f"\n{'='*60}")
    print(f"Migration complete")
    print(f"{'='*60}")


if __name__ == '__main__':
    main()
