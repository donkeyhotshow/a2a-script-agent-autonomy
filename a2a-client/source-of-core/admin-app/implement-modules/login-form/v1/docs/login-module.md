# Модуль Login Form

> **Важно:** При создании или модификации модуля Login Form рекомендуется
> следовать [чек-листу верификации модуля](../../../../checklists/module-verification.md)
> и [чек-листу стандартов UI компонентов](../../../../checklists/component-standards.md).

Модуль Login Form доступен в двух версиях:

- ~~Установленная версия: `storage/ai/login-form/`~~ > **Примечание:** Документация ранее указывала на
  `storage/ai/login-form/` как на установленную версию, но верификация показала, что эта директория, скорее всего,
  отсутствует или не используется. Основные файлы модуля находятся в директории инсталлятора.
- Версия инсталлятора: `storage/aiInstaller/login-form/`

Этот модуль предоставляет полноценное решение для аутентификации, которое легко интегрируется в приложения с
использованием фреймворка JSON UI. Он включает валидацию форм, серверное взаимодействие и обработку ответов.

## Структура модуля

~~### Установленная версия (`storage/ai/login-form/`)~~

> **Внимание!** Приведенная ниже структура для `storage/ai/login-form/` **не подтверждена** в коде. Актуальные файлы
> модуля находятся в `storage/aiInstaller/login-form/`.

```
storage/ai/login-form/ (НЕ ПОДТВЕРЖДЕНО)
├── page.json
├── code/
│   └── LoginForm.php
├── actions/
│   ├── login-form/
│   │   └── login.json
│   ├── login-and-password/
│   ├── logout.json
│   ├── register.json
│   └── social-auth.json
├── commands/
│   ├── api-request.json
│   ├── authenticate.json
│   ├── forgot-password.json
│   ├── oauth-callback.json
│   ├── process-social-login.json
│   └── reset-password.json
├── data/
├── templates/
│   ├── layouts/
│   │   ├── card-layout.json
│   │   └── tabs-layout.json
└── validations/
    ├── login-validation.json
    └── registration-validation.json
```

### Версия в инсталляторе (`storage/aiInstaller/login-form/`)

(Эта структура подтверждена как существующая)

```
storage/aiInstaller/login-form/
├── page.json                # Основной контейнер страницы
├── code/                    # PHP-классы модуля
│   └── LoginForm.php        # Основной класс модуля
├── actions/                 # Обработчики действий
│   ├── login-form/          # Специфичные для логина действия
│   ├── login-and-password/  # Дополнительные действия для входа
│   ├── logout.json          # Завершение сессии
│   ├── register.json        # Регистрация нового пользователя
│   └── social-auth.json     # Обработчики социального входа
├── commands/                # Серверная обработка
│   ├── api-request.json     # Общие запросы к API
│   ├── authenticate.json    # Проверка учетных данных
│   ├── forgot-password.json # Восстановление пароля
│   ├── oauth-callback.json  # Обработка OAuth-ответов
│   ├── process-social-login.json # Обработка соц. логина
│   └── reset-password.json  # Сброс пароля
├── data/                    # Структуры данных
├── templates/               # UI-компоненты
│   ├── layouts/             # Варианты макетов
│   │   ├── card-layout.json # Макет в виде карточки
│   │   └── tabs-layout.json # Интерфейс с вкладками
└── validations/             # Валидация ввода
    ├── login-validation.json # Валидация полей логина
    └── registration-validation.json # Валидация регистрации
```

## Основные компоненты

### Главный компонент (`page.json`)

Основной файл `page.json` содержит ссылки на макеты модуля:

```json
{
    "sources": {
        "card": "login-form/templates/layouts/card-layout",
        "tabs": "login-form/templates/layouts/tabs-layout"
    }
}
```

### Макет карточки (`card-layout.json`)

Макет карточки обеспечивает стилизацию и структуру для простого интерфейса входа.

```json
{
    "type": "Card",
    "props": {
        "class": "w-full max-w-md mx-auto mt-8 bg-surface-900 text-surface-0 rounded-lg shadow-2xl overflow-hidden border border-surface-700"
    },
    "content": {
        "type": "Form",
        "props": {
            "id": "loginForm",
            "class": "p-8 bg-surface-800 rounded-md shadow-lg"
        },
        "content": [
            {
                "type": "InputText",
                "props": {
                    "id": "username",
                    "label": "Имя пользователя",
                    "required": true,
                    "class": "mt-1 block w-full bg-surface-700 text-surface-0",
                    "autofocus": true
                }
            },
            {
                "type": "Password",
                "props": {
                    "id": "password",
                    "label": "Пароль",
                    "required": true,
                    "class": "mt-1 block w-full bg-surface-700 text-surface-0",
                    "feedback": false
                }
            },
            {
                "type": "Button",
                "props": {
                    "label": "Войти",
                    "icon": "pi pi-sign-in",
                    "type": "submit",
                    "class": "btn-primary ml-auto"
                }
            }
        ]
    }
}
```

### Макет вкладок (`tabs-layout.json`)

