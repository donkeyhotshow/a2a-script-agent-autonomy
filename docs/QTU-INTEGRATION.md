# QTU Integration Guide

## Overview

This document provides comprehensive guidance on integrating QTU (Question to User) functionality into the Cline
Documentation Review System, enabling interactive user decision points throughout the workflow.

## What is QTU?

QTU (Question to User) is an interactive system that allows the workflow to pause and ask users questions at key
decision points, collecting their input to guide the processing flow. This enables:

- **Interactive Decision Making**: Users can provide input at critical workflow junctures
- **Customizable Processing**: Workflow behavior can be adjusted based on user preferences
- **Enhanced User Experience**: Users feel more involved in the documentation review process
- **Flexible Configuration**: Different questions and options for different workflow phases

## Integration Architecture

### Core Components

1. **QTUIntegration Class** (`.clinerules/scripts/qtu-integration.js`)
    - Main integration wrapper for QTU functionality
    - Handles QTU script execution and response parsing
    - Manages user answer history and session data

2. **WorkflowDecisionPoints Class** (`.clinerules/scripts/qtu-integration.js`)
    - Provides workflow-specific decision point implementations
    - Maps workflow phases to appropriate user questions
    - Handles phase-specific context and decision logic

3. **Workflow Engine Integration** (`.clinerules/scripts/workflow-engine.js`)
    - Integrates QTU calls at key workflow decision points
    - Combines automated decisions with user input
    - Manages user decision persistence and logging

### Integration Points

#### Phase 1: Discovery Decision Points

```javascript
// Resource Assessment with User Input
async performResourceAssessment() {
    const context = {
        systemCapacity: this.assessSystemCapacity(),
        availableMemory: this.getAvailableMemory(),
        processingTime: this.estimateProcessingTime()
    };

    // Get user decisions if QTU is available
    let userDecisions = {};
    if (this.qtuIntegration) {
        console.log('\n🎯 Getting user input for resource assessment...');
        userDecisions = await this.qtuIntegration.discoveryDecisions(context);
        console.log('✅ User decisions collected');
    }

    const decision = await this.decisionEngine.makeDecision('discovery', 'resource_assessment', context);
    
    // Combine automated and user decisions
    const finalDecision = {
        ...decision,
        userDecisions: userDecisions
    };
}
```

#### Phase 2: Processing Decision Points

```javascript
// Medium Priority Processing with User Input
async processMediumPriorityDocuments() {
    // Get user decisions for processing if QTU is available
    let userDecisions = {};
    if (this.qtuIntegration) {
        console.log('\n🎯 Getting user input for medium priority processing...');
        userDecisions = await this.qtuIntegration.processingDecisions({
            processingMode: 'medium',
            documentCount: mediumPriorityDocs.length
        });
        console.log('✅ User decisions collected');
    }
}
```

#### Phase 4: QA Decision Points

```javascript
// Quality Metrics Review with User Input
async reviewQualityMetrics() {
    // Get user decisions for QA if QTU is available
    let userDecisions = {};
    if (this.qtuIntegration) {
        console.log('\n🎯 Getting user input for QA metrics review...');
        userDecisions = await this.qtuIntegration.qaDecisions(context);
        console.log('✅ User decisions collected');
    }
}
```

## User Decision Points

### Discovery Phase Decisions

#### 1. Processing Mode Selection

**When**: Large inventory detected (> 50 documents)
**Question**: "Выберите режим обработки документов:"
**Options**:

- Последовательная обработка (качество)
- Пакетная обработка (скорость)
- Гибридный режим (баланс)

**Purpose**: Allow users to choose processing strategy based on their priorities

#### 2. Priority Override

**When**: Many existing reviews detected (> 30)
**Question**: "Обнаружено много существующих ревью. Что приоритетнее?"
**Options**:

- Сначала обработать новые документы
- Сначала привести в порядок существующие
- Смешанный подход

**Purpose**: Let users decide focus when multiple priorities compete

#### 3. Quality Threshold

**Question**: "Установите минимальный порог качества (в процентах):"
**Options**: 70%, 80%, 90%, 95%
**Purpose**: Allow users to set quality standards

### Processing Phase Decisions

#### 1. Batch Size Selection

