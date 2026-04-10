# Unnamed CodeViz Diagram

```mermaid
graph TD

    begin-diagram-generation["Generate Base Diagram<br>[External]"]

```
# Unnamed CodeViz Diagram

```mermaid
graph TD

    subgraph a2a_client_storage_architecture.cv::storage_package["**@a2a-client/storage Package**<br>[External]"]
        a2a_client_storage_architecture.cv::index_ts["**index.ts**<br>diagram/proba-servera-diagram.txt `index.ts`"]
        subgraph a2a_client_storage_architecture.cv::project_management["**УПРАВЛЕНИЕ ПРОЕКТАМИ (Project Management)**<br>[External]"]
            a2a_client_storage_architecture.cv::projects_ts["**projects.ts**<br>diagram/proba-servera-diagram.txt `projects.ts`"]
            a2a_client_storage_architecture.cv::project_sessions_ts["**projectSessions.ts**<br>diagram/proba-servera-diagram.txt `projectSessions.ts`"]
            a2a_client_storage_architecture.cv::new_sessions_ts["**newSessions.ts**<br>diagram/proba-servera-diagram.txt `newSessions.ts`"]
        end
        subgraph a2a_client_storage_architecture.cv::session_core["**ЯДРО СЕССИЙ (Session Core)**<br>[External]"]
            a2a_client_storage_architecture.cv::session_store_ts["**session-store.ts**<br>diagram/proba-servera-diagram.txt `session-store.ts`"]
            a2a_client_storage_architecture.cv::adr_compliance_state_ts["**adrComplianceState.ts**<br>diagram/proba-servera-diagram.txt `adrComplianceState.ts`"]
            a2a_client_storage_architecture.cv::session_index_store_ts["**session-index-store.ts**<br>diagram/proba-servera-diagram.txt `session-index-store.ts`"]
            a2a_client_storage_architecture.cv::session_step_io_ts["**session-step-io.ts**<br>diagram/proba-servera-diagram.txt `session-step-io.ts`"]
            a2a_client_storage_architecture.cv::session_promise_read_ts["**session-promise-read.ts**<br>diagram/proba-servera-diagram.txt `session-promise-read.ts`"]
            %% Edges at this level (grouped by source)
            a2a_client_storage_architecture.cv::session_store_ts["**session-store.ts**<br>diagram/proba-servera-diagram.txt `session-store.ts`"] -->|"Обновляет индекс после записи (Updates index after write)"| a2a_client_storage_architecture.cv::session_index_store_ts["**session-index-store.ts**<br>diagram/proba-servera-diagram.txt `session-index-store.ts`"]
            a2a_client_storage_architecture.cv::session_store_ts["**session-store.ts**<br>diagram/proba-servera-diagram.txt `session-store.ts`"] -->|"Использует для I/O шагов (Uses for step I/O)"| a2a_client_storage_architecture.cv::session_step_io_ts["**session-step-io.ts**<br>diagram/proba-servera-diagram.txt `session-step-io.ts`"]
            a2a_client_storage_architecture.cv::session_store_ts["**session-store.ts**<br>diagram/proba-servera-diagram.txt `session-store.ts`"] -->|"Зависит от ADR-статуса (Depends on ADR status)"| a2a_client_storage_architecture.cv::adr_compliance_state_ts["**adrComplianceState.ts**<br>diagram/proba-servera-diagram.txt `adrComplianceState.ts`"]
        end
        subgraph a2a_client_storage_architecture.cv::utilities_primitives["**УТИЛИТЫ И ПРИМИТИВЫ (Utilities & Primitives)**<br>[External]"]
            a2a_client_storage_architecture.cv::session_paths_ts["**session-paths.ts**<br>diagram/proba-servera-diagram.txt `session-paths.ts`"]
            a2a_client_storage_architecture.cv::session_id_ts["**session-id.ts**<br>diagram/proba-servera-diagram.txt `session-id.ts`"]
            a2a_client_storage_architecture.cv::session_sort_mjs["**session-sort.mjs**<br>diagram/proba-servera-diagram.txt `session-sort.mjs`"]
            a2a_client_storage_architecture.cv::session_stage_derive_mjs["**session-stage-derive.mjs**<br>diagram/proba-servera-diagram.txt `session-stage-derive.mjs`"]
            a2a_client_storage_architecture.cv::promise_status_ts["**promise-status.ts**<br>diagram/proba-servera-diagram.txt `promise-status.ts`"]
            a2a_client_storage_architecture.cv::kv_ts["**kv.ts**<br>diagram/proba-servera-diagram.txt `kv.ts`"]
            a2a_client_storage_architecture.cv::root_ts["**root.ts**<br>diagram/proba-servera-diagram.txt `root.ts`"]
            %% Edges at this level (grouped by source)
            a2a_client_storage_architecture.cv::session_paths_ts["**session-paths.ts**<br>diagram/proba-servera-diagram.txt `session-paths.ts`"] -->|"Строит путь на основе ID (Builds path based on ID)"| a2a_client_storage_architecture.cv::session_id_ts["**session-id.ts**<br>diagram/proba-servera-diagram.txt `session-id.ts`"]
        end
        %% Edges at this level (grouped by source)
        a2a_client_storage_architecture.cv::index_ts["**index.ts**<br>diagram/proba-servera-diagram.txt `index.ts`"] -->|"Взаимодействует через (Interacts via)"| a2a_client_storage_architecture.cv::project_management["**УПРАВЛЕНИЕ ПРОЕКТАМИ (Project Management)**<br>[External]"]
        a2a_client_storage_architecture.cv::project_management["**УПРАВЛЕНИЕ ПРОЕКТАМИ (Project Management)**<br>[External]"] -->|"Использует (Uses)"| a2a_client_storage_architecture.cv::session_core["**ЯДРО СЕССИЙ (Session Core)**<br>[External]"]
        a2a_client_storage_architecture.cv::session_core["**ЯДРО СЕССИЙ (Session Core)**<br>[External]"] -->|"Использует (Uses)"| a2a_client_storage_architecture.cv::utilities_primitives["**УТИЛИТЫ И ПРИМИТИВЫ (Utilities & Primitives)**<br>[External]"]
        a2a_client_storage_architecture.cv::new_sessions_ts["**newSessions.ts**<br>diagram/proba-servera-diagram.txt `newSessions.ts`"] -->|"Генерирует ID (Generates ID)"| a2a_client_storage_architecture.cv::session_id_ts["**session-id.ts**<br>diagram/proba-servera-diagram.txt `session-id.ts`"]
        a2a_client_storage_architecture.cv::session_store_ts["**session-store.ts**<br>diagram/proba-servera-diagram.txt `session-store.ts`"] -->|"Использует пути для записи/чтения (Uses paths for R/W)"| a2a_client_storage_architecture.cv::session_paths_ts["**session-paths.ts**<br>diagram/proba-servera-diagram.txt `session-paths.ts`"]
        a2a_client_storage_architecture.cv::session_store_ts["**session-store.ts**<br>diagram/proba-servera-diagram.txt `session-store.ts`"] -->|"Использует ID для записи/чтения (Uses ID for R/W)"| a2a_client_storage_architecture.cv::session_id_ts["**session-id.ts**<br>diagram/proba-servera-diagram.txt `session-id.ts`"]
        a2a_client_storage_architecture.cv::promise_status_ts["**promise-status.ts**<br>diagram/proba-servera-diagram.txt `promise-status.ts`"] -->|"Используется для статуса (Used for status)"| a2a_client_storage_architecture.cv::adr_compliance_state_ts["**adrComplianceState.ts**<br>diagram/proba-servera-diagram.txt `adrComplianceState.ts`"]
    end

```
---
*Generated by [CodeViz.ai](https://codeviz.ai) on 4/11/2026, 1:39:19 AM*
