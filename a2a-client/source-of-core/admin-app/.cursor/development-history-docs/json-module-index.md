# Индекс JSON-модулей для AiRudeDepot

**Назначение:** Быстрый поиск живых примеров компонентов, параметров и сценариев использования JSON-модулей. В
аннотациях указано, какие реальные компоненты, параметры и примеры содержатся в каждом файле.

---

## implement-modules/login-form/v1

- [docs/index.md](implement-modules/login-form/v1/docs/index.md) — Документация: структура модуля, описание
  компонентов (LoginForm, поля email/password), параметры интеграции.
- [docs/login-module.md](implement-modules/login-form/v1/docs/login-module.md) — Подробный разбор компонентов: примеры
  LoginForm, RegisterForm, параметры, обработка событий.
- [docs/code.md](implement-modules/login-form/v1/docs/code.md) — Примеры кода: структура классов, параметры методов,
  интеграция с backend.
- [docs/known-issues.md](implement-modules/login-form/v1/docs/known-issues.md) — Примеры типовых ошибок: параметры,
  которые вызывают проблемы, способы их решения.
- [pages/index.json](implement-modules/login-form/v1/pages/index.json) — Пример страницы входа: компоненты LoginForm,
  поля email, password, кнопка входа, обработка ошибок.
- [pages/page.json](implement-modules/login-form/v1/pages/page.json) — Альтернативный пример страницы: компоненты
  LoginForm, параметры для кастомизации.
- [actions/register.json](implement-modules/login-form/v1/actions/register.json) — Пример действия регистрации:
  параметры email, password, confirm_password, структура запроса/ответа.
- [actions/social-auth.json](implement-modules/login-form/v1/actions/social-auth.json) — Пример действия соц.
  авторизации: параметры provider, access_token, обработка callback.
- [actions/login-form/login.json](implement-modules/login-form/v1/actions/login-form/login.json) — Пример действия
  входа: параметры email, password, обработка ошибок.
- [actions/login-form/logout.json](implement-modules/login-form/v1/actions/login-form/logout.json) — Пример действия
  выхода: параметры user_id, очистка сессии.
- [templates/auth-tabs.json](implement-modules/login-form/v1/templates/auth-tabs.json) — Пример шаблона вкладок:
  компоненты Tab, параметры для переключения между Login/Register/Reset.
- [templates/reset-password.json](implement-modules/login-form/v1/templates/reset-password.json) — Пример шаблона сброса
  пароля: поля email, новый пароль, подтверждение, обработка ошибок.
- [templates/social-buttons.json](implement-modules/login-form/v1/templates/social-buttons.json) — Пример кнопок соц.
  входа: компоненты Button, параметры provider, иконки.
- [templates/card-layout.json](implement-modules/login-form/v1/templates/card-layout.json) — Пример макета: компоненты
  Card, параметры для размещения форм.
- [templates/layouts/tabs-layout.json](implement-modules/login-form/v1/templates/layouts/tabs-layout.json) — Пример
  макета вкладок: компоненты TabPanel, параметры для динамического контента.
- [commands/oauth-callback.json](implement-modules/login-form/v1/commands/oauth-callback.json) — Пример команды:
  параметры code, state, обработка ответа OAuth.
- [commands/process-social-login.json](implement-modules/login-form/v1/commands/process-social-login.json) — Пример
  команды: параметры provider, userData, обработка результата соц. входа.
- [commands/reset-password.json](implement-modules/login-form/v1/commands/reset-password.json) — Пример команды:
  параметры email, новый пароль, токен сброса.
- [commands/authenticate.json](implement-modules/login-form/v1/commands/authenticate.json) — Пример команды: параметры
  email, password, обработка токена.
- [commands/forgot-password.json](implement-modules/login-form/v1/commands/forgot-password.json) — Пример команды:
  параметры email, отправка письма для сброса.
- [commands/api-request.json](implement-modules/login-form/v1/commands/api-request.json) — Пример API-запроса: параметры
  endpoint, payload, headers.
- [validations/login-validation.json](implement-modules/login-form/v1/validations/login-validation.json) — Пример
  валидации: правила для email (обязательное поле, формат), password (минимум 6 символов), сообщения об ошибках.
