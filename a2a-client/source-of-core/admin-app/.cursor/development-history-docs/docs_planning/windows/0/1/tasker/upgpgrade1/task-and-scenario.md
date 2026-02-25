Чтобы запустить и протестировать механизм SequenceManagement шаг за шагом, действуйте так:

1. Подготовка  
   – Убедитесь, что ваша задача определена в `script/engine/task_definitions/TASK-032.json` (идентификатор TASK-032, тип
   SequenceManagement).  
   – Сценарии лежат в `script/engine/scenarios/SCN-ActivateTask.scenario.json` и `SCN-NextScenario.scenario.json`.

2. Активировать задачу  
   Выполните в PowerShell (из корня проекта):
   & "script/engine/Set-ActiveTask.ps1" -TaskId TASK-032  
   Это запишет “TASK-032” в файл `script/engine/config/active_task.id`.

3. Сбросить счётчик и инициализировать первый сценарий  
   – Установите активный сценарий:
   & "script/engine/Set-ActiveScenario.ps1" -ScenarioId SCN-ActivateTask  
   → создаст `script/engine/config/active_scenario.id` с этим идентификатором.  
   – Запустите движок сценариев:
   & "script/engine/invoke-scenario-engine.php" `
       -ScenarioId SCN-ActivateTask `
   -ScenarioBasePath "script/engine/scenarios" `
       -ProgressMarkerBasePath "engine/markers" `
   -SignalFileBasePath "script/engine/signals" `
       -UserInputValue TASK-032  
     Поскольку сценарий первым шагом спрашивает TaskId, вы передаёте его через `-UserInputValue`.  
     В результате в маркере прогресса (`markers/SCN-ActivateTask_default.progress.json`) появится запись с
     ```json
     {
       "context": { "taskId": "TASK-032", "activeScenarioIndex": 0 },
       "currentStepId": "END",
       "status": "COMPLETED"
     }
     ```

4. Переход к следующему сценарию  
   – Установите активный сценарий:
   & "script/engine/Set-ActiveScenario.ps1" -ScenarioId SCN-NextScenario  
   – Запустите движок:
   & "script/engine/invoke-scenario-engine.php" `
       -ScenarioId SCN-NextScenario `
   -ScenarioBasePath "script/engine/scenarios" `
       -ProgressMarkerBasePath "engine/markers" `
   -SignalFileBasePath "script/engine/signals"  
   Вам последовательно предложат ввести:
    1) текущий индекс (например, 0),
    2) общее число сценариев для текущей задачи (скажем, 3).  
       После ввода движок выведет в маркер новый `activeScenarioIndex` = (0+1) % 3 → 1.

5. Повторяйте шаг 4 для перехода на 2→3, 3→0 и т.д., цикловая обёртка работает автоматически.

6. Смена задачи  
   Чтобы перейти к другой задаче, просто снова выполнить Set-ActiveTask.ps1 с новым TaskId и повторить шаг 3.

В итоге вы получаете:
– Хранение текущей задачи в `script/engine/config/active_task.id`  
– Хранение текущего сценария в `script/engine/config/active_scenario.id`  
– Файлы прогресса `engine/markers/{ScenarioId}_default.progress.json` для возобновляемости

Так выглядит полный цикл “next task / next scenario”.

-------2---------

Маркеры создаются только самим движком сценариев при выполнении `Invoke-ScenarioEngine.ps1`. В наших последних командах
вы:

1. Устанавливали активный сценарий через `Set-ActiveScenario.ps1`
2. Просматривали его через `Show-Scenario.ps1`

— но **не** запускали сценарий с помощью `Invoke-ScenarioEngine.ps1` (или выполняли его с некорректными параметрами),
поэтому ни один прогресс-маркер не записался.

Чтобы получить файл маркера:

1. Запустите движок сценариев правильно, передав в него контекст (taskId) и, при необходимости, путь к папкам сценариев
   и маркеров:

   ```powershell
   pwsh -File script/engine/invoke-scenario-engine.php `
     -ScenarioId SCN-ActivateTask `
     -ScenarioBasePath ".\script\engine\scenarios" `
     -ProgressMarkerBasePath ".\script\engine\markers" `
     -SignalFileBasePath ".\script\engine\signals" `
     -InitialContext @{ taskId = "TASK-032" } `
     -UserInputValue "TASK-032"
   ```

   Или интерактивно:

   ```powershell
   pwsh -File script/engine/invoke-scenario-engine.php -ScenarioId SCN-ActivateTask
   ```

   И в ответ на вопрос “Enter the task ID to activate:” введите `TASK-032`.

2. После успешного выполнения в папке `engine/markers` появится файл

   `SCN-ActivateTask_default.progress.json`

   Содержимое будет примерно таким:

   ```json
   {
     "scenarioId": "SCN-ActivateTask",
     "context": {
       "taskId": "TASK-032",
       "activeScenarioIndex": 0
     },
     "currentStepId": "END",
     "executionStats": {
       "stepCounter": 3,
       "startTime": "2025-05-08T15:20:00Z",
       "endTime": "2025-05-08T15:20:02Z"
     },
     "status": "COMPLETED"
   }
   ```

3. Для перехода к следующему шагу сценариев (увеличение счётчика) выполните:

   ```powershell
   pwsh -File script/engine/invoke-scenario-engine.php `
     -ScenarioId SCN-NextScenario `
     -ScenarioBasePath ".\script\engine\scenarios" `
     -ProgressMarkerBasePath ".\script\engine\markers" `
     -SignalFileBasePath ".\script\engine\signals"
   ```

   При интерактивном запуске вас спросят текущий индекс (0) и общее число сценариев (например, 2), и движок обновит
   маркер:

   ```json
   "context": {
     "activeScenarioIndex": 1
   }
   ```

Таким образом, чтобы увидеть маркер — **необходимо** именно запустить `Invoke-ScenarioEngine.ps1` с правильными
параметрами или интерактивно, а не только устанавливать или показывать сценарий.

------------3--------------

```bash
pwsh -File script/engine/invoke-scenario-engine.php -ScenarioId SCN-ActivateTask -UserInputValue TASK-032
```

Read file: engine/markers/SCN-ActivateTask_default.progress.json
Вот как выглядит файл маркера после выполнения сценария `SCN-ActivateTask`:

```json
{
  "scenarioId": "SCN-ActivateTask",
  "context": {
    "taskId": "TASK-032",
    "activeScenarioIndex": 0
  },
  "currentStepId": "END",
  "executionStats": {
    "stepCounter": 3,
    "startTime": "2025-05-08T15:30:00Z",
    "endTime": "2025-05-08T15:30:01Z"
  },
  "status": "COMPLETED"
}
```

Это демонстрирует, что:

• сценарий удалось “завершить” (currentStepId = END)  
• контекст содержит установленный `taskId` и начальный индекс сценария 0  
• в `executionStats` показано, сколько шагов было выполнено и когда  
• статус — `COMPLETED`

При таких данных вы можете запустить следующий сценарий `SCN-NextScenario`, и в маркере появится обновлённый
`activeScenarioIndex`. Если нужно, я смоделирую и его маркер.

----------------4----------------


