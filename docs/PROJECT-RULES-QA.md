# Project rules — yes/no Q&A log

Canonical normative text stays in **`AGENTS.md`** and root **`DEV_STATE.md`**. This file only records **interview answers** (yes/no) so we do not duplicate long prose here.

**Policy:** If a logged answer implies **code or config** work, also add a concrete ticket under **`tasks/pending/`** (even when the change is small), not only a row here.

**Policy:** This log has **no date column** and no per-row dates.

**Policy:** When the reply is **not** a plain **yes/no**, put the user’s **verbatim** wording in **Answer** and add a short **English gloss in parentheses** (e.g. `без дат` *(no dates in this log)*). Plain **y** / **n** / **yes** / **no** still map to **Yes** / **No**.

**Policy:** **Question** column: **English only**. **Answer** may use verbatim non-English per above.

**Policy:** **Mandatory links** to this file from **root** `DEV_STATE.md`, **every** `a2a-*/DEV_STATE.md`, and **`AGENTS.md`** Quick Reference — not optional when those files exist.

**Policy:** Introducing a **new** top-level or module **`DEV_STATE.md`** does **not** by itself count as “link added.” The mandatory Q&A pointer is a **separate** explicit step; if not done immediately, add **`tasks/pending/`** (or the same PR must include the pointer).

| # | Question | Answer |
|---|----------|--------|
| 1 | Should the canonical “main rules” for humans and agents stay **AGENTS.md** + root **DEV_STATE.md**, and we only add this **separate Q&A file** for the interview log (no long duplicate prose in both)? | **Yes** |
| 2 | Should every new Q&A row that implies **code or config** change always get a matching file under **`tasks/pending/`** (even if small), instead of only updating this doc? | **Yes** |
| 3 | Should this Q&A table include **dates** (e.g. a Date column or per-row timestamps)? | **без дат** *(no dates in this log)* |
| 4 | Should non–yes/no replies (e.g. Russian) be copied **verbatim** into **Answer**, with an **English gloss in parentheses**, instead of English paraphrase only? | **Yes** |
| 5 | Should the **Question** column stay **English only** (while **Answer** may be verbatim non-English)? | **eng only** *(yes — questions English only)* |
| 6 | Should each **module** `DEV_STATE.md` (`a2a-client`, `a2a-server`, `ai-integration`) include a **one-line pointer** to this Q&A log? | **Yes** |
| 7 | Should **linking** to this Q&A log be **mandatory** on root **`DEV_STATE.md`**, every module **`DEV_STATE.md`**, and **`AGENTS.md`** Quick Reference? | **ликовка везде обязатльая** *(linking everywhere mandatory; intended: линковка … обязательная)* |
| 8 | If a **new** top-level **`DEV_STATE`‑style** file is added later, should adding the **mandatory Q&A link** be treated as part of **“create the file”** (no separate follow-up)? | **No** |
| 9 | Should we enforce recursive-agent safety checks (no loops, no uncontrolled self-modification, no entry-point loss), prefer declarative/config solutions, mark self-management as **EXPERIMENTAL**, and stop-on-risk? | **Yes** |