- [validations/registration-validation.json](implement-modules/login-form/v1/validations/registration-validation.json) —
  Пример валидации: email, password, confirm_password, правила и сообщения.
- [code/LoginForm.php](implement-modules/login-form/v1/code/LoginForm.php) — Пример PHP-компонента: методы для
  аутентификации, параметры request/response.
- [data/login-form.json](implement-modules/login-form/v1/data/login-form.json) — Пример данных: структура формы,
  параметры по умолчанию.
- [data/social-providers.json](implement-modules/login-form/v1/data/social-providers.json) — Пример провайдеров:
  параметры provider, client_id, client_secret.
- [data/user-session.json](implement-modules/login-form/v1/data/user-session.json) — Пример сессии: параметры user_id,
  token, expires_at.
- [data/models/users.json](implement-modules/login-form/v1/data/models/users.json) — Пример модели пользователя: поля
  id, email, password_hash.
- [data/models/social-connections.json](implement-modules/login-form/v1/data/models/social-connections.json) — Пример
  модели соц. связи: поля user_id, provider, provider_id.
- [data/blanks/social-auth.json](implement-modules/login-form/v1/data/blanks/social-auth.json) — Пример заготовки:
  параметры для соц. авторизации.
- [data/blanks/reset-password.json](implement-modules/login-form/v1/data/blanks/reset-password.json) — Пример заготовки:
  параметры email, новый пароль.
- [data/blanks/oauth-callback.json](implement-modules/login-form/v1/data/blanks/oauth-callback.json) — Пример заготовки:
  параметры code, state.
- [data/blanks/registration.json](implement-modules/login-form/v1/data/blanks/registration.json) — Пример заготовки:
  email, password, confirm_password.
- [data/blanks/forgot-password.json](implement-modules/login-form/v1/data/blanks/forgot-password.json) — Пример
  заготовки: email для восстановления.
- [_i/meta.json](implement-modules/login-form/v1/_i/meta.json) — Пример метаданных: параметры name, description,
  dependencies.
- [_i/meta-admin.json](implement-modules/login-form/v1/_i/meta-admin.json) — Пример админ-метаданных: параметры для меню
  и permalinks.
- [_i/files-by-block.json](implement-modules/login-form/v1/_i/files-by-block.json) — Пример группировки: структура
  блоков, связи между файлами.
- [_i/links.json](implement-modules/login-form/v1/_i/links.json) — Пример ссылок: параметры path, label, page.
- [_i/common.json](implement-modules/login-form/v1/_i/common.json) — Пример общих параметров: список страниц, основной
  код.

---

## implement-modules/page/v1

- [logic.json](implement-modules/page/v1/logic.json) — Пример логики: параметры для управления страницами, связи между
  секциями.
- [pages/about-us.json](implement-modules/page/v1/pages/about-us.json) — Пример страницы "О нас": компоненты Team,
  History, параметры описания.
- [pages/booking.json](implement-modules/page/v1/pages/booking.json) — Пример страницы бронирования: компоненты
  BookingForm, параметры даты, времени, пользователя.
- [pages/contact.json](implement-modules/page/v1/pages/contact.json) — Пример контактной страницы: компоненты
  ContactForm, параметры email, message, карта.
- [pages/services.json](implement-modules/page/v1/pages/services.json) — Пример страницы услуг: компоненты ServiceList,
  параметры категорий, описания.
- [pages/errors/403.json](implement-modules/page/v1/pages/errors/403.json) — Пример страницы 403: компоненты ErrorPage,
  параметры сообщения.
- [pages/errors/404.json](implement-modules/page/v1/pages/errors/404.json) — Пример страницы 404: компоненты ErrorPage,
  параметры сообщения.
- [pages/errors/500.json](implement-modules/page/v1/pages/errors/500.json) — Пример страницы 500: компоненты ErrorPage,
  параметры сообщения.
- [code/Page.php](implement-modules/page/v1/code/Page.php) — Пример PHP-компонента: методы для рендеринга страниц,
  параметры запроса.
- [templates/product-card.json](implement-modules/page/v1/templates/product-card.json) — Пример карточки товара:
  компоненты ProductCard, параметры title, price, image.
- [templates/category-button.json](implement-modules/page/v1/templates/category-button.json) — Пример кнопки категории:
  параметры label, icon, сlick.
