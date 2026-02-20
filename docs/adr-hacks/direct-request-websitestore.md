# H2: Direct request — websitestore

**Index:** [README.md](README.md) | **Payloads:** [json-in-cmd.md](../../json-in-cmd.md)

POST `/api/v1/requests` with context and optional codeBlocks using the **dev project** path and realistic tasks. No client UI; curl/PowerShell or script.

---

## Endpoint

- **URL:** `POST /api/v1/requests`
- **Auth:** `Authorization: Bearer a2a_dev_password`
- **Base:** `http://localhost:3000/api/v1` (or 8080 per your run)

---

## Payload (Iter1 — no codeBlocks)

```json
{
  "context": {
    "version": "1.0",
    "project_path": "C:/workspace/domain-platform/websitestore.com.ua",
    "new_task": ["Собери первичный граф и скажи, чего не хватает"],
    "architectural_features": ["Laravel", "FormRequest", "Inertia"]
  }
}
```

**PowerShell:**
```powershell
$body = '{"context":{"version":"1.0","project_path":"C:/workspace/domain-platform/websitestore.com.ua","new_task":["Build primary graph"]}}'
Invoke-WebRequest -Uri "http://localhost:3000/api/v1/requests" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer a2a_dev_password"} -Body $body -UseBasicParsing
```

Expect `201` with `promiseId`. Poll `GET /api/v1/requests/:promiseId/result` until `completed` or `failed`.

---

## Payload (Iter2 — with codeBlocks)

Use real paths from websitestore (e.g. controller + FormRequest). Content can be truncated for brevity; neurons match on keywords (FormRequest, extends Model, etc.).

```json
{
  "context": {
    "version": "1.0",
    "project_path": "C:/workspace/domain-platform/websitestore.com.ua",
    "new_task": ["Добавил контекст: ключевые файлы для графа"]
  },
  "codeBlocks": [
    { "path": "app/Http/Controllers/Auth/RegisterController.php", "content": "<?php\nnamespace App\\Http\\Controllers\\Auth;\nuse App\\Http\\Requests\\RegisterRequest;\nclass RegisterController extends Controller { public function store(RegisterRequest $r) {} }" },
    { "path": "app/Http/Requests/RegisterRequest.php", "content": "<?php\nnamespace App\\Http\\Requests;\nclass RegisterRequest extends FormRequest { public function rules() { return []; } }" }
  ],
  "priority": 2
}
```

Adjust `project_path` to your machine. For codeBlocks from client: use [H1](dev-project-data-sources.md) file endpoint to fetch content.

---

## Assertions

- Response has `context.request_files` and `context.activated_neurons` / `activated_neuron_ids` when neurons fire.
- Iter1 with arch: validation neuron can fire → `request_files` include Requests.
- Iter2 with FormRequest + Model in codeBlocks: validation and/or eloquent neurons fire.
