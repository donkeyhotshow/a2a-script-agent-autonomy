```bash
cd C:\workspace\org-carrier\a2a-script-agent && npm run lint

/usr/bin/bash: line 1: cd: C:workspaceorg-carriera2a-script-agent: No such file or directory

```

That happens because **`npm run lint` is being executed by `/usr/bin/bash`**, not by Windows PowerShell.

In **bash**, `\` is an **escape character**, not a path separator. So a string like:

`C:\workspace\org-carrier\a2a-script-agent`

gets parsed so that each `\` pairs with the next character (e.g. `\w` → `w`, `\o` → `o`, …). The path collapses into something like:

`C:workspaceorg-carriera2a-script-agent`

which is not a real directory, hence **“No such file or directory”**.

**What to do:**

1. **Use forward slashes** in bash (Git Bash / MSYS):

   ```bash
   cd /c/workspace/org-carrier/a2a-script-agent && npm run lint
   ```

2. Or **stay in PowerShell** and run the same `cd` + `npm` there (backslashes are fine).

3. Or **quote** and avoid bash mangling the string (less ideal than `/c/...` in Git Bash).

So: **not a repo bug** — it’s **bash interpreting Windows-style backslashes**.