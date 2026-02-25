# Migration Map for tests/Feature/AiRudeDepot/TestModules/TestPageModule.php

Эта карта сопоставляет тестовый модуль `TestPageModule` (расположенный в `tests/Feature/AiRudeDepot/TestModules/`) с соответствующими классами и методами в приложении.

## Обзор
`TestPageModule` расширяет базовый класс `App` (`BaseApp`) и переопределяет метод `moduleRun`, добавляя логику извлечения данных пермалинка из буфера и формирования заголовка и содержимого страницы. Конструктор модуля логирует создание и настраивает `DataHub` и `PermanentLinkManager`.

---

Method: `__construct`
- Функциональность: Вызывает родительский конструктор (`BaseApp::__construct`) с параметрами запроса, приложения, slug модуля, `DataHub` и `PermanentLinkManager`. Логирует создание модуля с идентификатором slug и хэшем `DataHub`.
- Потенциальная зона кода:
  - `App\AiRudeDepot\App\App::__construct` (родительский конструктор)
  - `Illuminate\Support\Facades\Log::info`

---

Method: `moduleRun`
- Функциональность: Обрабатывает запрос к модулю. Устанавливает `DataHub` для ответа, извлекает данные пермалинка из буфера (`buffer:app.permalink_data`), определяет `title` и `content` на основе данных пермалинка или использует значения по умолчанию, добавляет эти данные в `StepResponse` и записывает историю выполнения.
- Потенциальная зона кода:
  - `App\AiRudeDepot\App\App::runAppEnv` (устанавливает буфер данных для модуля)
  - `App\AiRudeDepot\Storage\DataHub::address` и `::get` (получение `permalink_data`)
  - `App\AiRudeDepot\App\StepResponse\StepResponse::setDataHub`
  - `App\AiRudeDepot\App\StepResponse\StepResponse::addData`
  - `App\AiRudeDepot\App\StepResponse\StepResponse::addHistory`
  - `Illuminate\Support\Facades\Log::info`, `::warning`

---

