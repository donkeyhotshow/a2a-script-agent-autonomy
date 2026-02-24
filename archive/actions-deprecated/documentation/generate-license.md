# generate-license

| Параметр | Значение |
|----------|----------|
| actionId | generate-license |
| categoryId | documentation |
| executorSystemId | script |
| title | Генерация LICENSE |
| canMigrateToScript | ✅ |

## Описание

Автоматическая генерация файла LICENSE на основе выбранной лицензии.

## Популярные лицензии

### Open Source
- MIT License
- Apache License 2.0
- GNU GPLv3
- BSD 3-Clause
- BSD 2-Clause
- ISC License
- The Unlicense

### Creative Commons
- CC0 (Public Domain)
- CC BY 4.0
- CC BY-SA 4.0
- CC BY-NC 4.0

## Инструменты

- choosealicense.com
- SPDX
- fossa
- license-cop
- npx license

## Процесс

1. Выбор лицензии
2. Заполнение данных (годод, автор)
3. Генерация файла
4. Добавление в package.json / composer.json

## Форматы

- Plain text
- SPDX выражение

## Требования

- Указание автора
- Указание года
- Выбор типа лицензии

## Интеграции

- GitHub license chooser
- npm init
- composer init
