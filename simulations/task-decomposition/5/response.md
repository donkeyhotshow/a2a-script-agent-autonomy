## Subtask 1
- Create JWT sign/verify helpers
- Add POST /login route and handler
- Wire auth middleware into app
## Subtask 2
- Apply auth middleware to protected routes
- Return 401 when token missing or invalid
## Subtask 3
- Split API into modules (auth, users, core)
- Add centralized error handler and status codes
## Subtask 4
- Add tests for POST /login and token flow
- Add tests for protected routes (401/200)
