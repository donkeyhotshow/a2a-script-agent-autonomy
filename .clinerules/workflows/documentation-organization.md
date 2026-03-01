# Documentation Organization Workflow

## Overview
This workflow defines the proper organization of documentation in this project and provides procedures for updating outdated documentation.

## Documentation Types

### 1. Architecture Documentation
- **Location**: `docs/architecture/`
- **Purpose**: High-level system design, component relationships, data flow
- **Update Trigger**: When system architecture changes

### 2. API Documentation
- **Location**: `docs/api/`
- **Purpose**: API endpoints, request/response formats, authentication
- **Update Trigger**: When API changes

### 3. User Documentation
- **Location**: `docs/user/`
- **Purpose**: User guides, tutorials, how-to articles
- **Update Trigger**: When user-facing features change

### 4. Development Documentation
- **Location**: `docs/dev/`
- **Purpose**: Development setup, coding standards, contribution guidelines
- **Update Trigger**: When development processes change

### 5. Component Documentation
- **Location**: Within each package/component directory
- **Purpose**: Component-specific documentation, API references
- **Update Trigger**: When component functionality changes

## Documentation Status Tracking

### Outdated Documentation
- **Indicator**: `OUTDATED` prefix in filename or `<!-- OUTDATED -->` comment
- **Action**: Mark for review and update

### New Documentation
- **Indicator**: `NEW` prefix in filename or `<!-- NEW -->` comment
- **Action**: Review and integrate into existing documentation

## Update Procedures

### When User Says Documentation is Outdated
1. Identify the outdated documentation
2. Mark it with `OUTDATED` prefix
3. Create new documentation with `NEW` prefix
4. Notify user for review

### When User Says Documentation is New
1. Identify the new documentation
2. Review for accuracy and completeness
3. Integrate into existing documentation structure
4. Remove `NEW` prefix

## File Naming Conventions
- Use kebab-case for filenames
- Include version number if applicable
- Use descriptive names that indicate content

## Directory Structure Standards
```
docs/
├── architecture/
├── api/
├── user/
├── dev/
└── components/
    ├── a2a-client/
    └── a2a-server/
```

## Quality Standards
- All documentation must be up-to-date
- Code examples must be tested and working
- Screenshots must reflect current UI
- Links must be valid and working

## Review Process
1. Initial review by creator
2. Technical review by team member
3. User acceptance testing if applicable
4. Final approval and publication

## Maintenance Schedule
- Weekly review of documentation status
- Monthly audit of all documentation
- Quarterly comprehensive review