Макет вкладок предоставляет интерфейс с разделами для входа, регистрации и восстановления пароля.

```json
{
  "type": "TabView",
  "props": {
    "class": "w-full max-w-md mx-auto bg-white shadow-lg rounded-lg overflow-hidden"
  },
  "children": [
    {
      "type": "TabPanel",
      "props": {
        "header": "Вход"
      },
      "children": [
        // Форма входа (аналогично card-layout)
      ]
    },
    {
      "type": "TabPanel",
      "props": {
        "header": "Регистрация"
      },
      "children": [
        // Форма регистрации
      ]
    },
    {
      "type": "TabPanel",
      "props": {
        "header": "Восстановление"
      },
      "children": [
        // Форма восстановления пароля
      ]
    }
  ]
}
```

## Обработка аутентификации

### Действие входа (`actions/login-form/login.json`)

Действие входа обрабатывает отправку формы, сохраняя учетные данные в буфер и вызывая команду аутентификации.

```json

```

### Команда аутентификации (`commands/authenticate.json`)

Команда `authenticate.json` содержит основную логику проверки учетных данных:

- Получение учетных данных из буфера (`buffer:credentials`).
- Вызов правил валидации (`login-form/validations/login-credentials`).
- При успешной валидации: поиск пользователя в базе данных .
- Проверка пароля.
- Обновление сессии (`session:user`) и localStorage при успешной аутентификации.
- Установка флагов и сообщений об ошибках в буфер (`buffer:validationErrors`, `buffer:authenticated`).

> **Примечание:** Из-за [известных проблем](mdc:./known-issues.md#1-нестабильная-работа-адресации-session-и-model) с
> адресацией `session!` и `model!`, в текущей реализации используется комбинация `session:user` и дублирование в
> localStorage.

### Валидация ввода (`validations/login-validation.json`)

Валидация в `login-validation.json` проверяет основные требования к полям формы:

- Наличие имени пользователя/логина.
- Наличие пароля.
- Обновление буфера ошибок (`buffer:validationErrors`) и флага неудачи валидации (`buffer:validationFailed`).

> **Примечание:** Текущая валидация имеет [ограничения](mdc:./known-issues.md#2-неполная-валидация-форм) и требует
> доработки.

### Социальная авторизация

Модуль включает файлы для поддержки входа через социальные сети (`social-auth.json`, `oauth-callback.json`,
`process-social-login.json`), но эта функциональность в настоящее
время [не полностью реализована](mdc:./known-issues.md#1-ограниченная-социальная-авторизация) и требует обновления.

## Процесс установки модуля

> **Коррекция:** Процесс установки, описанный ранее, предполагал копирование из инсталлятора в `storage/ai/`. Так как
`storage/ai/` не подтвержден, реальный процесс установки или использования модуля может отличаться. Скорее всего,
> система работает непосредственно с файлами из `storage/aiInstaller/login-form/` или копирует их в другую директорию во
> время установки/сборки.

Установка модуля из версии инсталлятора (`storage/aiInstaller/login-form/`) включает:

1. Копирование файлов из директории инсталлятора в рабочую директорию модулей ~~( `storage/ai/` или аналогичную)~~ (
   точное место назначения требует уточнения).
2. Учет зависимостей, указанных в `_i/meta.json` (например, PrimeVue, Tailwind CSS).
3. Интеграцию модуля в приложение с помощью компонента `include`, как показано в разделе "Быстрый старт"
   в [README](mdc:./index.md).

## Интеграция и использование

Для интеграции модуля в приложение:

- []

2. **Обработайте результат:** После успешной аутентификации модуль может установить данные пользователя в `session:user`
   и/или вызвать глобальное событие (например, `userAuthenticated`). Ваше приложение должно слушать это событие или
   проверять `session:user` для обновления UI.

> **Важно:** Учитывайте [известные проблемы](mdc:./known-issues.md) при интеграции.

## Верификация и соответствие стандартам

После создания или модификации модуля Login Form необходимо провести проверку на соответствие стандартам проекта:

1. **[Чек-лист верификации модуля](../../../../checklists/module-verification.md)** - убедитесь, что структура модуля,
   именование файлов и общая архитектура соответствуют стандартам.
2. **[Чек-лист стандартов UI компонентов](../../../../checklists/component-standards.md)** - проверьте, что все
   используемые компоненты JSON UI соответствуют требованиям к именованию, структуре и стилизации.

### Основные аспекты для проверки в Login Form модуле:

- Корректность структуры и организации JSON файлов
- Правильная обработка аутентификации и безопасности
- Корректная обработка ошибок и валидация
- Соответствие компонентов форм стандартам проекта
- Правильное использование глобальных менеджеров для обработки форм и событий
- Соответствие стилизации принятым стандартам (PrimeVue > Tailwind)

Регулярная проверка соответствия стандартам помогает поддерживать единообразие модулей аутентификации и улучшает
безопасность и надежность системы.

## Связанные документы

- [Известные проблемы](mdc:./known-issues.md)
- [Структура кода модулей](mdc:../code-structure.md)
- [Верификация модуля](mdc:./verification.md) 
