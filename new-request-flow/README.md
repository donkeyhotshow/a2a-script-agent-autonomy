# полный протокол взаимодействия систем.

цель - стандартизировать ответы сервера и стандартизировать то как клиент обрабатывает ответы . в конце надо будет написать единую схему .
далее , web - веб интерфейс клиента . клиент - a2a-client . сервер - a2a-server .

## до запросов на сервер

web должен иметь страничку конфигурации клиента , для указания provider , который будет отвечать на запросы , а также нужно иметь редактор списка проектов , для которых сервер будет выполнять работу .

## рассматриваем протокол на примере fix-vue-imports

у клиента есть web интерфейс . сейчас, веб интерфейс , напрямую отправляет запросы на сервер , минуя апи клиента . ето неправильный подход . в етом документе должен быть описан полный флоу всех систем . 
главное в новом протоколе , ето что web не знает адрес сервера , а только клиент . 

### инициализация 
на web , должно быть поле для ввода новой задачи  , для новой сессии . 
значит запрос должен быть направлен на апи клиента . клиент , в папке проекта , для которого создается сессия , добавляет новую сессию . 
мне требуется , чтоб при сохранении данных сессий , на web появлялось окно сессии . пока сессия еще не активирована .
тоесть , все данные хранятся на клиенте . запрос и state окошка на вебе .
окошко можно перемещать или переносить или менять состояние , сворачивать , разворачивать ,  дроп-зона .
здесь мы уже должны иметь контроль надо окном . очень важно , что каждая сессия в отдельной панели , а панели могут быть в какомто состоянии отображения . 
в етом состоянии , панель нельзя закрыть , пока задача не будет отменена . в етом состоянии можно свернуть в дропзону , а крестик превращает панель в квадрат . 
значит нам нужно кнопки отменить и применить .
на применить ,  мы должны отправить запрос на апи клиента , там что надо сохранить и отправить запрос , на который сервер ответит либо обычным ответом либо с promiseId  и ето надо добавить в данные сессии . сейчас ето сделано на web , но по новым правилам , веб не делает запросы на сервер.

## первый запрос 
по сути , мы делаем поисковый запрос сервисов сервера . 
в C:\workspace\org-carrier\a2a-script-agent\simulations\fix-vue-imports\1\request.json отображено запрос , там точно чегото нехватает . поля номерок сессии и номерок проекта. 

## первый ответ
в C:\workspace\org-carrier\a2a-script-agent\simulations\fix-vue-imports\1\response.json 
отображено ответ . данные должны сохранится в сессии и потом прийти на web и отобразить список .
здесь мы выбираем , из предложенного сервером , варианты алгоритмов , которые может выполнить сервер на кодовой базе . и есть еще резервные варианты , с участием запросов в LLM . 

## выбрали fix-vue-imports .
сохранить выбор . 
убрали список .


нужны кнопочки далее (пропадает при авто) и авто (меняется на стоп) . тут все понятно .


## нажали далее 

C:\workspace\org-carrier\a2a-script-agent\simulations\fix-vue-imports\2\request.json

C:\workspace\org-carrier\a2a-script-agent\simulations\fix-vue-imports\2\response.json

## нажали далее 
C:\workspace\org-carrier\a2a-script-agent\simulations\fix-vue-imports\3\request.json
C:\workspace\org-carrier\a2a-script-agent\simulations\fix-vue-imports\3\response.json

## нажали далее 
C:\workspace\org-carrier\a2a-script-agent\simulations\fix-vue-imports\4\request.json
C:\workspace\org-carrier\a2a-script-agent\simulations\fix-vue-imports\4\response.json

## нажали далее 
C:\workspace\org-carrier\a2a-script-agent\simulations\fix-vue-imports\5\request.json
C:\workspace\org-carrier\a2a-script-agent\simulations\fix-vue-imports\5\response.json


# что я понял .

web должен командывать клиентом , через апи клиента . веб приложение само ничего не запускает , а только вносит данные и командует клиентом . у клиента свои обязаности . поетому надо отвязать web от сервера , потому что web не сможет обрабатывать ответы сервера напрямую .

## coder-complex - складний workflow з чеклістом

Це симуляція для складних завдань , де LLM робить:
1. Перший reasoning - аналізує задачу
2. Context gathering - RAG пошук файлів
3. Другий reasoning - створює чекліст задач
4. Виконання задач по черзі - кожна задача виконується окремо

