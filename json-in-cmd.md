# JSON payloads для Requests API

**Индекс:** [docs/README.md](docs/README.md) | **Протокол:** [a2a-client/docs/requirements.md](a2a-client/docs/requirements.md)

**Base:** `http://localhost:8080/api/v1` | **Auth:** `Bearer a2a_dev_password`

`project_path` — путь к проекту на клиенте. `new_task` — массив [текст задачи, подсказки, architectural_features].

---

## Iter1 (без codeBlocks)

```json
{
  "context": {
    "version": "1.0",
    "project_path": "C:/workspace/domain-platform/websitestore.com.ua",
    "new_task": ["Собери первичный граф и скажи, чего не хватает"]
  }
}
```

**PowerShell:**
```powershell
$body = '{"context":{"version":"1.0","project_path":"C:/workspace/domain-platform/websitestore.com.ua","new_task":["Build primary graph"]}}'
Invoke-WebRequest -Uri "http://localhost:8080/api/v1/requests" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer a2a_dev_password"} -Body $body -UseBasicParsing
```

---

## Iter2 (с codeBlocks)

```json
{
  "context": {
    "version": "1.0",
    "project_path": "C:/workspace/domain-platform/websitestore.com.ua",
    "new_task": ["Добавил контекст: вот ключевые файлы для графа"]
  },
  "codeBlocks": [
    {
      "path": "app/Http/Controllers/Auth/RegisterController.php",
      "content": "<?php\nnamespace App\\Http\\Controllers\\Auth;\nuse App\\Http\\Requests\\RegisterRequest;\nclass RegisterController extends Controller { public function store(RegisterRequest $r) {} }"
    },
    {
      "path": "app/Http/Requests/RegisterRequest.php",
      "content": "<?php\nnamespace App\\Http\\Requests;\nclass RegisterRequest extends FormRequest { public function rules() { return []; } }"
    }
  ],
  "priority": 2
}
```

**PowerShell:**
```powershell
$body = @'
{"context":{"version":"1.0","project_path":"C:/workspace/domain-platform/websitestore.com.ua","new_task":["Key files for graph"]},"codeBlocks":[{"path":"app/Http/Controllers/Auth/RegisterController.php","content":"<?php\nclass RegisterController extends Controller {}"},{"path":"app/Http/Requests/RegisterRequest.php","content":"<?php\nclass RegisterRequest extends FormRequest {}"}],"priority":2}
'@
Invoke-WebRequest -Uri "http://localhost:8080/api/v1/requests" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer a2a_dev_password"} -Body $body -UseBasicParsing
```

---

## Poll result

```powershell
$promiseId = "PRM_ID_FROM_201_RESPONSE"
Invoke-WebRequest -Uri "http://localhost:8080/api/v1/requests/$promiseId/result" -Headers @{Authorization="Bearer a2a_dev_password"} -UseBasicParsing
```