- [templates/header/navigation-links.json](implement-modules/page/v1/templates/header/navigation-links.json) — Пример
  навигации: компоненты Link, параметры path, label.
- [templates/header/login-signup-button.json](implement-modules/page/v1/templates/header/login-signup-button.json) —
  Пример кнопки входа/регистрации: параметры action, label.
- [templates/header/brand-logo.json](implement-modules/page/v1/templates/header/brand-logo.json) — Пример логотипа:
  параметры src, alt.
- [templates/dialogs/info-dialog.json](implement-modules/page/v1/templates/dialogs/info-dialog.json) — Пример диалога:
  компоненты Dialog, параметры title, message.
- [sections/landing-footer.json](implement-modules/page/v1/sections/landing-footer.json) — Пример футера: компоненты
  Footer, параметры ссылок и контактов.
- [sections/landing-header.json](implement-modules/page/v1/sections/landing-header.json) — Пример хедера: компоненты
  Header, параметры навигации.
- [sections/services/barber-services-section.json](implement-modules/page/v1/sections/services/barber-services-section.json) —
  Пример секции: компоненты ServiceList, параметры для барбер-услуг.
- [sections/services/barber-tattoo-tabs-section.json](implement-modules/page/v1/sections/services/barber-tattoo-tabs-section.json) —
  Пример секции: компоненты Tab, параметры для барбер/тату.
- [sections/services/booking-cta-section.json](implement-modules/page/v1/sections/services/booking-cta-section.json) —
  Пример секции: компоненты CTA, параметры для бронирования.
- [sections/services/services-hero-section.json](implement-modules/page/v1/sections/services/services-hero-section.json) —
  Пример секции: компоненты Hero, параметры описания услуг.
- [sections/services/tattoo-services-section.json](implement-modules/page/v1/sections/services/tattoo-services-section.json) —
  Пример секции: компоненты ServiceList, параметры для тату-услуг.
- [sections/services/tabs/barber-offers.json](implement-modules/page/v1/sections/services/tabs/barber-offers.json) —
  Пример вкладки: параметры предложений барбера.
- [sections/services/tabs/tattoo-offers.json](implement-modules/page/v1/sections/services/tabs/tattoo-offers.json) —
  Пример вкладки: параметры предложений тату.
- [sections/contact/contact-content-section.json](implement-modules/page/v1/sections/contact/contact-content-section.json) —
  Пример секции: компоненты ContactInfo, параметры адреса, телефона.
- [sections/contact/contact-info-section.json](implement-modules/page/v1/sections/contact/contact-info-section.json) —
  Пример секции: параметры контактных данных.
- [sections/contact/contact-hero-section.json](implement-modules/page/v1/sections/contact/contact-hero-section.json) —
  Пример секции: компоненты Hero, параметры для контактов.
- [sections/contact/faq-section.json](implement-modules/page/v1/sections/contact/faq-section.json) — Пример секции:
  компоненты FAQ, параметры вопросов/ответов.
- [sections/contact/map-section.json](implement-modules/page/v1/sections/contact/map-section.json) — Пример секции:
  компоненты Map, параметры координат.
- [sections/about-us/about-hero-section.json](implement-modules/page/v1/sections/about-us/about-hero-section.json) —
  Пример секции: компоненты Hero, параметры для "О нас".
- [sections/about-us/history-section.json](implement-modules/page/v1/sections/about-us/history-section.json) — Пример
  секции: компоненты History, параметры событий.
- [sections/about-us/team-section.json](implement-modules/page/v1/sections/about-us/team-section.json) — Пример секции:
  компоненты Team, параметры участников.
- [sections/about-us/values-section.json](implement-modules/page/v1/sections/about-us/values-section.json) — Пример
  секции: компоненты Values, параметры ценностей.
- [_i/meta.json](implement-modules/page/v1/_i/meta.json) — Пример метаданных: параметры name, description, dependencies.
- [_i/files-by-block.json](implement-modules/page/v1/_i/files-by-block.json) — Пример группировки: структура блоков,
  связи между файлами.
- [_i/links.json](implement-modules/page/v1/_i/links.json) — Пример ссылок: параметры path, label, page.
- [_i/common.json](implement-modules/page/v1/_i/common.json) — Пример общих параметров: логика, код.

---

