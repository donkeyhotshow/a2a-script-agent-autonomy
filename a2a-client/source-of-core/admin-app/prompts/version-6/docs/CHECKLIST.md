# Чеклист покрываемых паттернов для prompts-v4

## 1. Типы корневых объектов
- [x] type: "Instructions" (workflow)
- [ ] type: "Page" (UI-страница)
- [ ] type: "Card", "Form", "InputText", "Password", "Button" (UI-компоненты)

## 2. Workflow-инструкции
- [ ] action: update, call, save, print_r, add
- [x] from, to, value, batch, condition, address, with
- [x] batch: вложенные массивы инструкций
- [x] condition: строка, массив, and, or, not, equals, isEmpty, notEmpty
- [x] session:user, session!user, session:user.id
- [x] buffer:*, buffer:field, buffer:object.field
- [x] mysql!users/where/login/{buffer:credentials.login}
- [ ] with
- [x] массивы, вложенные объекты, вложенные batch
- [x] типы значений: строка, число, булево, null, объект, массив

## 3. UI/Page/Template
- [ ] type: Page, Card, Form, InputText, Password, Button, Section
- [ ] title, name, props, class, label, icon, placeholder, children, model, customHooks
- [ ] model: {form, field}
- [ ] customHooks: click, sendData, data
- [ ] content: вложенные компоненты
- [ ] children: массив вложенных компонентов
- [ ] props: объект с параметрами для UI
- [ ] data: объект с параметрами для действий (sendTo, form)
- [ ] вложенные структуры (Form внутри Card, InputText внутри Form и т.д.)

## 4. Особые паттерны и edge-cases
- [x] вложенные batch с условиями
- [x] разные пространства имён (buffer, session, state, mysql, input, output)
- [x] динамические адреса (buffer:userRecordLogin.0)
- [x] массивы объектов (instructions, children)
- [x] пустые объекты, пустые массивы
- [x] комбинированные действия (update + call, update + save)
- [x] with (функция/обработчик)
- [ ] props для UI
- [ ] model для формы
- [ ] customHooks для событий
- [ ] шаблоны (templates/parts, templates/forms)

## 5. Типы значений
- [x] строка
- [x] число
- [x] булево
- [x] null
- [x] объект
- [x] массив

## 6. Вложенность и композиция
- [x] вложенные объекты (props, model, data)
- [x] вложенные массивы (children, instructions, batch)
- [x] вложенные условия и batch
- [x] вложенные UI-компоненты

## 7. Динамические и вычисляемые поля
- [x] шаблоны в строках ({buffer:credentials.login})
- [x] with (функция для вычисления)

## 8. Работа с состоянием
- [x] save, from, to
- [x] передача данных между буферами, сессией, state, input, output

## 9. Ошибки и валидация
- [x] error, validationFailed
- [x] errorMessage, validationErrors
- [x] валидация обязательных полей

## 10. UI-специфические паттерны
- [ ] props для стилизации
- [ ] customHooks для событий
- [ ] model для формы

## 11. Шаблоны и секции
- [ ] templates/parts, templates/forms, templates/sections
- [ ] вложенные шаблоны и секции

## 12. Прочее
- [x] разные типы действий (print_r, call, update, save)
- [x] разные пространства (input, buffer, session, state, mysql, output)
- [x] вложенные структуры и массивы 