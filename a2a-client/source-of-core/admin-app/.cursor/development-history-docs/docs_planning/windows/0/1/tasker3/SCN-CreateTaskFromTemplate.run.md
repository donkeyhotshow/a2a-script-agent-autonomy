Хорошо, приступаю к симуляции тестирования `SCN-CreateTask.scenario.json` с учетом всех последних изменений.

**План симуляции:**

1. **Запуск и ввод типа задачи.**
2. **Создание основной задачи и FC-задачи.**
3. **Активация FC-задачи.**
4. **Последовательное "выполнение" инструкций для FC-задачи.**
5. **Выполнение нового PHP action-скрипта `ManageTaskCompletionAction.php`** (через шаг
   `FINALIZE_FC_AND_SETUP_MAIN_TASK`).
6. **Проверка статусов задач и перемещения файла FC-задачи.**
7. **Активация основной задачи.**
8. **Проверка финального сообщения.**

Я буду комментировать каждый этап и ожидаемые изменения в файловой системе и контексте.

---

**Симуляция Тестирования SCN-CreateTask.scenario.json**

**Предварительные условия:**

* Директория `script/engine/completed/` существует.
* PHP имеет права на чтение/запись/перемещение в `script/engine/task_definitions/` и `script/engine/completed/`.
* Счетчик `task_id_counter.json` существует или будет создан (предположим, он сброшен или начинается с нуля для чистоты
  теста).

**Этап 1: Начало сценария и ввод типа задачи**

* **Команда 1 (сброс, опционально):**
  ```bash
  php script/engine/invoke-scenario-engine.php --scenarioId SCN-CreateTask --resetProgress
  ```
  *Ожидание: Маркер прогресса для SCN-CreateTask удален. Статус "Inactive".*

* **Команда 2 (старт):**
  ```bash
  php script/engine/invoke-scenario-engine.php --scenarioId SCN-CreateTask
  ```
  *Ожидание: Сценарий запущен, остановлен на шаге `ASK_TASK_TYPE`.*
  *Вывод:*
  ```json
  {
      "status": "HaltedForInput",
      "currentStepId": "ASK_TASK_TYPE",
      "question": "Введите тип задачи (например WorkflowImprovement)",
      "contextIdentifier": "default",
      "nextCommand": "php script/engine/invoke-scenario-engine.php --scenarioId=SCN-CreateTask --userInputValue <your answer>..."
  }
  ```

**Этап 2: Пользователь вводит тип задачи (например, "Generic")**

* **Команда 3:**
  ```bash
  php script/engine/invoke-scenario-engine.php --scenarioId SCN-CreateTask --userInputValue Generic
  ```
  *Ожидание: Выполняются шаги `CREATE_TASK_FROM_TEMPLATE`, `VALIDATE_TASK_FILE`, `CREATE_FC_TASK`.*
  *Файловая система:*
    * Создан `script/engine/task_definitions/Generic-00001.json` (если счетчик был 0).
    * Создан `script/engine/task_definitions/Generic-00001-FullyCollectTaskData.json`. Статус: `Planned`.
      `fcTaskInstructions: []`.
      *Контекст содержит:* `taskFilePath` (путь к Generic-00001.json), `newTaskId` ("Generic-00001"), `fcTaskFilePath` (
      путь к FC-задаче), `fcTaskId` ("Generic-00001-FullyCollectTaskData").
      *Сценарий остановлен на `ASK_ACTIVATE_FC_TASK`.*
      *Вывод:*
  ```json
  {
      "status": "HaltedForInput",
      "currentStepId": "ASK_ACTIVATE_FC_TASK",
      "question": "Введите 'yes' для установки статуса задачи {{context.fcTaskFilePath}} в 'InProgress'",
      // ...
  }
  ```

**Этап 3: Пользователь активирует FC-задачу**

* **Команда 4:**
  ```bash
  php script/engine/invoke-scenario-engine.php --scenarioId SCN-CreateTask --userInputValue yes
  ```
  *Ожидание: Выполняется `DO_ACTIVATE_FC_TASK`, затем `DO_SET_INSTRUCTION_1`.*
  *Файловая система:*
    * `Generic-00001-FullyCollectTaskData.json`: статус изменен на `InProgress`.
    * `Generic-00001-FullyCollectTaskData.json`: `fcTaskInstructions` теперь содержит "Instruction 1: Review main task (
      Generic-00001) goals and linkedFiles.".
      *Контекст содержит:* `fcTaskStatus: "InProgress"`, `lastInstructionAdded: "Instruction 1..."`.
      *Сценарий остановлен на `ASK_CONFIRM_INSTRUCTION_1_COMPLETED`.*
      *Вывод:*
  ```json
  {
      "status": "HaltedForInput",
      "currentStepId": "ASK_CONFIRM_INSTRUCTION_1_COMPLETED",
      "question": "Инструкция 'Instruction 1: Review main task (Generic-00001) goals and linkedFiles.' добавлена в ... . Введите 'done' после её выполнения.",
      // ...
  }
  ```

