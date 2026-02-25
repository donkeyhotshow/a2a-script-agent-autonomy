# Prompts for Structured Data Handling

This document contains prompts designed to test how models handle structured data formats like JSON, YAML, and XML, focusing on various neural phenomena.

## Testing Structural Sensitivity (Phenomenon 6)

**Goal:** Assess model's ability to detect structural errors in JSON, YAML, or XML.

**Prompt:**
```
Analyze the following JSON data for structural correctness. Identify any syntax errors, incorrect indentation, or structural inconsistencies. If errors are found, point them out precisely (line number if possible) and explain why they are incorrect.

```json
[
    {
        "id": 1,
        "name": "Item A",
        "category": "premium",
        "price": 15.50
    },
    {
        "id": 2,
        "name": "Item B",
        "category": "standard",
        "price": 10.00
    },
    {
        "id": 3,
        "name": "Item C",
        "category": "premium",
        "price": 20.00
    ,
    {
        "id": 4,
        "name": "Item D",
        "category": "standard"
        "price": 12.00
    }
]
```

## Testing Format Adaptation / Transformation (Phenomenon 15)

**Goal:** Evaluate model's ability to convert data between structured formats while preserving content and structure.

**Prompt:**
```
Convert the following JSON data into YAML format. Ensure that all data, structure, and data types are accurately translated.

```json
{
    "person": {
        "name": "Alice",
        "age": 30,
        "isStudent": false,
        "courses": [
            {"title": "Math", "credits": 3},
            {"title": "Physics", "credits": 4}
        ],
        "address": null
    }
}
```

## Testing Summarization of Structured Data (Phenomenon 90)

**Goal:** Measure model's effectiveness in summarizing key information from complex structured data.

**Prompt:**
```
Provide a concise summary of the key information and overall structure of the following JSON data. Focus on the main entities, their relationships, and any significant values.

```json
{
    "company": {
        "name": "Tech Solutions Inc.",
        "location": "Silicon Valley",
        "departments": [
            {
                "name": "Engineering",
                "head": "Dr. Anya Sharma",
                "teams": [
                    {"name": "Backend", "size": 15, "language": "Python"},
                    {"name": "Frontend", "size": 12, "language": "JavaScript"},
                    {"name": "Mobile", "size": 10, "language": "Kotlin"}
                ],
                "projects": [
                    {"name": "Project Alpha", "status": "In Progress", "deadline": "2024-12-31"},
                    {"name": "Project Beta", "status": "Completed", "completion_date": "2023-11-15"}
                ]
            },
            {
                "name": "Marketing",
                "head": "Mr. Ben Carter",
                "staff_size": 25,
                "campaigns": [
                    {"name": "Spring Promo", "status": "Active", "budget": 50000},
                    {"name": "Fall Launch", "status": "Planning", "budget": 75000}
                ]
            }
        ]
    },
    "employees_count": 150,
    "founded_year": 2010,
    "products": [
        {"id": "p1", "name": "Product X", "version": "1.0"},
        {"id": "p2", "name": "Product Y", "version": "2.1"}
    ]
}
```

## Testing Schema Adherence (Phenomenon 59)

**Goal:** Check if model can validate data against a schema or generate data conforming to one.

**Prompt (Validation):**
```
Validate the following JSON data against the provided JSON schema. Report any deviations from the schema, specifying the rule violated and the location in the data.

Schema:
```json
{
  "type": "object",
  "properties": {
    "id": { "type": "integer" },
    "name": { "type": "string" },
    "isActive": { "type": "boolean" },
    "tags": { "type": "array", "items": { "type": "string" } }
  },
  "required": ["id", "name"]
}
```

Data:
```json
{
  "id": 123,
  "name": "Sample Item",
  "isActive": "true",
  "tags": ["test", 123]
}
```
```

**Prompt (Generation):**
```
Generate a JSON data instance that strictly conforms to the following schema. Populate it with plausible placeholder values.

Schema:
```json
{
  "type": "object",
  "properties": {
    "productId": { "type": "string", "pattern": "^[A-Z]{3}-\\d{4}$" },
    "price": { "type": "number", "minimum": 0 },
    "availability": { "type": "string", "enum": ["in_stock", "out_of_stock", "limited"] }
  },
  "required": ["productId", "price", "availability"]
}
```
``` 