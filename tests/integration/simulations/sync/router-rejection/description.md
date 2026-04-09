# Router rejection / invalid choice

## Purpose

Exercises **router-stage** handling when the client sends a **`result.choice`** that is **not** accepted (unknown id, disabled option, or contract error). Uses a small synthetic **`form.choices`** set (`valid-choice` / `invalid-choice`) rather than the full static router list.

## Note on canonical routers

Production router choices are driven by the server/registry and **`shared/router-static-choices.json`** (`staticTailChoices`). This simulation is **narrow**: invalid-choice handling only. Do not assume its choice ids match every other sim’s router step.

## Web DTO

Includes **`client.json`** / **`received.json`** per step for projection checks.