**When**: Batch or hybrid processing mode selected
**Question**: "Выберите размер пачки для обработки:"
**Options**:

- Маленькая (5 документов)
- Средняя (10 документов)
- Большая (20 документов)

**Purpose**: Optimize processing efficiency based on user preference

#### 2. Error Handling Strategy

**Question**: "Как поступать при ошибках обработки?"
**Options**:

- Остановить и уведомить
- Пропустить и продолжить
- Автоматически повторить

**Purpose**: Define error handling behavior

#### 3. Review Type Selection

**Question**: "Выберите тип ревью для документов:"
**Options**:

- Техническое ревью
- Контент-ревью
- Полное ревью
- Быстрое ревью

**Purpose**: Customize review thoroughness

### Organization Phase Decisions

#### 1. Directory Structure

**Question**: "Выберите структуру каталогов:"
**Options**:

- По типу документа
- По приоритету
- По дате создания
- Смешанная структура

**Purpose**: Organize documents according to user preference

#### 2. Cross-Reference Strategy

**Question**: "Стратегия создания перекрестных ссылок:"
**Options**:

- Только между документами одного типа
- Между всеми связанными документами
- Только для высокоприоритетных документов

**Purpose**: Control cross-reference creation scope

#### 3. Cleanup Level

**Question**: "Уровень очистки устаревших документов:"
**Options**:

- Только архивация
- Архивация + удаление дубликатов
- Полная очистка

**Purpose**: Define cleanup aggressiveness

### QA Phase Decisions

#### 1. Quality Metrics Focus

**Question**: "На чем сосредоточиться при проверке качества?"
**Options**:

- Техническая точность
- Читаемость и понятность
- Структура и организация
- Все аспекты

**Purpose**: Focus quality verification efforts

#### 2. Manual Review Threshold

**Question**: "Порог для ручного ревью (если качество ниже):"
**Options**: 70%, 80%, 90%, Не использовать ручное ревью
**Purpose**: Set quality threshold for manual intervention

#### 3. Final Report Format

**Question**: "Формат финального отчета:"
**Options**: JSON, Markdown, HTML, Текстовый файл
**Purpose**: Choose report format

## CLI Usage

### Basic QTU Commands

```bash
# Ask a simple question
node .clinerules/scripts/cli.js ask "How are you feeling today?"

# Ask with multiple choice options
node .clinerules/scripts/cli.js ask "Choose option" "Option1,Option2,Option3"

# Ask with custom timeout (in seconds)
node .clinerules/scripts/cli.js ask "Quick question" "Yes,No" 30
```

### QTU Testing

```bash
# Run comprehensive QTU integration test
node .clinerules/scripts/cli.js qtu-test
```

### Workflow Commands with QTU

```bash
# Start workflow (will include user decision points)
node .clinerules/scripts/workflow-engine.js --start --priority medium

# Check workflow status
node .clinerules/scripts/workflow-engine.js --status

# Execute current step (may trigger user questions)
node .clinerules/scripts/workflow-engine.js --execute
```

## Configuration

### QTU Script Path

The QTU integration expects the QTU PowerShell script at:

```
C:\workspace\bin\qtu.ps1
```

### Configuration Options

QTU integration can be configured through:

1. **Timeout Settings**: Default 60 seconds, configurable per question
2. **Port Settings**: Default 8765 for PHP server
3. **Session Management**: Automatic session ID generation
4. **Answer History**: Persistent storage in `.clinerules/user-answers.json`

### Error Handling

The integration includes comprehensive error handling:

- **QTU Not Available**: Graceful fallback when QTU script is missing
- **User Timeout**: Automatic timeout handling with appropriate messaging
- **Invalid Responses**: Validation and error reporting
- **File System Errors**: Proper error propagation and logging

## Implementation Details

### Answer History Management

```javascript
// Save user answers
async saveUserAnswer(question, answer, response) {
    const answersData = JSON.parse(await fs.readFile(this.answersFile, 'utf8'));
    
    const questionId = response.questionId;
    answersData.answers[questionId] = answer;
    answersData.questions[questionId] = {
        question: question,
        timestamp: response.timestamp,
        type: options ? 'multiple_choice' : 'text'
    };
    answersData.lastUpdated = new Date().toISOString();

    await fs.writeFile(this.answersFile, JSON.stringify(answersData, null, 2));
}
```