**Этап 4: Пользователь "выполняет" инструкции**

* **Команда 5 (подтверждение инструкции 1):**
  ```bash
  php script/engine/invoke-scenario-engine.php --scenarioId SCN-CreateTask --userInputValue done
  ```
  *Ожидание: Выполняется `DO_SET_INSTRUCTION_2`.*
  *Файловая система:*
    * `Generic-00001-FullyCollectTaskData.json`: `fcTaskInstructions` теперь содержит "Instruction 1..." и "Instruction
      2: Collect all data from main task definition and context.".
      *Контекст содержит:* `lastInstructionAdded: "Instruction 2..."`.
      *Сценарий остановлен на `ASK_CONFIRM_INSTRUCTION_2_COMPLETED`.*
      *Вывод:*
  ```json
  {
      "status": "HaltedForInput",
      "currentStepId": "ASK_CONFIRM_INSTRUCTION_2_COMPLETED",
      "question": "Инструкция 'Instruction 2: Collect all data from main task definition and context.' добавлена в ... . Введите 'done' после её выполнения.",
      // ...
  }
  ```

* **Команда 6 (подтверждение инструкции 2):**
  ```bash
  php script/engine/invoke-scenario-engine.php --scenarioId SCN-CreateTask --userInputValue done
  ```
  *Ожидание: Выполняется `DO_SET_INSTRUCTION_3`.*
  *Файловая система:*
    * `Generic-00001-FullyCollectTaskData.json`: `fcTaskInstructions` теперь содержит все три инструкции.
      *Контекст содержит:* `lastInstructionAdded: "Instruction 3..."`.
      *Сценарий остановлен на `ASK_CONFIRM_INSTRUCTION_3_COMPLETED`.*
      *Вывод:*
  ```json
  {
      "status": "HaltedForInput",
      "currentStepId": "ASK_CONFIRM_INSTRUCTION_3_COMPLETED",
      "question": "Инструкция 'Instruction 3: Verify all placeholders in collected data are resolved.' добавлена в ... . Введите 'done' после её выполнения.",
      // ...
  }
  ```

**Этап 5: Пользователь подтверждает последнюю инструкцию, запускается PHP Action**

* **Команда 7 (подтверждение инструкции 3):**
  ```bash
  php script/engine/invoke-scenario-engine.php --scenarioId SCN-CreateTask --userInputValue done
  ```
  *Ожидание: Выполняется шаг `FINALIZE_FC_AND_SETUP_MAIN_TASK`. Запускается `ManageTaskCompletionAction.php`.*
  *PHP Action (`ManageTaskCompletionAction.php`) выполняет:*
    * Вызов
      `TaskLifecycleManager->completeFcTaskAndSetMainTaskPendingValidation("Generic-00001", "Generic-00001-FullyCollectTaskData")`.
    * `TaskLifecycleManager` изменяет статус `Generic-00001-FullyCollectTaskData.json` на `Completed`.
    * `TaskLifecycleManager` перемещает `Generic-00001-FullyCollectTaskData.json` из `task_definitions` в `completed`.
    * `TaskLifecycleManager` изменяет статус `Generic-00001.json` на `Pending-Validation`.
      *Файловая система:*
    * `script/engine/task_definitions/Generic-00001.json`: статус изменен на `Pending-Validation`.
    * `script/engine/task_definitions/Generic-00001-FullyCollectTaskData.json`: **удален отсюда**.
    * `script/engine/completed/Generic-00001-FullyCollectTaskData.json`: **появился здесь**, статус `Completed`.
      *Контекст обновляется результатами из PHP action:* `taskManagementResult` (с деталями),
      `fcTaskCompletedAndMoved: true`, `mainTaskSetPendingValidation: true`.
      *Сценарий остановлен на `ASK_ACTIVATE_MAIN_TASK`.*
      *Вывод:*
  ```json
  {
      "status": "HaltedForInput",
      "currentStepId": "ASK_ACTIVATE_MAIN_TASK",
      "question": "Введите 'yes' для установки статуса основной задачи {{context.taskFilePath}} в 'InProgress'",
      // Контекст будет содержать taskManagementResult и флаги
  }
  ```
  *(Здесь важно проверить STDERR PHP на предмет ошибок от `TaskLifecycleManager` или `ManageTaskCompletionAction` если
  что-то пошло не так).*

