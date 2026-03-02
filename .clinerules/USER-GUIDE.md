# Documentation System User Guide

## Quick Start

### 1. Check System Status
```bash
node .clinerules/scripts/workflow-engine.js --status
```

### 2. Start New Documentation Analysis
```bash
# Standard priority
node .clinerules/scripts/workflow-engine.js --start --priority medium

# High priority (urgent)
node .clinerules/scripts/workflow-engine.js --start --priority high

# Low priority (background)
node .clinerules/scripts/workflow-engine.js --start --priority low
```

### 3. Monitor Progress
```bash
# Check current status
node .clinerules/scripts/workflow-engine.js --status

# Generate detailed report
node .clinerules/scripts/workflow-engine.js --report --format json
```

## Common Tasks

### Create New Documentation
```bash
node .clinerules/scripts/cli.js create docs/new-feature.md "Content of the new feature documentation"
```

### Review Existing Documentation
```bash
# Mark as outdated
node .clinerules/scripts/cli.js outdated docs/old-feature.md

# Start review
node .clinerules/scripts/cli.js start 123456

# Complete review
node .clinerules/scripts/cli.js complete 123456 "Review completed successfully"
```

### Get Help
```bash
# Workflow engine help
node .clinerules/scripts/workflow-engine.js --help

# CLI help
node .clinerules/scripts/cli.js --help
```

## System Components

- **Workflow Engine**: Main orchestrator (`workflow-engine.js`)
- **Decision Engine**: Intelligent processing (`decision-engine.js`)
- **CLI Interface**: Command-line tools (`cli.js`)
- **Dashboard**: Monitoring and reporting (`dashboard.js`)

## Important Notes

- All temporary files go in `.clinerules/` directory
- System may ask questions via QTU interface - answer them
- Check status regularly during long-running processes
- Use `--stop` to safely halt any running workflow