### Session Management

```javascript
// Generate unique session ID
this.sessionId = `cline_${Date.now()}`;

// Initialize answers file
const initialData = {
    sessionId: this.sessionId,
    answers: {},
    questions: {},
    lastUpdated: new Date().toISOString()
};
```

### Integration with Workflow Engine

```javascript
// Initialize QTU integration
async initializeQTU() {
    try {
        const { WorkflowDecisionPoints } = require('./qtu-integration.js');
        this.qtuIntegration = new WorkflowDecisionPoints();
        
        const initialized = await this.qtuIntegration.initialize();
        if (initialized) {
            console.log('✅ QTU Integration initialized');
        } else {
            console.log('⚠️  QTU Integration not available');
            this.qtuIntegration = null;
        }
    } catch (error) {
        console.log('⚠️  QTU Integration not available:', error.message);
        this.qtuIntegration = null;
    }
}
```

## Best Practices

### 1. Question Design

- **Clear and Concise**: Questions should be easy to understand
- **Appropriate Options**: Provide relevant choices for the context
- **Reasonable Timeout**: Set appropriate timeouts (30-60 seconds typical)
- **Fallback Behavior**: Handle cases where users don't respond

### 2. Integration Points

- **Strategic Placement**: Ask questions at natural decision points
- **Context Awareness**: Use workflow context to inform questions
- **User Experience**: Don't interrupt flow unnecessarily
- **Progressive Disclosure**: Ask follow-up questions based on previous answers

### 3. Error Handling

- **Graceful Degradation**: Continue workflow if QTU is unavailable
- **Clear Error Messages**: Inform users of issues clearly
- **Logging**: Log all QTU interactions for debugging
- **Validation**: Validate user responses appropriately

### 4. Performance

- **Asynchronous Operations**: Use async/await for QTU calls
- **Timeout Management**: Set reasonable timeouts to avoid blocking
- **Resource Management**: Clean up QTU resources when done
- **Caching**: Cache frequently asked questions when appropriate

## Troubleshooting

### Common Issues

#### QTU Script Not Found

```bash
❌ QTU Integration not available: Error: ENOENT: no such file or directory
```

**Solution**: Ensure QTU PowerShell script is at `C:\workspace\bin\qtu.ps1`

#### User Timeout

```bash
⏰ User did not respond within timeout
```

**Solution**: Increase timeout or check if user interface is accessible

#### Invalid JSON Response

```bash
❌ Error asking user: Unexpected token in JSON
```

**Solution**: Check QTU script output format and JSON parsing

#### Session Issues

```bash
❌ Session expired or invalid
```

**Solution**: Restart workflow or check session file permissions

### Debug Mode

Enable debug logging by adding console.log statements in QTU integration:

```javascript
// Add debug logging
console.log('🔍 QTU Integration debug:', {
    question,
    options,
    timeout,
    sessionId: this.sessionId
});
```

### Testing

Use the built-in test command to verify QTU functionality:

```bash
node .clinerules/scripts/cli.js qtu-test
```

This runs through all QTU integration scenarios and reports results.

## Future Enhancements

### Potential Improvements

1. **Rich Question Types**: Support for more complex question types
2. **Conditional Questions**: Questions that depend on previous answers
3. **Answer Validation**: More sophisticated answer validation
4. **Integration with External Systems**: Connect to external decision systems
5. **Machine Learning**: Learn from user decisions to improve automation

### Extension Points

The QTU integration is designed to be extensible:

- **New Question Types**: Easy to add new question types
- **Custom Decision Logic**: Workflow-specific decision logic
- **Integration with Other Systems**: Connect to external APIs
- **Advanced Analytics**: Track and analyze user decision patterns

## Conclusion

The QTU integration provides a powerful way to make the Cline Documentation Review System more interactive and
user-friendly. By strategically placing user decision points throughout the workflow, users can guide the processing
according to their specific needs and preferences.

The integration is designed to be robust, with comprehensive error handling and graceful fallbacks. It provides a solid
foundation for interactive workflow management while maintaining the system's reliability and performance.

For questions or issues with QTU integration, refer to the troubleshooting section or run the built-in test suite to
diagnose problems.