### workflow:
- Step 1: Користувач відправляє задачу
- Step 2: Сервер повертає доступні дії
- Step 3: LLM робить reasoning → викликає rag-search
- Step 4: Повертаються результати RAG пошуку
- Step 5: LLM створює чекліст і виконує першу задачу
- Step 6: Клієнт виконує задачу → повертає результат
- Step 7: Сервер оновлює чекліст → наступна задача або завершення

---

---

## coder-dialog-smart - діалог + контекст

Діалогова симуляція для створення MD документу контексту. Поєднує:
- Формат діалогу з coder-dialog
- Логіку ai-session-context.md

### workflow:
- Step 1: User задає задачу
- Step 2: Обирає coder-dialog-smart
- Step 3: capture-task → captured_task
- Step 4: analyze-intent → intent_analysis
- Step 5: llm-first-iteration → study_plan
- Step 6: create-context-document → MD документ

---

## coder-dialog-complex - діалог з читанням файлів

### workflow:
- Step 1: Користувач відправляє задачу
- Step 2: Сервер повертає доступні дії
- Step 3: Користувач обирає coder-dialog
- Step 4: LLM робить RAG пошук
- Step 5: LLM читає знайдені файли (read-file)
- Step 6: LLM відповідає
- Step 7: Користувач просить записати звіт
- Step 8: LLM записує файл (write-file)

### файли симуляції:
- C:\\workspace\\org-carrier\\a2a-script-agent\\simulations\\coder-dialog-complex\\1\\request.json
- C:\\workspace\\org-carrier\\a2a-script-agent\\simulations\\coder-dialog-complex\\1\\response.json
- C:\\workspace\\org-carrier\\a2a-script-agent\\simulations\\coder-dialog-complex\\2\\request.json
- C:\\workspace\\org-carrier\\a2a-script-agent\\simulations\\coder-dialog-complex\\2\\response.json
- C:\\workspace\\org-carrier\\a2a-script-agent\\simulations\\coder-dialog-complex\\3\\request.json
- C:\\workspace\\org-carrier\\a2a-script-agent\\simulations\\coder-dialog-complex\\3\\response.json
- C:\\workspace\\org-carrier\\a2a-script-agent\\simulations\\coder-dialog-complex\\4\\request.json
- C:\\workspace\\org-carrier\\a2a-script-agent\\simulations\\coder-dialog-complex\\4\\response.json
- C:\\workspace\\org-carrier\\a2a-script-agent\\simulations\\coder-dialog-complex\\5\\request.json
- C:\\workspace\\org-carrier\\a2a-script-agent\\simulations\\coder-dialog-complex\\5\\response.json
- C:\\workspace\\org-carrier\\a2a-script-agent\\simulations\\coder-dialog-complex\\6\\request.json
- C:\\workspace\\org-carrier\\a2a-script-agent\\simulations\\coder-dialog-complex\\6\\response.json
- C:\\workspace\\org-carrier\\a2a-script-agent\\simulations\\coder-dialog-complex\\7\\request.json
- C:\\workspace\\org-carrier\\a2a-script-agent\\simulations\\coder-dialog-complex\\7\\response.json

Це симуляція для створення MD документу контексту задачі на основі легасі документа ai-session-context.md.

### workflow:
- Step 1: Користувач відправляє задачу
- Step 2: Сервер виконує capture-task → повертає captured_task
- Step 3: Сервер виконує analyze-intent → повертає intent_analysis
- Step 4: LLM створює план вивчення (llm-first-iteration) → study_plan
- Step 5: Сервер генерує MD документ контексту (create-context-document)

### файли симуляції:
- C:\\workspace\\org-carrier\\a2a-script-agent\\simulations\\coder-smart\\1\\request.json
- C:\\workspace\\org-carrier\\a2a-script-agent\\simulations\\coder-smart\\1\\response.json
- C:\\workspace\\org-carrier\\a2a-script-agent\\simulations\\coder-smart\\2\\request.json
- C:\\workspace\\org-carrier\\a2a-script-agent\\simulations\\coder-smart\\2\\response.json
- C:\\workspace\\org-carrier\\a2a-script-agent\\simulations\\coder-smart\\3\\request.json
- C:\\workspace\\org-carrier\\a2a-script-agent\\simulations\\coder-smart\\3\\response.json
- C:\\workspace\\org-carrier\\a2a-script-agent\\simulations\\coder-smart\\4\\request.json
- C:\\workspace\\org-carrier\\a2a-script-agent\\simulations\\coder-smart\\4\\response.json
- C:\\workspace\\org-carrier\\a2a-script-agent\\simulations\\coder-smart\\5\\request.json
- C:\\workspace\\org-carrier\\a2a-script-agent\\simulations\\coder-smart\\5\\response.json