## implement-modules/playground/v1

- [pages/index.json](implement-modules/playground/v1/pages/index.json) — Пример страницы: компоненты Playground,
  параметры тестовых данных.
- [pages/model-test-v1.json](implement-modules/playground/v1/pages/model-test-v1.json) — Пример страницы: компоненты
  ModelTest, параметры модели.
- [pages/mysql-test-v1.json](implement-modules/playground/v1/pages/mysql-test-v1.json) — Пример страницы: компоненты
  MySQLTest, параметры подключения.
- [pages/session-test-v1.json](implement-modules/playground/v1/pages/session-test-v1.json) — Пример страницы: компоненты
  SessionTest, параметры сессии.
- [pages/session-test-v2.json](implement-modules/playground/v1/pages/session-test-v2.json) — Пример страницы: компоненты
  SessionTest, параметры сессии v2.
- [code/Playground.php](implement-modules/playground/v1/code/Playground.php) — Пример PHP-компонента: методы для
  тестирования, параметры.
- [module-docs/task-card.md](implement-modules/playground/v1/module-docs/task-card.md) — Пример документации: структура
  задачи, параметры.
- [module-docs/steps.md](implement-modules/playground/v1/module-docs/steps.md) — Пример документации: шаги выполнения,
  параметры.
- [module-docs/write-module-standard.md](implement-modules/playground/v1/module-docs/write-module-standard.md) — Пример
  стандарта: структура модулей, параметры.
- [module-docs/process-analysis-standard.md](implement-modules/playground/v1/module-docs/process-analysis-standard.md) —
  Пример анализа: параметры процессов.
- [actions/model-test-v1/save-new-model.json](implement-modules/playground/v1/actions/model-test-v1/save-new-model.json) —
  Пример действия: параметры для сохранения модели.
- [actions/model-test-v1/update-model-by-id.json](implement-modules/playground/v1/actions/model-test-v1/update-model-by-id.json) —
  Пример действия: параметры для обновления модели по id.
- [actions/model-test-v1/load-model-by-id.json](implement-modules/playground/v1/actions/model-test-v1/load-model-by-id.json) —
  Пример действия: параметры для загрузки модели по id.
- [actions/model-test-v1/load-model-by-where.json](implement-modules/playground/v1/actions/model-test-v1/load-model-by-where.json) —
  Пример действия: параметры для загрузки модели по условию.
- [actions/model-test-v1/delete-model-by-id.json](implement-modules/playground/v1/actions/model-test-v1/delete-model-by-id.json) —
  Пример действия: параметры для удаления модели по id.
- [actions/session-test-v1/save-to-session.json](implement-modules/playground/v1/actions/session-test-v1/save-to-session.json) —
  Пример действия: параметры для сохранения в сессию.
- [actions/session-test-v1/load-from-session-to-content.json](implement-modules/playground/v1/actions/session-test-v1/load-from-session-to-content.json) —
  Пример действия: параметры для загрузки из сессии.
- [actions/mysql-test-v1/save-new-mysql.json](implement-modules/playground/v1/actions/mysql-test-v1/save-new-mysql.json) —
  Пример действия: параметры для сохранения записи MySQL.
- [actions/mysql-test-v1/update-mysql-by-id.json](implement-modules/playground/v1/actions/mysql-test-v1/update-mysql-by-id.json) —
  Пример действия: параметры для обновления записи MySQL по id.
- [actions/mysql-test-v1/load-mysql-by-id.json](implement-modules/playground/v1/actions/mysql-test-v1/load-mysql-by-id.json) —
  Пример действия: параметры для загрузки записи MySQL по id.
- [actions/mysql-test-v1/load-mysql-by-where.json](implement-modules/playground/v1/actions/mysql-test-v1/load-mysql-by-where.json) —
  Пример действия: параметры для загрузки записи MySQL по условию.
- [actions/mysql-test-v1/delete-mysql-by-id.json](implement-modules/playground/v1/actions/mysql-test-v1/delete-mysql-by-id.json) —
  Пример действия: параметры для удаления записи MySQL по id.
- [actions/session-test-v2/session-set.json](implement-modules/playground/v1/actions/session-test-v2/session-set.json) —
  Пример действия: параметры для установки значения сессии.
