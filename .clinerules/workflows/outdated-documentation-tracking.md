# Outdated Documentation Tracking Workflow

## Overview
This workflow provides procedures for identifying, tracking, and updating outdated documentation in the project.

## Identification Process

### Automatic Detection
1. **Timestamp Check**: Compare file modification dates with last project release
2. **Content Analysis**: Look for deprecated terms, outdated APIs, or old versions
3. **Link Validation**: Check for broken links and outdated references

### Manual Detection
1. **User Reports**: When user identifies outdated documentation
2. **Code Review**: During development, identify documentation that needs updates
3. **Release Notes**: Check what features/changes need documentation updates

## Tracking System

### Status Indicators
- **OUTDATED**: Documentation needs complete rewrite
- **NEEDS_UPDATE**: Documentation needs minor updates
- **REVIEW**: Documentation needs technical review
- **ARCHIVED**: Documentation is no longer relevant

### Tracking File Structure
```
.clinerules/tracking/
├── outdated-documents.json
├── update-requests.json
└── review-queue.json
```

## Update Procedures

### When Outdated Documentation is Identified
1. **Mark Status**: Add `OUTDATED` prefix to filename
2. **Create Issue**: Log in tracking system with details
3. **Assign Priority**: Critical/High/Medium/Low based on impact
4. **Set Deadline**: Based on priority and project timeline

### Update Process
1. **Research**: Gather current information and requirements
2. **Draft**: Create new documentation with `NEW` prefix
3. **Review**: Technical and user review
4. **Publish**: Replace outdated with new documentation
5. **Archive**: Move old documentation to archive folder

## Priority Guidelines

### Critical
- Security-related documentation
- API documentation for released features
- User guides for core functionality

### High
- Feature documentation for recent releases
- Development setup guides
- Troubleshooting documentation

### Medium
- Best practices documentation
- Advanced feature guides
- Integration documentation

### Low
- Historical documentation
- Deprecated feature documentation
- Optional feature documentation

## Review Process

### Technical Review
- Verify technical accuracy
- Check code examples
- Validate API references
- Test procedures

### User Review
- Verify clarity and completeness
- Check for user-friendly language
- Validate step-by-step instructions
- Test user workflows

## Automation Tools

### Scripts
- `scripts/check-documentation-status.js`
- `scripts/update-documentation-tracker.js`
- `scripts/generate-documentation-report.js`

### Scheduled Tasks
- Weekly status reports
- Monthly update summaries
- Quarterly comprehensive reviews

## Reporting

### Status Reports
- Number of outdated documents
- Update completion rates
- Average update time
- Documentation coverage percentage

### Quality Metrics
- Accuracy rate
- User satisfaction score
- Update frequency
- Documentation freshness index