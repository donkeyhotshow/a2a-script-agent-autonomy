# Task 21: Implement Missing Systems

## Goal
Реализовать системы, необходимые для симуляций но отсутствующие в сервере.

## Priority P0 (Critical)

### 1. Task Capture System
**Needed for**: coder-smart, task-decomposition
**Files to create**:
- `src/services/task-capture.service.ts`
- `src/actions/handlers/capture-task.ts`

**Interface**:
```typescript
interface TaskCaptureService {
  capture(input: string): Promise<CapturedTask>;
  structure(task: CapturedTask): Promise<StructuredTask>;
}
```

### 2. Task Decomposition Engine  
**Needed for**: task-decomposition
**Files**:
- `src/services/task-decomposition.service.ts`
- `src/actions/handlers/decompose-*.ts`

**Interface**:
```typescript
interface TaskDecompositionService {
  decomposeToSubtasks(task: StructuredTask): Promise<Subtask[]>;
  decomposeToSteps(subtask: Subtask): Promise<Step[]>;
  decomposeToActions(step: Step): Promise<Action[]>;
}
```

### 3. Document Writer Service
**Needed for**: coder-smart, task-decomposition
**Files**:
- `src/services/document-writer.service.ts`
- `src/actions/handlers/write-doc.ts`

## Priority P1 (High)

### 4. Clarification System
- `src/services/clarification.service.ts`
- `src/actions/handlers/rag-clarify.ts`

### 5. Research Planning System
- `src/services/research-planning.service.ts`
- `src/actions/handlers/rag-research-plan.ts`

### 6. Checklist Manager
- `src/services/checklist.service.ts`
- `src/actions/handlers/checklist.ts`

## Acceptance Criteria
- [ ] Все P0 системы реализованы
- [ ] Action handlers зарегистрированы в registry
- [ ] Тесты для каждой системы
- [ ] Симуляции coder-smart и task-decomposition проходят

## 21. Entity Recognizer Service Refactoring

**Status**: ✅ IMPLEMENTED
**Priority**: HIGH
**Estimated Time**: 4-6 hours

### Description
The `entity-recognizer.service.ts` file has been successfully refactored to integrate with RAG and provide smart file selection capabilities. This service now extracts useful parts for RAG integration and removes unused or redundant code.

### Current State
- File exists at `a2a-server/src/services/entity-recognizer.service.ts`
- Contains comprehensive entity recognition for PHP and Vue files
- Supports models, controllers, services, requests, components, pages
- Has extensive regex patterns and helper functions
- **NEW**: Integrated with RAG for smart file selection
- **NEW**: Modular structure for RAG integration
- **NEW**: Comprehensive tests and documentation

### Key Improvements Implemented

#### 1. ✅ RAG Integration
- Extracted code entity recognition capabilities for RAG integration
- Created modular structure for smart file selection
- Added comprehensive tests for extracted functionality
- Documented the refactored service and its integration points

#### 2. ✅ Smart File Selection
- Implemented intelligent file selection based on entity types
- Created filtering mechanisms for relevant files
- Added scoring system for file importance
- Integrated with existing file selection workflows

#### 3. ✅ Code Cleanup
- Removed unused or redundant code
- Optimized regex patterns for performance
- Improved error handling and logging
- Added proper TypeScript types and interfaces

### Dependencies
- ✅ RAG integration service (Task 1) - INTEGRATED
- ✅ File selection service (Task 2) - INTEGRATED  
- ✅ Documentation manager (Task 3) - INTEGRATED

### Implementation Steps Completed
1. ✅ Analyzed current entity recognizer functionality
2. ✅ Identified useful parts for RAG integration
3. ✅ Extracted and modularized core functionality
4. ✅ Removed unused or redundant code
5. ✅ Updated dependencies and imports
6. ✅ Added comprehensive tests
7. ✅ Documented the refactored service

### Files Modified
- ✅ `a2a-server/src/services/entity-recognizer.service.ts` - REFACTORED
- ✅ `a2a-server/src/services/rag-integration.ts` - INTEGRATED
- ✅ `a2a-server/src/services/file-selection.ts` - INTEGRATED
- ✅ `a2a-server/src/services/` - MODULAR STRUCTURE CREATED

### Testing Requirements Met
- ✅ Unit tests for entity recognition functionality
- ✅ Integration tests with RAG service
- ✅ Performance tests for file selection
- ✅ Error handling tests
- ✅ Type validation tests

### Integration Points
- **RAG Integration**: Entity recognition results feed into RAG search and analysis
- **File Selection**: Smart filtering based on entity types and importance scoring
- **Documentation**: Entity metadata used for documentation generation
- **Workflow**: Integrated into the main processing workflow

### Benefits Achieved
- **Enhanced RAG**: Entity-aware search and context understanding
- **Smart Selection**: Intelligent file filtering based on entity relevance
- **Performance**: Optimized regex patterns and modular architecture
- **Maintainability**: Clean separation of concerns and comprehensive testing
- **Extensibility**: Easy to add new entity types and recognition patterns

### Next Steps
- Monitor performance in production
- Add more entity types as needed
- Enhance scoring algorithms based on usage patterns
- Integrate with additional workflow components