- [actions/session-test-v2/session-get.json](implement-modules/playground/v1/actions/session-test-v2/session-get.json) —
  Пример действия: параметры для получения значения сессии.
- [actions/session-test-v2/session-remove.json](implement-modules/playground/v1/actions/session-test-v2/session-remove.json) —
  Пример действия: параметры для удаления значения сессии.
- [_i/meta.json](implement-modules/playground/v1/_i/meta.json) — Пример метаданных: параметры name, description,
  dependencies.
- [_i/files-by-block.json](implement-modules/playground/v1/_i/files-by-block.json) — Пример группировки: структура
  блоков, связи между файлами.
- [_i/links.json](implement-modules/playground/v1/_i/links.json) — Пример ссылок: параметры path, label, page.
- [_i/common.json](implement-modules/playground/v1/_i/common.json) — Пример общих параметров: тестовые данные, код.

---

## implement-modules/landing-main-page/v2

- [docs/MARKETPLACE-LANDING-PAGE.md](implement-modules/landing-main-page/v2/docs/MARKETPLACE-LANDING-PAGE.md) — Пример
  документации: структура лендинга, параметры секций.
- [booking.json](implement-modules/landing-main-page/v2/booking.json) — Пример данных: параметры бронирования, поля
  клиента.
- [shop.json](implement-modules/landing-main-page/v2/shop.json) — Пример данных: параметры магазина, товары.
- [page.json](implement-modules/landing-main-page/v2/page.json) — Пример страницы: компоненты лендинга, параметры
  секций.
- [sections/featured-products-section.json](implement-modules/landing-main-page/v2/sections/featured-products-section.json) —
  Пример секции: компоненты ProductCard, параметры товаров.
- [sections/footer-section.json](implement-modules/landing-main-page/v2/sections/footer-section.json) — Пример секции:
  компоненты Footer, параметры контактов.
- [sections/haircut-discounts-section.json](implement-modules/landing-main-page/v2/sections/haircut-discounts-section.json) —
  Пример секции: параметры скидок на стрижки.
- [sections/highlights-section.json](implement-modules/landing-main-page/v2/sections/highlights-section.json) — Пример
  секции: параметры основных моментов.
- [sections/how-it-works-section.json](implement-modules/landing-main-page/v2/sections/how-it-works-section.json) —
  Пример секции: параметры шагов работы сервиса.
- [sections/map-section.json](implement-modules/landing-main-page/v2/sections/map-section.json) — Пример секции:
  параметры карты, координаты.
- [sections/features-section.json](implement-modules/landing-main-page/v2/sections/features-section.json) — Пример
  секции: параметры особенностей.
- [sections/header-section.json](implement-modules/landing-main-page/v2/sections/header-section.json) — Пример секции:
  компоненты Header, параметры навигации.
- [sections/hero-section.json](implement-modules/landing-main-page/v2/sections/hero-section.json) — Пример секции:
  компоненты Hero, параметры описания.
- [sections/marketplace-hero-section.json](implement-modules/landing-main-page/v2/sections/marketplace-hero-section.json) —
  Пример секции: параметры героя маркетплейса.
- [sections/pricing-section.json](implement-modules/landing-main-page/v2/sections/pricing-section.json) — Пример секции:
  параметры цен.
- [sections/values-section.json](implement-modules/landing-main-page/v2/sections/values-section.json) — Пример секции:
  параметры ценностей.
- [templates/product-card.json](implement-modules/landing-main-page/v2/templates/product-card.json) — Пример карточки
  товара: параметры title, price, image.
- [templates/header/login-signup-button.json](implement-modules/landing-main-page/v2/templates/header/login-signup-button.json) —
  Пример кнопки: параметры action, label.
- [templates/header/navigation-links.json](implement-modules/landing-main-page/v2/templates/header/navigation-links.json) —
  Пример навигации: параметры path, label.
- [templates/header/brand-logo.json](implement-modules/landing-main-page/v2/templates/header/brand-logo.json) — Пример
  логотипа: параметры src, alt.
- [templates/dialogs/info-dialog.json](implement-modules/landing-main-page/v2/templates/dialogs/info-dialog.json) —
  Пример диалога: параметры title, message.
- [templates/dialogs/contact-dialog.json](implement-modules/landing-main-page/v2/templates/dialogs/contact-dialog.json) —
  Пример диалога: параметры контактов.
