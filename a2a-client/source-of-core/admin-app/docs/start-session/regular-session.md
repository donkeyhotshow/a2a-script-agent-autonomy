<user_query>
Здравствуйте. Пожалуйста, действуйте как автономный AI-исполнитель для AI Task System по методологии Scan-Plan-Refine.

Ваша первая задача — провести начальное сканирование системы и сбор контекста. Используйте доступные инструменты для
изучения проекта на основе структуры и ключевых компонентов AI Task System.

Выполните следующие шаги:

1. **Scan:** Системно исследуйте ключевые директории и файлы системы:
    - **Core Scripts:** `main.ps1`, `main-work.ps1`, `main-index.ps1`
    - **script/engine/** (actions/powershell, task_definitions, task_types, scenarios, markers, state, compleated,
      invoke-scenario-engine.php, partials)
    - **script/docs/** (standards, общая документация)
    - **index/** (структура индекса, использование main-index.ps1)
    - **install-modules/**, **resources/**
    - Другие релевантные директории по мере обнаружения

2. **Plan:** На основе сканирования сформулируйте детальный план работы с задачами:
    - Как используются core-скрипты для управления задачами
    - Как определяется и активируется задача
    - Как работает publishedTaskId и его сценарии
    - Как выполняются сценарии, обновляются статусы, архивируются задачи
    - Как собирается информация и отслеживается прогресс

3. **Refine:** Опишите, как будете корректировать план при появлении новой информации или проблем.

Представьте результаты сканирования и предложенный план, ссылаясь на файлы и директории в формате `mdc:`.
</user_query>

# Пример использования сценария `SCN-CreateTask`

Сценарий `SCN-CreateTask` автоматизирует процесс создания новой задачи и связанной с ней задачи типа "
FullyCollectTaskData" (FC Task). Ниже приведен пошаговый пример взаимодействия со сценарием для создания задачи типа
`ModuleDevelopment`.

1. **Инициация сценария:**
   ```powershell
   pwsh -File ./main-work.ps1 -Mode RunScenario -ScenarioId SCN-CreateTask
   ```

2. **Ввод типа задачи:** Система запросит тип создаваемой задачи.
    * Запрос: `QUESTION: Введите тип задачи (например WorkflowImprovement)`
    * Ответ: Введите желаемый тип, например, `ModuleDevelopment`.
      ```powershell
      pwsh -File ./main-work.ps1 -Mode RunScenario -ScenarioId SCN-CreateTask -UserInputValue ModuleDevelopment
      ```

3. **Создание и валидация файла задачи:**
    * Система скопирует соответствующий шаблон (например,
      `script/engine/task_types/ModuleDevelopment/ModuleDevelopment.template.json`) в новый файл определения задачи (
      например, `script/engine/task_definitions/ModuleDevelopment-XXXXX.json`).
    * Далее, система попытается валидировать этот файл. Если в шаблоне есть плейсхолдеры, валидация сообщит об этом.

4. **Редактирование файла задачи:** Система предложит отредактировать созданный файл.
    * Запрос:
      `QUESTION: The task file C:\apps\admin-app\script\engine\task_definitions\ModuleDevelopment-XXXXX.json contains placeholder text. Please edit the file to fill in the details...`
    * Действие: Откройте указанный `.json` файл и заполните все плейсхолдеры актуальными данными для вашей задачи.

5. **Подтверждение редактирования:** После сохранения изменений, система спросит, завершено ли редактирование.
    * Запрос: `QUESTION: Have you finished editing the ModuleDevelopment task file ...? Enter 'yes' to re-validate.`
    * Ответ: `yes`
      ```powershell
      pwsh -File ./main-work.ps1 -Mode RunScenario -ScenarioId SCN-CreateTask -UserInputValue yes
      ```

6. **Повторная валидация и создание FC-задачи:**
    * Система повторно валидирует файл задачи. Если все плейсхолдеры заменены, валидация пройдет успешно.
    * Далее, система автоматически создаст связанную FC-задачу (например,
      `ModuleDevelopment-XXXXX-FullyCollectTaskData.json`).

7. **Активация FC-задачи:** Система спросит, нужно ли активировать FC-задачу (установить ее статус в `InProgress`).
    * Запрос:
      `QUESTION: Введите 'yes' для установки статуса задачи ...ModuleDevelopment-XXXXX-FullyCollectTaskData.json в 'InProgress'`
    * Ответ: `yes`
      ```powershell
      pwsh -File ./main-work.ps1 -Mode RunScenario -ScenarioId SCN-CreateTask -UserInputValue yes
      ```

8. **Получение инструкций для FC-задачи:** Система выдаст серию инструкций (обычно 4-5) о том, как действовать дальше с
   созданной FC-задачей (анализ проекта, использование индексатора, сбор данных и т.д.). На каждую инструкцию следует
   отвечать, например, `ok`, чтобы перейти к следующей.
   ```powershell
   # Пример ответа на одну из инструкций
   pwsh -File ./main-work.ps1 -Mode RunScenario -ScenarioId SCN-CreateTask -UserInputValue ok
   ```

9. **Завершение FC-задачи и активация основной задачи:**
    * После подтверждения всех инструкций, система автоматически:
        * Установит статус FC-задачи в `Completed` и переместит ее файл в директорию
          `script/engine/task_definitions/completed/`.
        * Установит статус основной задачи (например, `ModuleDevelopment-XXXXX`) в `InProgress`.
        * Обновит глобальный параметр `activeTask` на ID основной задачи.

10. **Завершение сценария `SCN-CreateTask`:**
    * Сценарий `SCN-CreateTask` завершится со статусом `Completed`.
    * Сообщение: `Scenario finished with status: Completed`

После этого основная задача создана, активирована, и можно приступать к ее выполнению, начиная с шагов, описанных в
FC-задаче (сбор данных, анализ и т.д.), используя сценарий `SCN-FullyCollectTaskData`.

---

**Используй этот файл как практическое руководство для превращения нерабочих модулей в рабочие и постоянного развития
стандартов!**
