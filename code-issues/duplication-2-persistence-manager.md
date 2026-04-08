# Code Duplication Issue 2

**File:** a2a-client/packages/vite-plugin/routes/persistence-manager.js

**Lines:** 55-62 and 86-92

**Description:** Identical code blocks for appending user messages to session.messages. Each block checks for submitResult?.message, initializes the messages array if needed, and pushes an object with role: 'user', content, and step: nextStepNum.

**Action Required:** Extract the message appending logic into a reusable function.