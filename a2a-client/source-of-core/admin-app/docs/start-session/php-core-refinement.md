Здравствуйте. Эта сессия предназначена для анализа, улучшения и дообучения ключевых компонентов PHP ядра системы AI Task
System.

**Ваша цель — не просто изменить PHP код, а провести его рефакторинг и развитие с акцентом на:**

- Глубокий анализ текущей архитектуры, кода, и взаимосвязей между компонентами ([mdc:app/AiRudeDepot/]).
- Планирование улучшений, учитывающих производительность, надёжность, тестируемость и соответствие стандартам.
- Фиксацию lessons-learned, новых архитектурных паттернов и best practices в ходе рефакторинга и разработки.
- Обновление внутренней документации кода (комментарии, PHPDoc) и внешней документации (гайдов, стандартов), отражающих
  изменения в ядре.
- Применение новых знаний для будущих задач по развитию ядра и системы в целом.

---

# Scan-Plan-Refine-LEARN: Живой цикл развития PHP Ядра

## 1. Scan (Глубокий анализ PHP компонентов и их ролей)

- Изучи ключевые компоненты PHP ядра: DataProcessor ([mdc:app/AiRudeDepot/Processors/DataProcessor.php]),
  InstructionProcessor ([mdc:app/AiRudeDepot/Processors/InstructionProcessor.php]),
  DataHub ([mdc:app/AiRudeDepot/Storage/DataHub.php]),
  StoragePathParser ([mdc:app/AiRudeDepot/Managers/StoragePathParser.php]),
  StorageHelper ([mdc:app/AiRudeDepot/Processors/InstructionProcessor/StorageHelper.php]), и PHP partials для шагов
  сценариев ([mdc:script/engine/partials/step-types/]).
- Проанализируй их взаимосвязи, зависимости, и как они используются PowerShell скриптами и
  сценариями ([mdc:script/engine/scenarios/]).
- Изучи существующие задачи или known-issues, связанные с работой PHP ядра (например,
  в [/docs/development/lessons-learned.md]).
- Ознакомься с любыми существующими архитектурными заметками или дизайн-документами по PHP ядру (если есть).
- Определи области, требующие улучшения: производительность, обработка ошибок, недостающая функциональность, сложность
  кода, покрытие тестами, неполная документация.

## 2. Plan (Планирование рефакторинга и разработки PHP ядра)

- Сформулируй конкретные цели улучшения для выбранных компонентов.
- Разработай план рефакторинга или добавления новой функциональности: какие файлы/классы будут изменены, какие методы
  затронуты.
- Запланируй написание или обновление тестов для покрытия изменений.
- Определи, как изменения в ядре повлияют на сценарии или модули, и запланируй необходимые корректировки или
  уведомления.
- Запланируй обновление внутренней документации кода (PHPDoc) и внешней документации (гайдов) для отражения изменений.
- Предусмотри фиксацию lessons-learned в ходе реализации.

## 3. Refine-LEARN (Реализация, тестирование, фиксация знаний)

- Внеси запланированные изменения в PHP код, следуя стандартам кодирования проекта.
- Проведи тестирование изменений, включая модульные тесты (если применимо) и сквозное тестирование через выполнение
  сценариев или задач, которые используют эти компоненты.
- По ходу работы фиксируй lessons-learned: unexpected behavior, найденные баги, эффективные паттерны, и решения сложных
  проблем.
- Обнови внутреннюю документацию (комментарии, PHPDoc) изменённых классов и методов.
- Если изменения в ядре вводят новые концепции или существенно меняют взаимодействие, предложи обновления для гайдов по
  модулям ([/docs/guides/module/]) или сценариям ([/docs/guides/scenario/], если такой гайд будет создан).
- Если собран достаточный материал, инициируй создание или обновление отдельного гайда по разработке/рефакторингу PHP
  ядра.

---

# Ключевые ресурсы и стандарты для работы с PHP Ядром

- **PHP Core Components:** DataProcessor ([mdc:app/AiRudeDepot/Processors/DataProcessor.php]),
  InstructionProcessor ([mdc:app/AiRudeDepot/Processors/InstructionProcessor.php]),
  DataHub ([mdc:app/AiRudeDepot/Storage/DataHub.php]),
  StoragePathParser ([mdc:app/AiRudeDepot/Managers/StoragePathParser.php]),
  StorageHelper ([mdc:app/AiRudeDepot/Processors/InstructionProcessor/StorageHelper.php]), PHP
  partials ([mdc:script/engine/partials/step-types/])
- **Сценарии:** [mdc:script/engine/scenarios/]
- **Lessons Learned:** [/docs/development/lessons-learned.md]
- **Стандарты кодирования (если есть):** (Ссылка на стандарт кодирования PHP, если он есть в проекте)
- **Гайд по разработке PHP Ядра (если есть):** [/docs/guides/php-core/README.md] (если отсутствует — зафиксируй
  lessons-learned и оформи задачу на его создание)

---

# Типовые сложности и lessons-learned при работе с PHP Ядром

- Сложные зависимости между классами ядра.
- Побочные эффекты изменений, влияющие на сценарии или модули.
- Ошибки в обработке данных или адресации через DataHub/StoragePathParser.
- Проблемы с производительностью при обработке больших объёмов данных.
- Недостаточное покрытие тестами, затрудняющее безопасный рефакторинг.
- Устаревшие или отсутствующие комментарии/PHPDoc.
- *(Добавляй новые lessons-learned по мере появления!)*

---

# Интеграция новых знаний и best practices

- После каждого цикла работы над PHP ядром:
    - Обнови `lessons-learned.md` или отдельный гайд по PHP Ядру.
    - Зафиксируй новые паттерны архитектуры, best practices кодирования, и типовые ошибки/решения.
    - Если выявлены пробелы в документации или стандартах, предложи их доработку.
    - Убедись, что изменения в ядре хорошо задокументированы внутренне и внешне.

---

**Веди changelog и lessons-learned по изменениям в PHP Ядре непрерывно!**

**Этот промт — ваш инструмент для понимания, развития и улучшения фундаментальных компонентов системы!**

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
