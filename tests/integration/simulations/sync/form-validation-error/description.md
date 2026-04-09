# Form validation error (dialog)

## Purpose

Covers **invalid user input** on a **dialog** form (`execution.action: "dialog"`, `step: "request"`): server re-prompts with the same or updated form and an error message after a bad submit.

## Flow

| Step | Idea |
|------|------|
| 1 | Initial numeric form (e.g. age field with constraints). |
| 2 | User submits invalid value → validation error on `execute.form`. |
| 3 | User submits valid value → progression / completion per fixture. |

## Web DTO

Steps include **`client.json`** / **`received.json`** where the sanitized projection matters; align with `simulations/SCHEMA.md` and the repo Web DTO rules (single action key, no raw tool keys in `received.json`).
