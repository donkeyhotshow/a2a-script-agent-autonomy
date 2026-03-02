# Coder Smart — workflow

## Steps (послідовний аналіз)

| Step              | Дія                                               | Вхід        | Вихід                     |
|-------------------|---------------------------------------------------|-------------|---------------------------|
| user-request      | Захоплення запиту                                 | —           | Віртуальний док: секція 1 |
| rag-clarify       | RAG для уточнення → LLM уточнена формулювання     | doc 1       | doc 1+2                   |
| rag-research-plan | RAG для плану → LLM план дослідження              | doc 1+2     | doc 1+2+3                 |
| checklist         | LLM чеклист                                       | doc 1+2+3   | doc 1+2+3(done)+4         |
| write-doc         | Запис у .carrier/tasks/                           | doc full    | path                      |
| execute-item      | History = [doc], LLM виконує пункт, оновлення док | doc content | updated doc, повтор       |

## Фази

1. **Діалог + RAG (3–6):** форма (запит) → RAG clarify → LLM clarify → RAG plan → LLM plan → LLM checklist → write-file
   .carrier/tasks/.
2. **Цикл (7–9+):** form (контент док) → LLM execute item → write-file оновленого док → history обнуляється → form
   знову → наступний пункт.

## Шлях файлу

Документ задачі зберігається в **`.carrier/tasks/`** (наприклад `.carrier/tasks/task-1.md`).