**Этап 6: Активация основной задачи**

* **Команда 8:**
  ```bash
  php script/engine/invoke-scenario-engine.php --scenarioId SCN-CreateTask --userInputValue yes
  ```
  *Ожидание: Выполняется `DO_ACTIVATE_MAIN_TASK`, затем `PREPARE_FINAL_MESSAGE_DATA`.*
  *Файловая система:*
    * `script/engine/task_definitions/Generic-00001.json`: статус изменен на `InProgress`.
      *Контекст обновляется:* `mainTaskStatus: "InProgress"`, `compiledFcInstructions` (строка с инструкциями, собранная
      из FC-файла, который теперь в `completed/`).
      *Сценарий переходит к `End_Success`.*

**Этаap 7: Завершение сценария**

* *Ожидание: Шаг `End_Success` выполняется.*
  *Вывод (финальное сообщение):*
  ```json
  {
      "status": "Completed",
      "finalContext": {
          // ... весь контекст ...
          "taskManagementResult": {
              "mainTask": {"id": "Generic-00001", "statusUpdated": true, "message": "Main task status set to Pending-Validation."}, // Статус в сообщении должен быть InProgress из-за DO_ACTIVATE_MAIN_TASK, но taskManagementResult показывает предыдущий результат
              "fcTask": {"id": "Generic-00001-FullyCollectTaskData", "statusUpdated": true, "moved": true, "message": "FC task status set to Completed and moved to completed directory."}
          },
          "compiledFcInstructions": "Instruction 1: Review main task (Generic-00001) goals and linkedFiles.; Instruction 2: Collect all data from main task definition and context.; Instruction 3: Verify all placeholders in collected data are resolved.",
          "mainTaskStatus": "InProgress"
          // ...
      }
  }
  ```
  Финальное сообщение будет выглядеть примерно так:
  ```
  Tasks initialized. FC task processed and moved. Main task pending validation.
   - Main: script/engine/task_definitions/Generic-00001.json (Status: Pending-Validation -> Main task status set to Pending-Validation.) // Тут может быть несоответствие, так как mainTaskStatus в контексте уже InProgress
   - FC Task: script/engine/completed/Generic-00001-FullyCollectTaskData.json (Status: Completed; Moved: Yes -> FC task status set to Completed and moved to completed directory.)
     Instructions added: Instruction 1...; Instruction 2...; Instruction 3...
  ```

**Возможное улучшение в финальном сообщении:**
В шаге `End_Success` в `message` мы ссылаемся на
`{{context.taskManagementResult.mainTask.statusUpdated ? 'Pending-Validation' : 'Error'}}`. Однако, к этому моменту
`mainTaskStatus` в контексте уже `InProgress` из-за шага `DO_ACTIVATE_MAIN_TASK`.
Возможно, стоит обновить `PREPARE_FINAL_MESSAGE_DATA`, чтобы он также читал актуальный статус основной задачи из файла и
клал его в отдельную переменную контекста для финального сообщения, или просто использовать
`{{context.mainTaskStatus}}`.

Я бы предложил в `End_Success` использовать `{{context.mainTaskStatus}}` для отображения актуального статуса основной
задачи, а информацию из `taskManagementResult.mainTask.message` оставить как есть, она относится к предыдущей операции.

Изменим `End_Success` в `SCN-CreateTask.scenario.json`:
Было:
`"message": "...(Status: {{context.taskManagementResult.mainTask.statusUpdated ? 'Pending-Validation' : 'Error'}} -> {{context.taskManagementResult.mainTask.message}})..."`
Станет:
`"message": "...(Status: {{context.mainTaskStatus}} -> {{context.taskManagementResult.mainTask.message}})..."`

Сейчас применю это небольшое изменение.

Симуляция завершена. Теперь вы можете провести реальное тестирование по описанным шагам. Обращайте внимание на
содержимое файлов задач и вывод на каждом этапе.

Удачи!