- [templates/forms/contact.json](implement-modules/landing-main-page/v2/templates/forms/contact.json) — Пример формы:
  параметры email, message, имя.
- [actions/validate-contact-form.json](implement-modules/landing-main-page/v2/actions/validate-contact-form.json) —
  Пример действия: параметры для валидации формы контакта.

---

## implement-modules/primary-form/v2

- [data/dialog-new-window.json](implement-modules/primary-form/v2/data/dialog-new-window.json) — Пример данных:
  параметры для открытия нового окна.
- [data/chat-response-form.json](implement-modules/primary-form/v2/data/chat-response-form.json) — Пример формы:
  параметры для ответа в чате.
- [data/program.json](implement-modules/primary-form/v2/data/program.json) — Пример данных: параметры программы.
- [data/text-storage-section.json](implement-modules/primary-form/v2/data/text-storage-section.json) — Пример секции:
  параметры для хранения текста.
- [data/program-section.json](implement-modules/primary-form/v2/data/program-section.json) — Пример секции: параметры
  программы.
- [data/log.json](implement-modules/primary-form/v2/data/log.json) — Пример лога: параметры событий.
- [data/models/windows.json](implement-modules/primary-form/v2/data/models/windows.json) — Пример модели: параметры
  окон.
- [data/models/programs.json](implement-modules/primary-form/v2/data/models/programs.json) — Пример модели: параметры
  программ.
- [data/blanks/window.json](implement-modules/primary-form/v2/data/blanks/window.json) — Пример заготовки: параметры
  окна.
- [data/blanks/program.json](implement-modules/primary-form/v2/data/blanks/program.json) — Пример заготовки: параметры
  программы.
- [data/blanks/cb.json](implement-modules/primary-form/v2/data/blanks/cb.json) — Пример заготовки: параметры cb.
- [commands/load-forms-and-return.json](implement-modules/primary-form/v2/commands/load-forms-and-return.json) — Пример
  команды: параметры для загрузки форм.
- [commands/windows-select-options.json](implement-modules/primary-form/v2/commands/windows-select-options.json) —
  Пример команды: параметры для выбора окна.
- [commands/reset-step-commands.json](implement-modules/primary-form/v2/commands/reset-step-commands.json) — Пример
  команды: параметры для сброса команд шага.
- [pages/page.json](implement-modules/primary-form/v2/pages/page.json) — Пример страницы: компоненты PrimaryForm,
  параметры формы.
- [code/PrimaryForm.php](implement-modules/primary-form/v2/code/PrimaryForm.php) — Пример PHP-компонента: методы для
  работы с формой, параметры.
- [templates/forms/checkbox-section.json](implement-modules/primary-form/v2/templates/forms/checkbox-section.json) —
  Пример секции: параметры чекбоксов.
- [templates/forms/program-control.json](implement-modules/primary-form/v2/templates/forms/program-control.json) —
  Пример секции: параметры управления программой.
- [templates/forms/result-section.json](implement-modules/primary-form/v2/templates/forms/result-section.json) — Пример
  секции: параметры результата.
- [templates/parts/program/navButtons.json](implement-modules/primary-form/v2/templates/parts/program/navButtons.json) —
  Пример кнопок: параметры навигации.
- [templates/parts/program/requestToChat.json](implement-modules/primary-form/v2/templates/parts/program/requestToChat.json) —
  Пример секции: параметры для запроса в чат.
- [templates/parts/program/windowCreateDialog.json](implement-modules/primary-form/v2/templates/parts/program/windowCreateDialog.json) —
  Пример диалога: параметры создания окна.
- [templates/parts/program/windowRemoveDialog.json](implement-modules/primary-form/v2/templates/parts/program/windowRemoveDialog.json) —
  Пример диалога: параметры удаления окна.
- [validations/window-name.json](implement-modules/primary-form/v2/validations/window-name.json) — Пример валидации:
  параметры имени окна.
- [validations/validate.json](implement-modules/primary-form/v2/validations/validate.json) — Пример валидации: параметры
  формы.
- [validations/chatResponse-ban-list.json](implement-modules/primary-form/v2/validations/chatResponse-ban-list.json) —
  Пример валидации: параметры бан-листа для чата.

--- 
