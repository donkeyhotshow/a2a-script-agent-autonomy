# Task 19: Server Systems Inventory Check

## Goal
Проверить существование core систем сервера и сопоставить с требованиями симуляций.

## Checklist

### Core Systems Verification
- [ ] **Form Handler** - Проверить `src/actions/handlers/form-handler.ts`
  - Status: EXISTS / NOT EXISTS
  - Notes: 
- [ ] **RAG Service** - Проверить `src/services/rag-service.ts` или аналог
  - Status: EXISTS / NOT EXISTS  
  - Integration: Проверить использование в обработчиках
- [ ] **File Service** - Проверить `src/services/file-service.ts`
  - read-file: EXISTS / NOT EXISTS
  - write-file: EXISTS / NOT EXISTS
- [ ] **Command Service** - Проверить `src/services/command-service.ts`
  - Status: EXISTS / NOT EXISTS
- [ ] **Script Engine** - Проверить `src/services/script-engine.ts`
  - Status: EXISTS / NOT EXISTS

### Potentially Unused Systems Audit
- [ ] **Neuron System** (`src/neurons/`)
  - Lines of code: посчитать
  - Used by simulations: NONE
  - Recommendation: MARK FOR REVIEW
- [ ] **Graph Store** (`src/services/graph-store.service.ts`)
  - Lines: ~7k
  - Used: NONE
  - Recommendation: MARK FOR REVIEW
- [ ] **Framework Extractor** (`src/services/framework-extractor.service.ts`)
  - Lines: ~9k
  - Used: NONE
  - Recommendation: MARK FOR REVIEW
- [ ] **Entity Recognizer** (`src/services/entity-recognizer.service.ts`)
  - Lines: ~21k
  - Used: NONE
  - Recommendation: MARK FOR REVIEW
- [ ] **Phase Machine** (`src/services/phase-machine.service.ts`)
  - Lines: ~14k
  - Used: NONE
  - Recommendation: MARK FOR REVIEW

### Coverage Report
Создать `docs/server-inventory-report.md` с таблицей:
| System | Exists | Used in Sims | Lines | Recommendation |

## Acceptance Criteria
- [ ] Полный список всех сервисов в `src/services/`
- [ ] Отметка @deprecated для систем не используемых в симуляциях
- [ ] Отчет о покрытии симуляций
